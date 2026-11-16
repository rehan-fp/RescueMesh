from datetime import datetime, timedelta

import pytest
from sqlalchemy.exc import OperationalError

from extensions import db
from models.gateway_sos import GatewaySosMessage
from models.incident import Incident

SOS_URL = "/api/v1/sos"


def _incident_count(app):
    with app.app_context():
        return Incident.query.count()


def _post(client, payload, headers):
    return client.post(SOS_URL, json=payload, headers=headers)


# --- valid SOS -------------------------------------------------------------


def test_valid_sos_creates_incident_with_ai_priority(app, client, auth_headers, valid_payload):
    before = _incident_count(app)

    res = _post(client, valid_payload, auth_headers)

    assert res.status_code == 201
    body = res.get_json()
    assert body["success"] is True
    assert body["duplicate"] is False
    assert body["message"] == "SOS received"
    assert body["message_id"]
    assert body["incident_id"].startswith("RM-")
    assert body["priority"] in {"Critical", "High", "Medium", "Low"}
    assert _incident_count(app) == before + 1

    with app.app_context():
        incident = db.session.get(Incident, body["incident_id"])
        assert incident.device_id == "NODE_001"
        assert incident.category == "Medical"
        assert incident.latitude == pytest.approx(6.9271)
        assert incident.longitude == pytest.approx(79.8612)
        assert incident.status == "New"
        assert incident.ai_recommended_priority == body["priority"]
        assert incident.get_ai_priority_factors()["category"] == "Medical"
        note = incident.timeline_entries[0].note
        assert "seq=1" in note and "battery=85%" in note

        message = db.session.get(GatewaySosMessage, body["message_id"])
        assert message.incident_id == incident.id
        assert message.sequence == 1
        assert message.battery == 85
        assert message.gps_status is True
        assert message.gateway_id == "GATEWAY_001"


def test_valid_sos_is_visible_to_dashboard(client, auth_headers, valid_payload):
    incident_id = _post(client, valid_payload, auth_headers).get_json()["incident_id"]

    incidents = client.get("/api/v1/incidents").get_json()
    listed = next(i for i in incidents if i["id"] == incident_id)
    assert listed["category"] == "Medical"
    assert listed["deviceId"] == "NODE_001"
    assert listed["status"] == "New"

    detail = client.get(f"/api/v1/incidents/{incident_id}").get_json()
    assert detail["aiRecommendedPriority"]

    health = client.get("/api/v1/system/health").get_json()
    assert health["gateway"] == "online"
    assert health["mqtt"] == "disabled"
    assert health["database"] == "online"
    assert health["last_packet_at"]


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("MEDICAL", "Medical"),
        ("Medical", "Medical"),
        ("RESCUE", "Rescue"),
        ("FOOD_WATER", "Food & Water"),
        ("Food & Water", "Food & Water"),
        ("SHELTER", "Shelter"),
    ],
)
def test_supported_categories_are_normalised(app, client, auth_headers, valid_payload, raw, expected):
    res = _post(client, {**valid_payload, "category": raw}, auth_headers)
    assert res.status_code == 201
    with app.app_context():
        assert db.session.get(Incident, res.get_json()["incident_id"]).category == expected


def test_gateway_metadata_and_legacy_gps_fix_are_accepted(app, client, auth_headers, valid_payload):
    payload = {**valid_payload, "gateway_id": "GATEWAY_002", "rssi_dbm": -97, "snr_db": 5.25}
    payload.pop("gps_status")
    payload["gps_fix"] = False

    res = _post(client, payload, auth_headers)

    assert res.status_code == 201
    with app.app_context():
        message = db.session.get(GatewaySosMessage, res.get_json()["message_id"])
        assert message.gateway_id == "GATEWAY_002"
        assert message.gps_status is False
        assert message.incident.rssi_dbm == -97
        assert message.incident.snr_db == pytest.approx(5.25)


def test_sequence_is_optional(app, client, auth_headers, valid_payload):
    payload = {k: v for k, v in valid_payload.items() if k != "sequence"}
    before = _incident_count(app)

    assert _post(client, payload, auth_headers).status_code == 201
    assert _post(client, payload, auth_headers).status_code == 201
    assert _incident_count(app) == before + 2


# --- invalid payload -------------------------------------------------------


@pytest.mark.parametrize(
    "mutation, field",
    [
        ({"device_id": None}, "device_id"),
        ({"device_id": "   "}, "device_id"),
        ({"device_id": "NODE 001; DROP"}, "device_id"),
        ({"device_id": 123}, "device_id"),
        ({"category": None}, "category"),
        ({"category": "FIRE"}, "category"),
        ({"category": 1}, "category"),
        ({"latitude": None}, "latitude"),
        ({"latitude": 91}, "latitude"),
        ({"latitude": "6.9"}, "latitude"),
        ({"latitude": True}, "latitude"),
        ({"longitude": -180.5}, "longitude"),
        ({"sequence": -1}, "sequence"),
        ({"sequence": 1.5}, "sequence"),
        ({"sequence": "1"}, "sequence"),
        ({"battery": 150}, "battery"),
        ({"gps_status": "yes"}, "gps_status"),
    ],
)
def test_invalid_fields_are_rejected(app, client, auth_headers, valid_payload, mutation, field):
    payload = {**valid_payload, **mutation}
    payload = {k: v for k, v in payload.items() if v is not None}
    before = _incident_count(app)

    res = _post(client, payload, auth_headers)

    assert res.status_code == 422
    body = res.get_json()
    assert body["success"] is False
    assert field in body["details"]
    assert _incident_count(app) == before


