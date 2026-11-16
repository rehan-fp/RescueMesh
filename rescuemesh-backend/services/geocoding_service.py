"""
Geocoding service for RescueMesh.

Provides reverse-geocoding of SOS incident coordinates (latitude, longitude)
into clean, human-readable location names (locality, district, country)
without hardcoded place mappings.

Authoritative source of truth remains the hardware GPS coordinates.
"""

from __future__ import annotations

import json
import logging
import threading
import urllib.parse
import urllib.request
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

logger = logging.getLogger("rescuemesh.geocoding")

USER_AGENT = "RescueMesh-Disaster-Management-System/2.0 (contact: rescumeshadmin@gmail.com)"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"
REQUEST_TIMEOUT_SECONDS = 2.5

# Thread-safe in-memory cache keyed by 4-decimal rounded coordinates (~11m resolution)
_CACHE_LOCK = threading.Lock()
_GEO_CACHE: Dict[Tuple[float, float], "ResolvedLocation"] = {}


@dataclass
class ResolvedLocation:
    location_name: str
    locality: Optional[str] = None
    district: Optional[str] = None
    country: Optional[str] = None
    raw_address: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "location_name": self.location_name,
            "locality": self.locality,
            "district": self.district,
            "country": self.country,
        }


def _clean_part(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    s = str(val).strip()
    return s if s else None


def _format_address_components(data: Dict[str, Any]) -> Tuple[str, Optional[str], Optional[str], Optional[str]]:
    """
    Extracts a concise, professional human-readable location from OSM address JSON.
    Example: 'Taladuwa, Negombo' or 'Pittugala, Colombo District'.
    """
    addr = data.get("address", {})
    if not isinstance(addr, dict):
        addr = {}

    primary = (
        _clean_part(addr.get("suburb"))
        or _clean_part(addr.get("village"))
        or _clean_part(addr.get("neighbourhood"))
        or _clean_part(addr.get("hamlet"))
        or _clean_part(addr.get("road"))
        or _clean_part(addr.get("residential"))
        or _clean_part(addr.get("building"))
    )

    city = (
        _clean_part(addr.get("city"))
        or _clean_part(addr.get("town"))
        or _clean_part(addr.get("municipality"))
    )

    district = (
        _clean_part(addr.get("state_district"))
        or _clean_part(addr.get("district"))
        or _clean_part(addr.get("county"))
    )

    country = _clean_part(addr.get("country"))

    parts = []
    if primary:
        parts.append(primary)
    if city and city not in parts:
        parts.append(city)
    if district and district not in parts:
        # Avoid redundant "Colombo, Colombo District"
        clean_dist = district.replace(" District", "")
        if clean_dist not in parts:
            parts.append(district)

    if parts:
        formatted = ", ".join(parts[:3])
        return formatted, (city or primary), district, country

    # Fallback to truncated display_name if address keys were sparse
    display = data.get("display_name", "")
    if display:
        d_parts = [p.strip() for p in display.split(",") if p.strip()]
        if d_parts:
            return ", ".join(d_parts[:3]), None, district, country

    return "Location unavailable", None, district, country


def reverse_geocode(latitude: float, longitude: float) -> ResolvedLocation:
    """
    Reverse geocodes a latitude/longitude pair into a human-readable location.

    Guarantees:
    - Thread-safe and in-memory cached.
    - Never raises an unhandled exception.
    - Times out quickly (2.5s) so SOS ingest is never blocked.
    - Falls back to 'Location unavailable' on network or provider error.
    - Never falls back to a fake or hardcoded sector name.
    """
    try:
        lat_f = float(latitude)
        lon_f = float(longitude)
    except (ValueError, TypeError):
        return ResolvedLocation(location_name="Location unavailable")

    cache_key = (round(lat_f, 4), round(lon_f, 4))
    with _CACHE_LOCK:
        if cache_key in _GEO_CACHE:
            return _GEO_CACHE[cache_key]

    params = {
        "lat": f"{lat_f:.6f}",
        "lon": f"{lon_f:.6f}",
        "format": "jsonv2",
        "zoom": "18",
        "addressdetails": "1",
    }
    url = f"{NOMINATIM_REVERSE_URL}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})

    try:
        with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            if response.status == 200:
                body = json.loads(response.read().decode("utf-8"))
                name, locality, district, country = _format_address_components(body)
                result = ResolvedLocation(
                    location_name=name,
                    locality=locality,
                    district=district,
                    country=country,
                    raw_address=body.get("address"),
                )
                with _CACHE_LOCK:
                    _GEO_CACHE[cache_key] = result
                logger.info(
                    "Reverse geocoded (%f, %f) -> %s",
                    lat_f,
                    lon_f,
                    result.location_name,
                )
                return result
    except Exception as exc:
        logger.warning(
            "Reverse geocoding failed for (%f, %f): %s. Using graceful fallback.",
            lat_f,
            lon_f,
            exc,
        )

    fallback = ResolvedLocation(
        location_name="Location unavailable",
        locality=None,
        district=None,
        country=None,
    )
    return fallback
