"""
Comprehensive tests for RescueMesh SLIIT Exhibition GPS Fallback Handling.

Verifies:
1. Authoritative GPS coordinates are always preserved when a valid GPS fix is available.
2. When GPS fix is unavailable during exhibition (EXHIBITION_MODE=True):
   - Actual GPS coordinates (latitude, longitude) remain strictly None (null).
   - Display coordinates (display_latitude, display_longitude) are set to configured SLIIT Malabe campus coords (6.914678, 79.972946).
   - location_source is set to 'CONFIGURED_VENUE'.
   - location_name is set to 'SLIIT Malabe Campus'.
   - gps_status is False (never marked as GPS_FIXED).
3. Geographic AI calculations:
   - Flood risk remains 'Unknown' when actual GPS is unavailable (not calculated from venue coords).
   - Configured venue coordinates are excluded from nearby-SOS calculations (nearby_sos_count = 0).
4. Outside exhibition (EXHIBITION_MODE=False, default):
   - Missing GPS does NOT use exhibition coordinates.
   - Actual and display coordinates remain None, location_source is 'NO_FIX'.
5. Complete device-to-dashboard flow verification without polluting production data.
"""

import pytest
from unittest.mock import patch
from extensions import db
from models.incident import Incident
from models.gateway_sos import GatewaySosMessage
from ai.feature_builder import calculate_nearby_sos_count


def test_real_gps_is_always_used_when_available(app, client, auth_headers):
    """Requirement 1: Always use real GPS coordinates when a valid GPS fix is available."""
    app.config["EXHIBITION_MODE"] = True

    payload = {
        "device_id": "NODE_001",
        "gateway_id": "GATEWAY_001",
        "category": "MEDICAL",
        "latitude": 6.9271,
        "longitude": 79.8612,
        "gps_status": True,
        "sequence": 1001,
    }

    # Patch reverse_geocode to prevent external network calls in unit tests
    with patch("services.incident_ingest.reverse_geocode") as mock_geo:
        from services.geocoding_service import ResolvedLocation
        mock_geo.return_value = ResolvedLocation(
            location_name="Colombo Fort, Colombo District",
            locality="Colombo Fort",
            district="Colombo District",
        )
        resp = client.post("/api/v1/sos", json=payload, headers=auth_headers)

    assert resp.status_code == 201
    inc_id = resp.get_json()["incident_id"]

    with app.app_context():
        inc = db.session.get(Incident, inc_id)
        assert inc.latitude == pytest.approx(6.9271)
        assert inc.longitude == pytest.approx(79.8612)
        assert inc.display_latitude == pytest.approx(6.9271)
        assert inc.display_longitude == pytest.approx(79.8612)
        assert inc.location_source == "GPS_FIXED"
        assert inc.gps_status is True

        d = inc.to_dict()
        assert d["latitude"] == pytest.approx(6.9271)
        assert d["longitude"] == pytest.approx(79.8612)
        assert d["displayLatitude"] == pytest.approx(6.9271)
        assert d["displayLongitude"] == pytest.approx(79.8612)
        assert d["locationSource"] == "GPS_FIXED"


