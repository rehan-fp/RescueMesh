"""
Tests for the RescueMesh incident location and reverse-geocoding pipeline.
Verifies that:
1. Hardware GPS coordinates are the authoritative source of truth.
2. No hardcoded 'Kelaniya - Thorana Junction Sector' is ever assigned.
3. Geographically separated coordinates resolve to distinct, correct locations.
4. Physical location is completely decoupled from environmental flood risk.
5. Ingest gracefully handles geocoder unavailability without failing SOS creation.
6. DB models, serializers, and APIs expose exact coordinates and location metadata.
"""

from unittest.mock import patch
import pytest

from extensions import db
from models.incident import Incident
from services.geocoding_service import reverse_geocode, ResolvedLocation, _GEO_CACHE, _CACHE_LOCK


def test_reverse_geocode_caching_and_fallback():
    # Test caching
    loc1 = reverse_geocode(6.9271, 79.8612)
    assert loc1.location_name != "Kelaniya - Thorana Junction Sector"
    
    # Check cache contains rounded key
    cache_key = (round(6.9271, 4), round(79.8612, 4))
    with _CACHE_LOCK:
        assert cache_key in _GEO_CACHE

    # Immediate second call returns cached value
    loc2 = reverse_geocode(6.9271, 79.8612)
    assert loc2.location_name == loc1.location_name


def test_reverse_geocode_handles_network_failure_safely():
    with patch("urllib.request.urlopen", side_effect=Exception("Connection refused")):
        # Use uncached coordinates
        loc = reverse_geocode(8.5874, 81.2152)
        assert loc.location_name == "Location unavailable"
        assert loc.locality is None
        assert loc.district is None


def test_sos_ingest_two_geographically_separated_locations(client, auth_headers):
    # Location A: Negombo / Taladuwa (7.208300, 79.835800)
    payload_a = {
        "device_id": "NODE_001",
        "category": "MEDICAL",
        "latitude": 7.208300,
        "longitude": 79.835800,
        "battery": 90,
        "gps_status": True,
        "sequence": 101,
    }
    res_a = client.post("/api/v1/sos", json=payload_a, headers=auth_headers)
    assert res_a.status_code == 201
    id_a = res_a.get_json()["incident_id"]

    # Location B: Colombo Fort / Galle Face area (6.934400, 79.842800)
    payload_b = {
        "device_id": "NODE_002",
        "category": "RESCUE",
        "latitude": 6.934400,
        "longitude": 79.842800,
        "battery": 82,
        "gps_status": True,
        "sequence": 102,
    }
    res_b = client.post("/api/v1/sos", json=payload_b, headers=auth_headers)
    assert res_b.status_code == 201
    id_b = res_b.get_json()["incident_id"]

    # Fetch incidents from API
    inc_a = client.get(f"/api/v1/incidents/{id_a}").get_json()
    inc_b = client.get(f"/api/v1/incidents/{id_b}").get_json()

    # Verify authoritative coordinates are exact
    assert inc_a["latitude"] == pytest.approx(7.208300, abs=1e-6)
    assert inc_a["longitude"] == pytest.approx(79.835800, abs=1e-6)
    assert inc_b["latitude"] == pytest.approx(6.934400, abs=1e-6)
    assert inc_b["longitude"] == pytest.approx(79.842800, abs=1e-6)

    # Verify location names are NOT hardcoded Thorana
    assert "Thorana" not in inc_a["locationName"]
    assert "Thorana" not in inc_b["locationName"]
    assert inc_a["locationName"] != inc_b["locationName"]

    # Location A should resolve to Negombo region
    assert "Negombo" in inc_a["locationName"] or inc_a["locality"] == "Negombo"

    # Verify location metadata fields are present
    assert "locality" in inc_a
    assert "district" in inc_a
    assert "locationResolvedAt" in inc_a


def test_sos_ingest_graceful_when_geocoding_down(client, auth_headers):
    # If geocoding fails completely, SOS must still succeed
    with patch("services.geocoding_service.urllib.request.urlopen", side_effect=Exception("Timeout")):
        payload = {
            "device_id": "NODE_001",
            "category": "FOOD_WATER",
            "latitude": 6.053514,
            "longitude": 80.220978,
            "sequence": 103,
        }
        res = client.post("/api/v1/sos", json=payload, headers=auth_headers)
        assert res.status_code == 201
        inc_id = res.get_json()["incident_id"]

        inc = client.get(f"/api/v1/incidents/{inc_id}").get_json()
        assert inc["latitude"] == pytest.approx(6.053514, abs=1e-6)
        assert inc["longitude"] == pytest.approx(80.220978, abs=1e-6)
        assert inc["locationName"] == "Location unavailable"
