import pytest
from extensions import db
from models.incident import Incident
from models.gateway_sos import GatewaySosMessage
from ai.feature_builder import calculate_nearby_sos_count


def test_gateway_request_defaults_to_hardware(app, client):
    headers = {"X-API-Key": "test-gateway-key"}
    payload = {
        "device_id": "NODE_TEST_HW",
        "gateway_id": "GATEWAY_001",
        "category": "MEDICAL",
        "latitude": 6.9135,
        "longitude": 79.9721,
        "sequence": 9991,
    }
    resp = client.post("/api/v1/sos", json=payload, headers=headers)
    assert resp.status_code == 201
    inc_id = resp.get_json()["incident_id"]

    with app.app_context():
        inc = db.session.get(Incident, inc_id)
        assert inc.ingestion_source == "HARDWARE"

        gw_msg = GatewaySosMessage.query.filter_by(incident_id=inc_id).first()
        assert gw_msg is not None
        assert gw_msg.ingestion_source == "HARDWARE"


def test_client_cannot_claim_hardware_in_body(app, client):
    # Even if payload says "ingestion_source": "HARDWARE", test endpoint sets API_TEST
    headers = {"X-API-Key": "test-gateway-key", "X-Ingestion-Source": "API_TEST"}
    payload = {
        "device_id": "NODE_TEST_FAKE_HW",
        "gateway_id": "GATEWAY_001",
        "category": "RESCUE",
        "latitude": 6.9135,
        "longitude": 79.9721,
        "sequence": 9992,
        "ingestion_source": "HARDWARE",  # Attempting to forge hardware
    }
    resp = client.post("/api/v1/sos", json=payload, headers=headers)
    assert resp.status_code == 201
    inc_id = resp.get_json()["incident_id"]

    with app.app_context():
        inc = db.session.get(Incident, inc_id)
        # Server-controlled header overrides body
        assert inc.ingestion_source == "API_TEST"


def test_no_gps_does_not_create_fake_negombo_coordinates(app, client):
    headers = {"X-API-Key": "test-gateway-key"}
    payload = {
        "device_id": "NODE_TEST_NO_GPS",
        "gateway_id": "GATEWAY_001",
        "category": "MEDICAL",
        "latitude": None,
        "longitude": None,
        "gps_status": False,
        "sequence": 9993,
    }
    resp = client.post("/api/v1/sos", json=payload, headers=headers)
    assert resp.status_code == 201
    inc_id = resp.get_json()["incident_id"]

    with app.app_context():
        inc = db.session.get(Incident, inc_id)
        assert inc.latitude is None
        assert inc.longitude is None
        assert inc.location_name == "Location unavailable — waiting for GPS"
        assert inc.district is None


def test_zero_zero_coords_treated_as_no_fix(app, client):
    headers = {"X-API-Key": "test-gateway-key"}
    payload = {
        "device_id": "NODE_TEST_ZERO_GPS",
        "gateway_id": "GATEWAY_001",
        "category": "RESCUE",
        "latitude": 0.0,
        "longitude": 0.0,
        "sequence": 9994,
    }
    resp = client.post("/api/v1/sos", json=payload, headers=headers)
    assert resp.status_code == 201
    inc_id = resp.get_json()["incident_id"]

    with app.app_context():
        inc = db.session.get(Incident, inc_id)
        assert inc.latitude is None
        assert inc.longitude is None
        assert inc.location_name == "Location unavailable — waiting for GPS"


def test_nearby_sos_ignores_api_test_and_simulation(app, client):
    with app.app_context():
        # Hardware incident at target coords
        hw_inc = Incident(
            id="RM-TEST-HW-1",
            device_id="NODE_001",
            gateway_id="GATEWAY_001",
            category="Medical",
            latitude=6.9135,
            longitude=79.9721,
            location_name="Pittugala",
            risk_zone="High",
            ai_recommended_priority="Critical",
            operational_priority="Critical",
            sequence_number=8881,
            status="New",
            ingestion_source="HARDWARE",
        )
        # Synthetic test incident nearby
        test_inc = Incident(
            id="RM-TEST-SYN-1",
            device_id="NODE_001",
            gateway_id="GATEWAY_001",
            category="Medical",
            latitude=6.9136,
            longitude=79.9722,
            location_name="Pittugala",
            risk_zone="High",
            ai_recommended_priority="Critical",
            operational_priority="Critical",
            sequence_number=8882,
            status="New",
            ingestion_source="API_TEST",
        )
        db.session.add(hw_inc)
        db.session.add(test_inc)
        db.session.commit()

        # Calculate nearby SOS for a new emergency at 6.9135, 79.9721:
        # Only the HARDWARE incident must be counted (count = 1), ignoring API_TEST
        count = calculate_nearby_sos_count(db.session, 6.9135, 79.9721)
        assert count == 1, f"Expected 1 (only HARDWARE), got {count}"


def test_operational_incidents_endpoint_excludes_test_by_default(app, client):
    resp = client.get("/api/v1/incidents")
    assert resp.status_code == 200
    incidents = resp.get_json()

    for inc in incidents:
        assert inc.get("ingestionSource") == "HARDWARE"

    # When querying with source=ALL, test incidents are visible
    resp_all = client.get("/api/v1/incidents?source=ALL")
    assert resp_all.status_code == 200
    all_incs = resp_all.get_json()
    assert len(all_incs) >= len(incidents)
