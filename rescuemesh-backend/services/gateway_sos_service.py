"""
ESP32 gateway REST ingest:
  T-Beam --LoRa 433 MHz--> ESP32 Gateway --HTTPS--> POST /api/v1/sos --> Database
"""

from __future__ import annotations

import logging
import math
import re
import threading
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple

from flask import current_app
from sqlalchemy.exc import SQLAlchemyError

from extensions import db
from models.gateway_sos import GatewaySosMessage
from services.incident_ingest import create_incident_from_sos

logger = logging.getLogger("rescuemesh.gateway")

GATEWAY_SOURCE_LABEL = "System (LoRa Gateway REST Ingest)"
DEFAULT_GATEWAY_ID = "GATEWAY_001"
MAX_SEQUENCE = 2_147_483_647

_ID_PATTERN = re.compile(r"^[A-Za-z0-9_.:\-]{1,64}$")

# Keys are lowercased with non-letters collapsed to "_", so "MEDICAL", "Medical",
# "Food & Water", "FOOD_WATER" and "food-and-water" all resolve.
_CATEGORY_ALIASES = {
    "medical": "Medical",
    "rescue": "Rescue",
    "food_water": "Food & Water",
    "food_and_water": "Food & Water",
    "food": "Food & Water",
    "water": "Food & Water",
    "shelter": "Shelter",
}

# Serialises dedupe check + incident numbering (Incident IDs are max+1) within a worker.
_ingest_lock = threading.Lock()


class SosValidationError(ValueError):
    def __init__(self, errors: Dict[str, str]):
        super().__init__("Invalid SOS payload")
        self.errors = errors


@dataclass
class GatewaySos:
    device_id: str
    gateway_id: str
    category: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    sequence: Optional[int] = None
    battery: Optional[float] = None
    gps_status: Optional[bool] = None
    rssi_dbm: Optional[int] = None
    snr_db: Optional[float] = None
    device_timestamp: Optional[str] = None


def _is_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def _normalize_category(value: Any) -> Optional[str]:
    if not isinstance(value, str):
        return None
    key = re.sub(r"[^a-z]+", "_", value.strip().lower()).strip("_")
    return _CATEGORY_ALIASES.get(key)


def _validate_id(field: str, value: Any, errors: Dict[str, str], required: bool) -> Optional[str]:
    if value is None or (isinstance(value, str) and not value.strip()):
        if required:
            errors[field] = "is required"
        return None
    if not isinstance(value, str) or not _ID_PATTERN.match(value.strip()):
        errors[field] = "must be 1-64 characters: letters, digits, _ - . :"
        return None
    return value.strip()


def _validate_coordinate(
    field: str, value: Any, limit: float, errors: Dict[str, str]
) -> Optional[float]:
    if value is None:
        errors[field] = "is required"
        return None
    if not _is_number(value) or not -limit <= value <= limit:
        errors[field] = f"must be a number between -{limit:g} and {limit:g}"
        return None
    return float(value)


def validate_gateway_payload(payload: Any) -> GatewaySos:
    """Strictly validate an ESP32 gateway SOS body. Raises SosValidationError."""
    if not isinstance(payload, dict):
        raise SosValidationError({"body": "must be a JSON object"})

    errors: Dict[str, str] = {}

    device_id = _validate_id("device_id", payload.get("device_id"), errors, required=True)
    gateway_id = _validate_id("gateway_id", payload.get("gateway_id"), errors, required=False)

    raw_category = payload.get("category")
    category = _normalize_category(raw_category)
    if raw_category is None or (isinstance(raw_category, str) and not raw_category.strip()):
        errors["category"] = "is required"
    elif category is None:
        errors["category"] = "must be one of MEDICAL, RESCUE, FOOD_WATER, SHELTER"

    # Current T-Beam firmware sends "gps_fix"; "gps_status" is the gateway REST name.
    gps_status = payload.get("gps_status", payload.get("gps_fix"))
    if gps_status is not None and not isinstance(gps_status, bool):
        errors["gps_status"] = "must be true or false"

    raw_lat = payload.get("latitude")
    raw_lon = payload.get("longitude")

    if gps_status is False or (raw_lat is None and raw_lon is None):
        latitude = None
        longitude = None
        gps_status = False
    else:
        latitude = _validate_coordinate("latitude", raw_lat, 90, errors)
        longitude = _validate_coordinate("longitude", raw_lon, 180, errors)
        # If coordinates are 0,0, treat as NO_FIX rather than Null Island
        if latitude == 0.0 and longitude == 0.0:
            latitude = None
            longitude = None
            gps_status = False
        elif gps_status is None and latitude is not None and longitude is not None:
            gps_status = True

    sequence = payload.get("sequence")
    if sequence is not None and (
        not isinstance(sequence, int)
        or isinstance(sequence, bool)
        or not 0 <= sequence <= MAX_SEQUENCE
    ):
        errors["sequence"] = f"must be an integer between 0 and {MAX_SEQUENCE}"

    battery = payload.get("battery")
    if battery is not None and (not _is_number(battery) or not 0 <= battery <= 100):
        errors["battery"] = "must be a number between 0 and 100"

    rssi_dbm = payload.get("rssi_dbm")
    if rssi_dbm is not None and (not _is_number(rssi_dbm) or not -200 <= rssi_dbm <= 50):
        errors["rssi_dbm"] = "must be a number between -200 and 50"

    snr_db = payload.get("snr_db")
    if snr_db is not None and (not _is_number(snr_db) or not -50 <= snr_db <= 50):
        errors["snr_db"] = "must be a number between -50 and 50"

    device_timestamp = payload.get("timestamp")
    if device_timestamp is not None and (
        not isinstance(device_timestamp, str) or len(device_timestamp) > 64
    ):
        errors["timestamp"] = "must be a string of at most 64 characters"

    if errors:
        raise SosValidationError(errors)

    return GatewaySos(
        device_id=device_id,
        gateway_id=gateway_id or DEFAULT_GATEWAY_ID,
        category=category,
        latitude=latitude,
        longitude=longitude,
        sequence=sequence,
        battery=float(battery) if battery is not None else None,
        gps_status=gps_status,
        rssi_dbm=int(round(rssi_dbm)) if rssi_dbm is not None else None,
        snr_db=float(snr_db) if snr_db is not None else None,
        device_timestamp=device_timestamp,
    )


