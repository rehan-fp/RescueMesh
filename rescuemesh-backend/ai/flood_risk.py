"""
Geospatial Flood-Risk Service for RescueMesh.

Determines geospatial flood-risk context dynamically from SOS GPS coordinates (latitude, longitude):
- High: Within the prototype Kelani River Basin corridor (Ambatale, Mabima, Korathota, Kaduwela, Malabe, Thalahena)
- Medium: Within the 4,000 m buffer corridor (project-defined heuristic covering adjacent low-lying canal plains)
- Low: Outside inundation corridor approximation and buffer zone (elevated / inland terrain)
- Unknown: When GPS coordinate fix is unavailable (no latitude/longitude)
"""

from __future__ import annotations

import math
from typing import List, Optional, Tuple

# Prototype Kelani Basin Flood-Risk Zone polygon coordinates (lat, lon)
# Project-defined geometric approximation for prototype evaluation (Malabe/Kaduwela/Kelani corridor)
# Matches Leaflet GIS Map overlay layer in RescueMesh frontend
KELANI_BASIN_POLYGON: List[Tuple[float, float]] = [
    (6.935, 79.955),  # Ambatale, Colombo District
    (6.945, 79.975),  # Mabima East, Gampaha District (across Kelani River)
    (6.930, 79.995),  # Korathota, Colombo District
    (6.905, 79.990),  # Patiniyawatta, Kaduwela, Colombo District
    (6.895, 79.975),  # Kahantota, Colombo District
    (6.900, 79.955),  # 10th Mile Post Malabe, Malabe, Colombo District
    (6.915, 79.950),  # Thalahena, Colombo District
]

BUFFER_RADIUS_METERS = 4000.0  # 4 km project-defined heuristic buffer for Medium risk zone
EARTH_RADIUS_METERS = 6371000.0


def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the great-circle distance between two GPS points in meters."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c


def point_in_polygon(
    lat: Optional[float], lon: Optional[float], polygon: List[Tuple[float, float]]
) -> bool:
    """Ray-casting algorithm to test whether a GPS coordinate is inside a polygon."""
    if lat is None or lon is None:
        return False
    inside = False
    n = len(polygon)
    if n < 3:
        return False

    p1_lat, p1_lon = polygon[0]
    for i in range(1, n + 1):
        p2_lat, p2_lon = polygon[i % n]
        if min(p1_lon, p2_lon) < lon <= max(p1_lon, p2_lon):
            if lat <= max(p1_lat, p2_lat):
                if p1_lon != p2_lon:
                    lat_inters = (lon - p1_lon) * (p2_lat - p1_lat) / (p2_lon - p1_lon) + p1_lat
                else:
                    lat_inters = p1_lat
                if p1_lat == p2_lat or lat <= lat_inters:
                    inside = not inside
        p1_lat, p1_lon = p2_lat, p2_lon

    return inside


def distance_to_segment(
    p_lat: float, p_lon: float,
    a_lat: float, a_lon: float,
    b_lat: float, b_lon: float,
) -> float:
    """Approximate shortest distance from point P to line segment AB in meters."""
    # Convert to local Cartesian approximation in meters for fast projection
    # 1 deg lat ~ 111,000 m; 1 deg lon ~ 111,000 * cos(lat) m
    cos_lat = math.cos(math.radians(p_lat))
    scale_y = 111000.0
    scale_x = 111000.0 * cos_lat

    px, py = p_lon * scale_x, p_lat * scale_y
    ax, ay = a_lon * scale_x, a_lat * scale_y
    bx, by = b_lon * scale_x, b_lat * scale_y

    dx = bx - ax
    dy = by - ay
    seg_len_sq = dx * dx + dy * dy

    if seg_len_sq == 0.0:
        return haversine_distance(p_lat, p_lon, a_lat, a_lon)

    # Project P onto AB: t in [0, 1]
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / seg_len_sq))
    proj_x = ax + t * dx
    proj_y = ay + t * dy

    proj_lon = proj_x / scale_x
    proj_lat = proj_y / scale_y
    return haversine_distance(p_lat, p_lon, proj_lat, proj_lon)


def distance_to_polygon(
    lat: Optional[float], lon: Optional[float], polygon: List[Tuple[float, float]]
) -> float:
    """Shortest distance in meters from point (lat, lon) to the perimeter of polygon."""
    if lat is None or lon is None:
        return float("inf")
    n = len(polygon)
    min_dist = float("inf")
    for i in range(n):
        a_lat, a_lon = polygon[i]
        b_lat, b_lon = polygon[(i + 1) % n]
        dist = distance_to_segment(lat, lon, a_lat, a_lon, b_lat, b_lon)
        if dist < min_dist:
            min_dist = dist
    return min_dist


def lookup_flood_risk(latitude: Optional[float], longitude: Optional[float]) -> str:
    """
    Determine canonical flood risk ('High', 'Medium', 'Low', 'Unknown') from GPS coordinates.

    - Unknown: When latitude or longitude is None, 0.0/0.0, or invalid (no GPS fix).
    - High: Inside the prototype Kelani River Basin inundation corridor approximation.
    - Medium: Within BUFFER_RADIUS_METERS (4 km) of the corridor boundary.
    - Low: Outside buffer corridor (elevated / inland terrain).
    """
    if latitude is None or longitude is None:
        return "Unknown"
    if latitude == 0.0 and longitude == 0.0:
        return "Unknown"
    # Basic latitude/longitude range sanity check
    if not (-90.0 <= latitude <= 90.0 and -180.0 <= longitude <= 180.0):
        return "Unknown"

    if point_in_polygon(latitude, longitude, KELANI_BASIN_POLYGON):
        return "High"

    dist_meters = distance_to_polygon(latitude, longitude, KELANI_BASIN_POLYGON)
    if dist_meters <= BUFFER_RADIUS_METERS:
        return "Medium"

    return "Low"
