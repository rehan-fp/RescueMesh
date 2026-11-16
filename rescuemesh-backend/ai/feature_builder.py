"""
Feature engineering pipeline for RescueMesh TabPFN priority classification.

Features:
1. emergency_category: RESCUE, MEDICAL, FOOD_WATER, SHELTER
2. flood_risk_level: HIGH, MEDIUM, LOW (derived dynamically from GPS)
3. nearby_recent_sos_count: Count of other recent SOS incidents within radius (Haversine)
4. request_age_minutes: Time elapsed since incident creation (0 at initial ingest)
"""

from __future__ import annotations

import re
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Tuple
import sqlalchemy as sa

from ai.flood_risk import haversine_distance, lookup_flood_risk

# Centralized configuration
NEARBY_RADIUS_METERS = 500.0  # 500 meters operational cluster radius
NEARBY_WINDOW_MINUTES = 60    # 60 minutes recent activity window

# Mapping dictionaries
CATEGORY_ALIASES = {
    "medical": ("MEDICAL", "Medical"),
    "rescue": ("RESCUE", "Rescue"),
    "food_water": ("FOOD_WATER", "Food & Water"),
    "food_and_water": ("FOOD_WATER", "Food & Water"),
    "food": ("FOOD_WATER", "Food & Water"),
    "water": ("FOOD_WATER", "Food & Water"),
    "shelter": ("SHELTER", "Shelter"),
}

CATEGORY_ENCODING = {
    "MEDICAL": 0,
    "RESCUE": 1,
    "FOOD_WATER": 2,
    "SHELTER": 3,
}

FLOOD_RISK_ENCODING = {
    "LOW": 0,
    "MEDIUM": 1,
    "HIGH": 2,
}

PRIORITY_NORMALIZATION = {
    "CRITICAL": "Critical",
    "HIGH": "High",
    "MEDIUM": "Medium",
    "LOW": "Low",
    "critical": "Critical",
    "high": "High",
    "medium": "Medium",
    "low": "Low",
    "Critical": "Critical",
    "High": "High",
    "Medium": "Medium",
    "Low": "Low",
}


def normalize_category(raw_category: Any) -> Tuple[str, str]:
    """
    Returns (internal_code, display_name), e.g. ('MEDICAL', 'Medical').
    Defaults to ('MEDICAL', 'Medical') if unrecognized.
    """
    if not isinstance(raw_category, str):
        return "MEDICAL", "Medical"
    key = re.sub(r"[^a-z]+", "_", raw_category.strip().lower()).strip("_")
    return CATEGORY_ALIASES.get(key, ("MEDICAL", "Medical"))


def normalize_priority(raw_priority: Any) -> str:
    """Canonical 4-level priority normalization ('Critical', 'High', 'Medium', 'Low')."""
    if not isinstance(raw_priority, str):
        return "Medium"
    key = raw_priority.strip()
    return PRIORITY_NORMALIZATION.get(key, PRIORITY_NORMALIZATION.get(key.upper(), "Medium"))


def calculate_nearby_sos_count(
    db_session,
    latitude: float,
    longitude: float,
    radius_meters: float = NEARBY_RADIUS_METERS,
    window_minutes: int = NEARBY_WINDOW_MINUTES,
    exclude_incident_id: Optional[str] = None,
) -> int:
    """
    Dynamically counts other recent SOS incidents in the database within radius_meters
    using Haversine great-circle distance.
    """
    if db_session is None or latitude is None or longitude is None:
        return 0

    try:
        from models.incident import Incident

        cutoff = datetime.utcnow() - timedelta(minutes=window_minutes)
        # Bounding box pre-filter for performance (~0.01 deg lat is ~1.11 km)
        deg_buffer = (radius_meters / 111000.0) * 1.5
        query = db_session.query(
            Incident.id, Incident.latitude, Incident.longitude
        ).filter(
            Incident.ingestion_source == "HARDWARE",
            Incident.latitude.isnot(None),
            Incident.longitude.isnot(None),
            sa.or_(Incident.location_source != "CONFIGURED_VENUE", Incident.location_source.is_(None)),
            Incident.received_at >= cutoff,
            Incident.latitude >= latitude - deg_buffer,
            Incident.latitude <= latitude + deg_buffer,
            Incident.longitude >= longitude - deg_buffer,
            Incident.longitude <= longitude + deg_buffer,
        )

        if exclude_incident_id:
            query = query.filter(Incident.id != exclude_incident_id)

        count = 0
        for inc_id, inc_lat, inc_lon in query.all():
            if inc_lat is not None and inc_lon is not None:
                dist = haversine_distance(latitude, longitude, float(inc_lat), float(inc_lon))
                if dist <= radius_meters:
                    count += 1
        return count
    except Exception:
        return 0


def build_factors_dict(
    category_display: str,
    flood_risk: str,
    nearby_sos_count: int,
    request_age_minutes: float,
    source: str = "tabpfn",
) -> Dict[str, Any]:
    """Builds clean, human-readable factors dictionary for the dashboard."""
    # Emergency type factor description
    if category_display == "Medical":
        cat_factor = "Medical Emergency (Triage & stabilization required)"
    elif category_display == "Rescue":
        cat_factor = "Physical Extraction / Trapped (Boat/crew deployment needed)"
    elif category_display == "Food & Water":
        cat_factor = "Potable Water & Relief Supplies (Supply depletion risk)"
    else:
        cat_factor = "Displacement Refuge / Temporary Shelter Request"

    # Flood risk factor description
    if flood_risk == "High":
        zone_factor = "Flood Risk Zone: High (Kelani Basin Corridor Approximation)"
    elif flood_risk == "Medium":
        zone_factor = "Flood Risk Zone: Medium (Lowland / 4 km buffer zone)"
    elif flood_risk == "Unknown":
        zone_factor = "Flood Risk Zone: Unknown (Awaiting GPS fix — environmental risk unavailable)"
    else:
        zone_factor = "Flood Risk Zone: Low (Outside prototype risk corridor)"

    # Density factor description
    if nearby_sos_count >= 5:
        density_factor = f"Severe Cluster ({nearby_sos_count} nearby beacons within 500m)"
    elif nearby_sos_count >= 2:
        density_factor = f"Localized Cluster ({nearby_sos_count} nearby beacons within 500m)"
    else:
        density_factor = f"Isolated Beacon ({nearby_sos_count} nearby beacon within 500m)"

    # Age factor description
    age_int = int(round(request_age_minutes))
    if age_int == 0:
        age_factor = "New Beacon Ingest (0 min waiting time)"
    elif age_int >= 30:
        age_factor = f"Request Age: {age_int} min (Prolonged unaddressed wait)"
    else:
        age_factor = f"Request Age: {age_int} min"

    return {
        "category": category_display,
        "categoryFactor": cat_factor,
        "riskZone": flood_risk,
        "riskZoneFactor": zone_factor,
        "nearbySosCount": nearby_sos_count,
        "nearbyDensityFactor": density_factor,
        "requestAgeMinutes": age_int,
        "ageFactor": age_factor,
        "factorsConsidered": [
            f"Emergency Type: {category_display}",
            f"Flood Risk: {flood_risk}",
            f"Nearby Recent SOS: {nearby_sos_count}",
            f"Waiting Time: {age_int} min",
        ],
        "explanation": f"{cat_factor} • {zone_factor} • {density_factor} • {age_factor}",
        "predictionSource": source,
    }
