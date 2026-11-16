import pytest
from flask_jwt_extended import create_access_token

from extensions import db
from models.incident import Incident
from models.rescue_team import RescueTeam
from models.user import User


@pytest.fixture
def admin_client(app):
    with app.app_context():
        token = create_access_token(identity="USR-001")
    test_client = app.test_client()
    test_client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return test_client


@pytest.fixture
def operator_client(app):
    with app.app_context():
        token = create_access_token(identity="USR-042")
    test_client = app.test_client()
    test_client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return test_client


@pytest.fixture
def viewer_client(app):
    with app.app_context():
        token = create_access_token(identity="USR-088")
    test_client = app.test_client()
    test_client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return test_client


def test_list_teams_authenticated(admin_client):
    res = admin_client.get("/api/v1/teams")
    assert res.status_code == 200
    teams = res.get_json()
    assert isinstance(teams, list)


def test_viewer_cannot_create_team(viewer_client):
    res = viewer_client.post(
        "/api/v1/teams",
        json={
            "name": "Unauthorized Team",
            "type": "Rescue",
            "baseLocation": "Colombo",
        },
    )
    assert res.status_code == 403
    assert "Insufficient permissions" in res.get_json()["error"]


def test_admin_can_create_response_team(admin_client):
    res = admin_client.post(
        "/api/v1/teams",
        json={
            "name": "Colombo Response Team Alpha",
            "type": "Rescue",
            "baseLocation": "Colombo",
            "teamLead": "N. Perera",
            "contactPhone": "071 234 5678",
            "status": "Available",
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["name"] == "Colombo Response Team Alpha"
    assert data["type"] == "Rescue"
    assert data["status"] == "Available"
    assert data["baseLocation"] == "Colombo"
    assert data["latitude"] == pytest.approx(6.9271, abs=0.01)
    assert data["longitude"] == pytest.approx(79.8612, abs=0.01)
    assert data["id"].startswith("TEAM-")


def test_create_team_requires_name(admin_client):
    res = admin_client.post(
        "/api/v1/teams",
        json={
            "name": "",
            "type": "Medical",
        },
    )
    assert res.status_code == 400
    assert "Team name is required" in res.get_json()["error"]


def test_update_team_status(admin_client):
    # First create team
    res_create = admin_client.post(
        "/api/v1/teams",
        json={
            "name": "Kelaniya Medical Unit",
            "type": "Medical",
            "baseLocation": "Kelaniya",
        },
    )
    team_id = res_create.get_json()["id"]

    # Update to Unavailable
    res_patch = admin_client.patch(
        f"/api/v1/teams/{team_id}",
        json={"status": "Unavailable"},
    )
    assert res_patch.status_code == 200
    assert res_patch.get_json()["status"] == "Unavailable"

    # Update back to Available
    res_patch2 = admin_client.patch(
        f"/api/v1/teams/{team_id}",
        json={"status": "Available"},
    )
    assert res_patch2.status_code == 200
    assert res_patch2.get_json()["status"] == "Available"


def test_double_assignment_prevention(app, admin_client):
    with app.app_context():
        # Create team
        team = RescueTeam(
            id="TEAM-TEST-01",
            name="Rapid Boat Team 01",
            type="Rescue",
            status="Available",
            base_location="Gampaha",
            latitude=7.0840,
            longitude=79.9943,
        )
        db.session.add(team)

        # Create two test incidents
        inc1 = Incident(
            id="RM-TEST-001",
            device_id="DEV_01",
            gateway_id="GW_01",
            category="Rescue",
            latitude=7.09,
            longitude=79.99,
            location_name="Ja-Ela",
            risk_zone="High",
            nearby_sos_count=1,
            sequence_number=1001,
            ai_recommended_priority="High",
            operational_priority="High",
            status="New",
        )
        inc2 = Incident(
            id="RM-TEST-002",
            device_id="DEV_02",
            gateway_id="GW_01",
            category="Medical",
            latitude=7.10,
            longitude=79.98,
            location_name="Wattala",
            risk_zone="Medium",
            nearby_sos_count=1,
            sequence_number=1002,
            ai_recommended_priority="Medium",
            operational_priority="Medium",
            status="New",
        )
        db.session.add(inc1)
        db.session.add(inc2)
        db.session.commit()

    # Assign team to incident 1
    res1 = admin_client.post(
        "/api/v1/incidents/RM-TEST-001/assign",
        json={"team_id": "TEAM-TEST-01"},
    )
    assert res1.status_code == 200

    # Attempt to assign the SAME team to incident 2 while responding
    res2 = admin_client.post(
        "/api/v1/incidents/RM-TEST-002/assign",
        json={"team_id": "TEAM-TEST-01"},
    )
    assert res2.status_code == 409
    err = res2.get_json()["error"]
    assert "currently responding to emergency" in err


def test_deactivate_team_with_history(app, admin_client):
    with app.app_context():
        team = RescueTeam(
            id="TEAM-HIST-01",
            name="Historic Medical Team",
            type="Medical",
            status="Available",
            base_location="Colombo",
            latitude=6.9271,
            longitude=79.8612,
        )
        inc = Incident(
            id="RM-TEST-HIST",
            device_id="DEV_03",
            gateway_id="GW_01",
            category="Medical",
            latitude=6.93,
            longitude=79.86,
            location_name="Colombo 03",
            risk_zone="Low",
            nearby_sos_count=1,
            sequence_number=1003,
            ai_recommended_priority="Low",
            operational_priority="Low",
            status="Resolved",
            assigned_team_id="TEAM-HIST-01",
        )
        db.session.add(team)
        db.session.add(inc)
        db.session.commit()

    # Attempt to delete team with history - should safely deactivate
    res = admin_client.delete("/api/v1/teams/TEAM-HIST-01")
    assert res.status_code == 200
    data = res.get_json()
    assert data.get("deactivated") is True
    assert data["team"]["status"] == "Unavailable"
