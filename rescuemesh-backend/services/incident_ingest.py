"""Shared SOS ingest used by POST /sos (ESP32 gateway REST) and POST /testing/sos."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from extensions import db
from models.device import Device
from models.incident import Incident
from models.timeline import TimelineEntry
from ai.feature_builder import (
    calculate_nearby_sos_count,
    normalize_category,
    normalize_priority,
)
from ai.flood_risk import lookup_flood_risk
from services.geocoding_service import reverse_geocode
from services.priority_service import calculate_ai_priority

VALID_CATEGORIES = {"Medical", "Rescue", "Food & Water", "Shelter"}
VALID_RISK_ZONES = {"High", "Medium", "Low"}


def _parse_timestamp(raw: Any) -> datetime:
    if not raw:
        return datetime.utcnow()
    if isinstance(raw, datetime):
        if raw.tzinfo is not None:
            return raw.astimezone(timezone.utc).replace(tzinfo=None)
        return raw
    text = str(raw).strip()
    try:
        # Accept ISO-8601 with or without timezone / Z
        normalized = text.replace("Z", "+00:00")
        dt = datetime.fromisoformat(normalized)
        if dt.tzinfo is not None:
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        return dt
    except ValueError:
        return datetime.utcnow()


def normalize_sos_payload(payload: Dict[str, Any]) -> Dict[str, Any]:
    device_id = (
        payload.get("device_id")
        or payload.get("deviceId")
        or payload.get("node_id")
        or "NODE_001"
    )

    _, category_display = normalize_category(payload.get("category"))

    # Ingestion source classification
    ingestion_source = payload.get("ingestion_source") or "HARDWARE"
    if ingestion_source not in ("HARDWARE", "API_TEST", "SIMULATION"):
        ingestion_source = "HARDWARE"

    raw_risk = payload.get("risk_zone") or payload.get("riskZone")
    risk_zone_override = str(raw_risk).strip().capitalize() if raw_risk and str(raw_risk).strip().capitalize() in VALID_RISK_ZONES else None

    # Exhibition fallback configuration
    from flask import current_app
    exhibition_mode = False
    venue_display_name = "SLIIT Malabe Campus"
    venue_lat = 6.914678
    venue_lon = 79.972946
    venue_locality = "Malabe"
    venue_district = "Colombo District"
    if current_app:
        exhibition_mode = bool(current_app.config.get("EXHIBITION_MODE", False))
        venue_display_name = current_app.config.get("EXHIBITION_VENUE_DISPLAY_NAME", venue_display_name)
        venue_lat = float(current_app.config.get("EXHIBITION_VENUE_LATITUDE", venue_lat))
        venue_lon = float(current_app.config.get("EXHIBITION_VENUE_LONGITUDE", venue_lon))
        venue_locality = current_app.config.get("EXHIBITION_VENUE_LOCALITY", venue_locality)
        venue_district = current_app.config.get("EXHIBITION_VENUE_DISTRICT", venue_district)

    # GPS coordinates: strictly None if unavailable, NO fake fallback coordinates!
    lat_val = payload.get("latitude")
    lon_val = payload.get("longitude")
    gps_fix_flag = payload.get("gps_status", payload.get("gps_fix"))

    has_real_gps = (
        lat_val is not None
        and lon_val is not None
        and gps_fix_flag is not False
    )

    if has_real_gps:
        lat_float = float(lat_val)
        lon_float = float(lon_val)
        if lat_float == 0.0 and lon_float == 0.0:
            has_real_gps = False

    if has_real_gps:
        latitude = lat_float
        longitude = lon_float
        display_latitude = lat_float
        display_longitude = lon_float
        location_source = "GPS_FIXED"
        gps_status = True
        risk_zone = risk_zone_override or lookup_flood_risk(latitude, longitude)
        if "nearby_sos_count" in payload or "nearbySosCount" in payload:
            nearby_sos_count = int(
                payload.get("nearby_sos_count", payload.get("nearbySosCount", 0))
            )
        else:
            nearby_sos_count = calculate_nearby_sos_count(
                db.session, latitude, longitude
            )
        resolved = reverse_geocode(latitude, longitude)
        location_name = resolved.location_name
        locality = resolved.locality
        district = resolved.district
        location_resolved_at = datetime.utcnow() if location_name != "Location unavailable" else None
    else:
        # Missing or unacquired GPS fix: actual GPS coordinates remain strictly None
        latitude = None
        longitude = None
        gps_status = False

        if exhibition_mode:
            display_latitude = venue_lat
            display_longitude = venue_lon
            location_source = "CONFIGURED_VENUE"
            location_name = venue_display_name
            locality = venue_locality
            district = venue_district
            location_resolved_at = datetime.utcnow()
            # Requirement 8: Keep flood risk Unknown and exclude unverified coordinates from nearby SOS
            risk_zone = risk_zone_override or "Unknown"
            nearby_sos_count = 0
        else:
            display_latitude = None
            display_longitude = None
            location_source = "NO_FIX"
            location_name = "Location unavailable — waiting for GPS"
            locality = None
            district = None
            location_resolved_at = None
            risk_zone = risk_zone_override or "Unknown"
            nearby_sos_count = 0

    if payload.get("location_source"):
        location_source = str(payload.get("location_source"))

    # At initial ingestion, request age is approximately 0
    request_age_minutes = float(
        payload.get("request_age_minutes", payload.get("requestAgeMinutes", 0.0))
    )

    # If payload explicitly supplied an override human location name (and not legacy banned defaults), respect it
    custom_location = payload.get("location_name") or payload.get("locationName")
    if custom_location and str(custom_location).strip() and "Thorana" not in str(custom_location):
        location_name = str(custom_location).strip()

    gateway_id = (
        payload.get("gateway_id")
        or payload.get("gatewayId")
        or "GATEWAY_001"
    )

    return {
        "device_id": str(device_id),
        "gateway_id": str(gateway_id),
        "category": category_display,
        "latitude": latitude,
        "longitude": longitude,
        "display_latitude": display_latitude,
        "display_longitude": display_longitude,
        "location_source": location_source,
        "location_name": location_name,
        "locality": locality,
        "district": district,
        "location_resolved_at": location_resolved_at,
        "risk_zone": risk_zone,
        "nearby_sos_count": nearby_sos_count,
        "request_age_minutes": request_age_minutes,
        "rssi_dbm": int(payload.get("rssi_dbm", payload.get("rssiDbm", -90))),
        "snr_db": float(payload.get("snr_db", payload.get("snrDb", 6.5))),
        "battery": float(payload["battery"]) if payload.get("battery") is not None else None,
        "gps_status": payload.get("gps_status", payload.get("gps_fix")),
        "received_at": _parse_timestamp(payload.get("timestamp")),
        "source": payload.get("source") or "gateway",
        "ingestion_source": ingestion_source,
    }


def create_incident_from_sos(
    payload: Dict[str, Any],
    *,
    source_label: Optional[str] = None,
    extra_note: Optional[str] = None,
    commit: bool = True,
) -> Tuple[Incident, bool]:
    """
    Create an Incident from a gateway/API SOS payload with real TabPFN prioritization.

    Returns (incident, created). created is False if validation failed
    before commit (raises ValueError for empty payloads).
    With commit=False the incident is only flushed so the caller can add
    related rows and commit them atomically.
    """
    if not isinstance(payload, dict) or not payload:
        raise ValueError("SOS payload must be a non-empty JSON object")

    data = normalize_sos_payload(payload)
    source = source_label or (
        "Emergency Communication System"
        if data["source"] == "gateway"
        else "Emergency Operator"
    )

    latest = Incident.query.order_by(Incident.sequence_number.desc()).first()
    next_seq = (latest.sequence_number + 1) if latest else 184
    incident_id = f"RM-{next_seq:05d}"

    # Real TabPFN priority classification
    priority, factors = calculate_ai_priority(
        category=data["category"],
        risk_zone=data["risk_zone"],
        nearby_sos_count=data["nearby_sos_count"],
        request_age_minutes=data["request_age_minutes"],
    )
    canonical_priority = normalize_priority(priority)
    prediction_source = factors.get("predictionSource", "tabpfn")
    ai_model = factors.get("aiModel", "TabPFNClassifier(v0.1.11, N_ensemble=1)")
    pred_time = datetime.utcnow()

    incident = Incident(
        id=incident_id,
        device_id=data["device_id"],
        gateway_id=data["gateway_id"],
        category=data["category"],
        latitude=data["latitude"],
        longitude=data["longitude"],
        display_latitude=data.get("display_latitude"),
        display_longitude=data.get("display_longitude"),
        location_source=data.get("location_source"),
        location_name=data["location_name"],
        locality=data.get("locality"),
        district=data.get("district"),
        location_resolved_at=data.get("location_resolved_at"),
        risk_zone=data["risk_zone"],
        nearby_sos_count=data["nearby_sos_count"],
        ai_recommended_priority=canonical_priority,
        operational_priority=canonical_priority,
        priority_source=prediction_source,
        ai_model=ai_model,
        ai_prediction_timestamp=pred_time,
        sequence_number=next_seq,
        status="New",
        received_at=data["received_at"],
        rssi_dbm=data["rssi_dbm"],
        snr_db=data["snr_db"],
        battery=data.get("battery"),
        gps_status=data.get("gps_status"),
        ingestion_source=data.get("ingestion_source", "HARDWARE"),
    )
    incident.set_ai_priority_factors(factors)
    incident.timeline_entries.append(
        TimelineEntry(
            status="New",
            timestamp=data["received_at"].strftime("%Y-%m-%dT%H:%M:%SZ"),
            operator=source,
            note=(
                f"Emergency request received. Recommended Priority: {canonical_priority}."
                + (f" {extra_note}" if extra_note else "")
            ),
        )
    )

    device = Device.query.get(data["device_id"])
    if device:
        device.last_seen = "Now"
        device.status = "Online"
        device.last_incident_id = incident_id
        device.packets_transmitted = (device.packets_transmitted or 0) + 1
        if data.get("rssi_dbm") is not None:
            device.rssi_dbm = data["rssi_dbm"]
        if data.get("snr_db") is not None:
            device.snr_db = data["snr_db"]

    gateway = Device.query.get(data["gateway_id"])
    if gateway:
        gateway.last_seen = "Now"
        gateway.status = "Online"
        gateway.packets_transmitted = (gateway.packets_transmitted or 0) + 1

    db.session.add(incident)
    if commit:
        db.session.commit()
    else:
        db.session.flush()
    return incident, True
