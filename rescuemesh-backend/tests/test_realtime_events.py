import json
import pytest
from services.event_broadcaster import broadcaster, broadcast_incident_created, broadcast_incident_updated
from models.incident import Incident


def test_broadcaster_subscribe_publish_unsubscribe():
    sub = broadcaster.subscribe()
    assert sub in broadcaster._subscribers

    delivered = broadcaster.publish("test.event", {"hello": "world"})
    assert delivered >= 1

    msg = sub.get_nowait()
    assert "event: test.event" in msg
    assert '"hello": "world"' in msg

    broadcaster.unsubscribe(sub)
    assert sub not in broadcaster._subscribers


def test_sse_stream_requires_auth(anon_client):
    resp = anon_client.get("/api/v1/events/stream")
    assert resp.status_code == 401
    assert "Authentication required" in resp.get_json()["error"]


def test_sse_status_endpoint(anon_client):
    resp = anon_client.get("/api/v1/events/status")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "online"
    assert "subscribers" in data


def test_sos_ingestion_publishes_event_and_duplicate_does_not(client, auth_headers, valid_payload):
    sub = broadcaster.subscribe()
    try:
        # First SOS -> Genuine new incident -> Must broadcast incident.created
        resp = client.post("/api/v1/sos", json=valid_payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["duplicate"] is False
        new_id = data["incident_id"]

        # Check broadcaster queue
        msg = sub.get_nowait()
        assert "event: incident.created" in msg
        parsed = json.loads(msg.split("data: ")[1].strip())
        assert parsed["data"]["incident_id"] == new_id
        assert parsed["data"]["category"] == "Medical"

        # Second SOS with same device and sequence -> Duplicate -> Must NOT broadcast
        resp_dup = client.post("/api/v1/sos", json=valid_payload, headers=auth_headers)
        assert resp_dup.status_code == 200
        assert resp_dup.get_json()["duplicate"] is True

        # Queue should be empty now!
        assert sub.empty()
    finally:
        broadcaster.unsubscribe(sub)


def test_incident_status_change_publishes_updated_event(client):
    sub = broadcaster.subscribe()
    try:
        # Get an incident via API
        list_resp = client.get("/api/v1/incidents")
        assert list_resp.status_code == 200
        incidents = list_resp.get_json()
        assert len(incidents) > 0
        inc_id = incidents[0]["id"]

        resp = client.patch(
            f"/api/v1/incidents/{inc_id}/status",
            json={"status": "Acknowledged", "notes": "Operator acknowledged via dashboard"},
        )
        assert resp.status_code == 200

        msg = sub.get_nowait()
        assert "event: incident.updated" in msg
        parsed = json.loads(msg.split("data: ")[1].strip())
        assert parsed["data"]["incident_id"] == inc_id
        assert parsed["data"]["status"] == "Acknowledged"
    finally:
        broadcaster.unsubscribe(sub)