def _find_replay(sos: GatewaySos) -> Optional[GatewaySosMessage]:
    """
    A replay is the same device + sequence + category inside the dedupe window.
    The window is bounded so a node that reboots and restarts its counter is
    not silently ignored forever.
    """
    if sos.sequence is None:
        return None
    window = int(current_app.config.get("SOS_DEDUP_WINDOW_SECONDS", 300))
    if window <= 0:
        return None
    cutoff = datetime.utcnow() - timedelta(seconds=window)
    return (
        GatewaySosMessage.query.filter(
            GatewaySosMessage.device_id == sos.device_id,
            GatewaySosMessage.sequence == sos.sequence,
            GatewaySosMessage.category == sos.category,
            GatewaySosMessage.received_at >= cutoff,
        )
        .order_by(GatewaySosMessage.received_at.desc())
        .first()
    )


def _timeline_note(sos: GatewaySos) -> str:
    parts = []
    if sos.sequence is not None:
        parts.append(f"seq={sos.sequence}")
    if sos.battery is not None:
        parts.append(f"battery={sos.battery:g}%")
    if sos.gps_status is not None:
        parts.append("GPS fix" if sos.gps_status else "no GPS fix (waiting for location)")
    return f"Gateway REST uplink: {', '.join(parts)}." if parts else "Gateway REST uplink."


def ingest_gateway_sos(
    sos: GatewaySos,
    ingestion_source: str = "HARDWARE",
) -> Tuple[GatewaySosMessage, bool]:
    """
    Persist a validated gateway SOS as an Incident (with AI priority) plus its
    raw GatewaySosMessage, atomically. Returns (message, created); created is
    False for a replayed sequence. Raises SQLAlchemyError on database failure.
    """
    with _ingest_lock:
        try:
            replay = _find_replay(sos)
            if replay is not None:
                return replay, False

            # If device provided a genuine timestamp (not empty and not the lab placeholder)
            device_ts = sos.device_timestamp
            if device_ts and "2026-09-30T23:30:00" in device_ts:
                device_ts = None

            incident_payload: Dict[str, Any] = {
                "device_id": sos.device_id,
                "gateway_id": sos.gateway_id,
                "category": sos.category,
                "latitude": sos.latitude,
                "longitude": sos.longitude,
                "battery": sos.battery,
                "gps_status": sos.gps_status,
                "source": "gateway",
                "ingestion_source": ingestion_source,
                "timestamp": device_ts,
            }
            if sos.rssi_dbm is not None:
                incident_payload["rssi_dbm"] = sos.rssi_dbm
            if sos.snr_db is not None:
                incident_payload["snr_db"] = sos.snr_db

            incident, _ = create_incident_from_sos(
                incident_payload,
                source_label=GATEWAY_SOURCE_LABEL if ingestion_source == "HARDWARE" else f"Emergency System ({ingestion_source})",
                extra_note=_timeline_note(sos),
                commit=False,
            )
            message = GatewaySosMessage(
                incident_id=incident.id,
                device_id=sos.device_id,
                gateway_id=sos.gateway_id,
                category=sos.category,
                sequence=sos.sequence,
                latitude=sos.latitude,
                longitude=sos.longitude,
                display_latitude=incident.display_latitude,
                display_longitude=incident.display_longitude,
                location_source=incident.location_source,
                battery=sos.battery,
                gps_status=sos.gps_status,
                rssi_dbm=sos.rssi_dbm,
                snr_db=sos.snr_db,
                device_timestamp=sos.device_timestamp,
                ingestion_source=ingestion_source,
                received_at=datetime.utcnow(),
            )
            db.session.add(message)
            db.session.commit()
            return message, True
        except SQLAlchemyError:
            db.session.rollback()
            raise


def last_gateway_message() -> Optional[GatewaySosMessage]:
    return GatewaySosMessage.query.order_by(GatewaySosMessage.received_at.desc()).first()