def test_exhibition_fallback_when_no_gps_fix(app, client, auth_headers):
    """
    Requirements 3, 4, 6, 8:
    During exhibition, when GPS fix is missing:
    - Actual GPS coordinates remain null.
    - Configured display coordinates set to SLIIT Malabe (6.914678, 79.972946).
    - location_source is CONFIGURED_VENUE.
    - location_name is 'SLIIT Malabe Campus'.
    - Never marked as GPS_FIXED (gps_status is False).
    - Flood risk is Unknown, nearby_sos_count is 0.
    """
    app.config["EXHIBITION_MODE"] = True
    app.config["EXHIBITION_VENUE_NAME"] = "Sri Lanka Institute of Information Technology"
    app.config["EXHIBITION_VENUE_DISPLAY_NAME"] = "SLIIT Malabe Campus"
    app.config["EXHIBITION_VENUE_LATITUDE"] = 6.914678
    app.config["EXHIBITION_VENUE_LONGITUDE"] = 79.972946
    app.config["EXHIBITION_VENUE_LOCALITY"] = "Malabe"
    app.config["EXHIBITION_VENUE_DISTRICT"] = "Colombo District"

    payload = {
        "device_id": "NODE_TBEAM_EXHIBITION",
        "gateway_id": "GATEWAY_001",
        "category": "RESCUE",
        "latitude": None,
        "longitude": None,
        "gps_status": False,
        "sequence": 1002,
    }

    resp = client.post("/api/v1/sos", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    body = resp.get_json()
    inc_id = body["incident_id"]

    # Verify API response details
    inc_api = client.get(f"/api/v1/incidents/{inc_id}").get_json()

    # Requirement 4: displayed normally with ID, category, priority, status, and SLIIT Malabe Campus
    assert inc_api["id"] == inc_id
    assert inc_api["category"] == "Rescue"
    assert inc_api["operationalPriority"] in {"Critical", "High", "Medium", "Low"}
    assert inc_api["status"] == "New"
    assert inc_api["locationName"] == "SLIIT Malabe Campus"

    # Requirement 6: Actual GPS remains null, display coordinates stored separately
    assert inc_api["latitude"] is None
    assert inc_api["longitude"] is None
    assert inc_api["displayLatitude"] == pytest.approx(6.914678, abs=1e-6)
    assert inc_api["displayLongitude"] == pytest.approx(79.972946, abs=1e-6)
    assert inc_api["locationSource"] == "CONFIGURED_VENUE"
    assert inc_api["gpsStatus"] is False

    # Requirement 8: Flood risk Unknown, nearby_sos_count 0
    assert inc_api["riskZone"] == "Unknown"
    assert inc_api["nearbySosCount"] == 0

    with app.app_context():
        inc = db.session.get(Incident, inc_id)
        assert inc.latitude is None
        assert inc.longitude is None
        assert inc.display_latitude == pytest.approx(6.914678, abs=1e-6)
        assert inc.display_longitude == pytest.approx(79.972946, abs=1e-6)
        assert inc.location_source == "CONFIGURED_VENUE"
        assert inc.location_name == "SLIIT Malabe Campus"
        assert inc.locality == "Malabe"
        assert inc.district == "Colombo District"
        assert inc.risk_zone == "Unknown"
        assert inc.nearby_sos_count == 0

        # Check raw gateway message as well
        gw_msg = GatewaySosMessage.query.filter_by(incident_id=inc_id).first()
        assert gw_msg is not None
        assert gw_msg.latitude is None
        assert gw_msg.longitude is None
        assert gw_msg.display_latitude == pytest.approx(6.914678, abs=1e-6)
        assert gw_msg.display_longitude == pytest.approx(79.972946, abs=1e-6)
        assert gw_msg.location_source == "CONFIGURED_VENUE"
        assert gw_msg.gps_status is False


def test_zero_zero_coords_in_exhibition_mode_use_configured_venue(app, client, auth_headers):
    """When hardware sends 0.0, 0.0 (unacquired GPS), exhibition mode applies fallback."""
    app.config["EXHIBITION_MODE"] = True

    payload = {
        "device_id": "NODE_TBEAM_ZERO",
        "gateway_id": "GATEWAY_001",
        "category": "MEDICAL",
        "latitude": 0.0,
        "longitude": 0.0,
        "sequence": 1003,
    }

    resp = client.post("/api/v1/sos", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    inc_id = resp.get_json()["incident_id"]

    with app.app_context():
        inc = db.session.get(Incident, inc_id)
        assert inc.latitude is None
        assert inc.longitude is None
        assert inc.display_latitude == pytest.approx(6.914678, abs=1e-6)
        assert inc.display_longitude == pytest.approx(79.972946, abs=1e-6)
        assert inc.location_source == "CONFIGURED_VENUE"
        assert inc.location_name == "SLIIT Malabe Campus"
        assert inc.risk_zone == "Unknown"


def test_exhibition_mode_disabled_by_default_outside_exhibition(app, client, auth_headers):
    """
    Requirement 9: Exhibition configuration is optional and disabled by default outside exhibition.
    Missing GPS remains NO_FIX without campus coordinates.
    """
    app.config["EXHIBITION_MODE"] = False

    payload = {
        "device_id": "NODE_NORMAL_NO_GPS",
        "gateway_id": "GATEWAY_001",
        "category": "MEDICAL",
        "latitude": None,
        "longitude": None,
        "gps_status": False,
        "sequence": 1004,
    }

    resp = client.post("/api/v1/sos", json=payload, headers=auth_headers)
    assert resp.status_code == 201
    inc_id = resp.get_json()["incident_id"]

    with app.app_context():
        inc = db.session.get(Incident, inc_id)
        assert inc.latitude is None
        assert inc.longitude is None
        assert inc.display_latitude is None
        assert inc.display_longitude is None
        assert inc.location_source == "NO_FIX"
        assert inc.location_name == "Location unavailable — waiting for GPS"

        d = inc.to_dict()
        assert d["latitude"] is None
        assert d["longitude"] is None
        assert d["displayLatitude"] is None
        assert d["displayLongitude"] is None
        assert d["locationSource"] == "NO_FIX"


def test_configured_venue_excluded_from_nearby_sos_calculations(app):
    """
    Requirement 8: Exclude unverified / configured venue coordinates from nearby-SOS calculations.
    """
    with app.app_context():
        # Target coords around SLIIT campus
        target_lat = 6.914678
        target_lon = 79.972946

        # Create an incident with CONFIGURED_VENUE (actual GPS is None)
        venue_inc = Incident(
            id="RM-TEST-VENUE",
            device_id="NODE_EXHIBITION",
            gateway_id="GATEWAY_001",
            category="Medical",
            latitude=None,
            longitude=None,
            display_latitude=target_lat,
            display_longitude=target_lon,
            location_source="CONFIGURED_VENUE",
            location_name="SLIIT Malabe Campus",
            risk_zone="Unknown",
            nearby_sos_count=0,
            ai_recommended_priority="High",
            operational_priority="High",
            sequence_number=99901,
            ingestion_source="HARDWARE",
        )
        db.session.add(venue_inc)
        db.session.commit()

        # Calculation around target coords must ignore venue_inc
        count = calculate_nearby_sos_count(db.session, target_lat, target_lon)
        assert count == 0, "CONFIGURED_VENUE must not count as a nearby hardware GPS incident"