def test_malformed_json_is_rejected(client, auth_headers):
    res = client.post(
        SOS_URL,
        data='{"device_id": "NODE_001", ',
        headers={**auth_headers, "Content-Type": "application/json"},
    )
    assert res.status_code == 400
    assert res.get_json()["error"] == "Malformed JSON body"


def test_non_object_json_is_rejected(client, auth_headers):
    res = client.post(SOS_URL, json=[1, 2, 3], headers=auth_headers)
    assert res.status_code == 400
    assert "body" in res.get_json()["details"]


def test_non_json_content_type_is_rejected(client, auth_headers):
    res = client.post(SOS_URL, data="device_id=NODE_001", headers=auth_headers)
    assert res.status_code == 415


def test_oversized_body_is_rejected(client, auth_headers, valid_payload):
    res = _post(client, {**valid_payload, "padding": "x" * 5000}, auth_headers)
    assert res.status_code == 413


# --- authentication --------------------------------------------------------


def test_missing_api_key_is_rejected(app, client, valid_payload):
    before = _incident_count(app)
    res = _post(client, valid_payload, {})
    assert res.status_code == 401
    assert res.get_json()["success"] is False
    assert _incident_count(app) == before


def test_invalid_api_key_is_rejected(app, client, valid_payload):
    before = _incident_count(app)
    res = _post(client, valid_payload, {"X-API-Key": "wrong-key"})
    assert res.status_code == 401
    assert _incident_count(app) == before


def test_unconfigured_api_key_fails_closed(app, client, auth_headers, valid_payload):
    app.config["GATEWAY_API_KEYS"] = []
    res = _post(client, valid_payload, auth_headers)
    assert res.status_code == 503


def test_rotated_keys_are_all_accepted(app, client, valid_payload):
    app.config["GATEWAY_API_KEYS"] = ["old-key", "new-key"]
    assert _post(client, valid_payload, {"X-API-Key": "old-key"}).status_code == 201
    assert (
        _post(client, {**valid_payload, "sequence": 2}, {"X-API-Key": "new-key"}).status_code
        == 201
    )


# --- database failure ------------------------------------------------------


def test_database_failure_returns_503_and_rolls_back(app, client, auth_headers, valid_payload, monkeypatch):
    before = _incident_count(app)

    def failing_commit():
        raise OperationalError("COMMIT", {}, Exception("connection lost"))

    with app.app_context():
        monkeypatch.setattr(db.session, "commit", failing_commit)
        res = _post(client, valid_payload, auth_headers)
        monkeypatch.undo()

    assert res.status_code == 503
    body = res.get_json()
    assert body["success"] is False
    assert "retry" in body["error"].lower()
    assert _incident_count(app) == before
    with app.app_context():
        assert GatewaySosMessage.query.count() == 0

    # A gateway retry after the outage succeeds with the same sequence.
    assert _post(client, valid_payload, auth_headers).status_code == 201


# --- duplicate / replayed sequence ----------------------------------------


def test_replayed_sequence_is_acknowledged_without_new_incident(app, client, auth_headers, valid_payload):
    first = _post(client, valid_payload, auth_headers)
    before = _incident_count(app)

    replay = _post(client, valid_payload, auth_headers)

    assert replay.status_code == 200
    body = replay.get_json()
    assert body["success"] is True
    assert body["duplicate"] is True
    assert body["message_id"] == first.get_json()["message_id"]
    assert body["incident_id"] == first.get_json()["incident_id"]
    assert _incident_count(app) == before


def test_same_sequence_from_different_device_is_not_a_replay(client, auth_headers, valid_payload):
    assert _post(client, valid_payload, auth_headers).status_code == 201
    res = _post(client, {**valid_payload, "device_id": "NODE_002"}, auth_headers)
    assert res.status_code == 201


def test_new_sequence_from_same_device_creates_incident(client, auth_headers, valid_payload):
    assert _post(client, valid_payload, auth_headers).status_code == 201
    assert _post(client, {**valid_payload, "sequence": 2}, auth_headers).status_code == 201


def test_sequence_reuse_after_dedupe_window_is_accepted(app, client, auth_headers, valid_payload):
    first_id = _post(client, valid_payload, auth_headers).get_json()["message_id"]
    with app.app_context():
        message = db.session.get(GatewaySosMessage, first_id)
        message.received_at = datetime.utcnow() - timedelta(seconds=301)
        db.session.commit()

    res = _post(client, valid_payload, auth_headers)
    assert res.status_code == 201
    assert res.get_json()["message_id"] != first_id


# --- regression: existing dashboard test SOS still works -------------------


def test_testing_sos_endpoint_unchanged(client):
    res = client.post("/api/v1/testing/sos", json={"category": "Rescue"})
    assert res.status_code == 201
    assert res.get_json()["category"] == "Rescue"
