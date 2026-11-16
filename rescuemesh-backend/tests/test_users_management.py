import pytest
from flask_jwt_extended import create_access_token
from models.user import User


@pytest.fixture
def admin_client(app):
    with app.app_context():
        token = create_access_token(identity="USR-001")
    test_client = app.test_client()
    test_client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return test_client


def test_list_users_authenticated(client):
    res = client.get("/api/v1/users")
    assert res.status_code == 200
    users = res.get_json()
    assert isinstance(users, list)
    assert len(users) >= 4
    for u in users:
        assert "password_hash" not in u
        assert "id" in u
        assert "name" in u
        assert "email" in u
        assert "role" in u


def test_non_admin_cannot_create_user(client):
    res = client.post(
        "/api/v1/users",
        json={
            "name": "Unauthorized User",
            "email": "unauth@rescuemesh.gov.lk",
            "role": "Viewer",
        },
    )
    assert res.status_code == 403
    assert "Administrator privilege required" in res.get_json()["error"]


def test_admin_can_create_user(admin_client):
    res = admin_client.post(
        "/api/v1/users",
        json={
            "name": "Jane Dispatcher",
            "email": "jane.dispatcher@rescuemesh.gov.lk",
            "role": "Emergency Operator",
            "station": "Western Emergency Command Center",
        },
    )
    assert res.status_code == 201
    data = res.get_json()
    assert data["user"]["name"] == "Jane Dispatcher"
    assert data["user"]["role"] == "Emergency Operator"
    assert data["user"]["status"] == "Active"
    assert data["generatedPassword"] is not None


def test_duplicate_email_rejected(admin_client):
    res = admin_client.post(
        "/api/v1/users",
        json={
            "name": "Admin Clone",
            "email": "rescumeshadmin@gmail.com",
            "role": "Emergency Operator",
        },
    )
    assert res.status_code == 409
    assert "already exists" in res.get_json()["error"]


def test_change_role_safeguard_protects_last_admin(admin_client, app):
    # Demote first admin (Dr. Rohan Perera, USR-010) to Viewer
    res1 = admin_client.patch(
        "/api/v1/users/USR-010/role",
        json={"role": "Viewer"},
    )
    assert res1.status_code == 200
    assert res1.get_json()["user"]["role"] == "Viewer"

    # Now USR-001 is the only remaining active Administrator
    # Attempting to demote USR-001 must fail
    res2 = admin_client.patch(
        "/api/v1/users/USR-001/role",
        json={"role": "Emergency Operator"},
    )
    assert res2.status_code == 400
    assert "last active Administrator" in res2.get_json()["error"]


def test_status_toggle_and_deactivated_login_block(admin_client, anon_client):
    # Deactivate an operator
    res = admin_client.patch(
        "/api/v1/users/USR-042/status",
        json={"status": "Disabled"},
    )
    assert res.status_code == 200
    assert res.get_json()["user"]["status"] == "Disabled"

    # Verify deactivated user cannot log in
    login_res = anon_client.post(
        "/api/v1/auth/login",
        json={"email": "fernando.op@rescuemesh.gov.lk", "password": "rescuemesh123"},
    )
    assert login_res.status_code == 403
    assert "deactivated" in login_res.get_json()["error"]

    # Reactivate the operator
    res2 = admin_client.patch(
        "/api/v1/users/USR-042/status",
        json={"status": "Active"},
    )
    assert res2.status_code == 200
    assert res2.get_json()["user"]["status"] == "Active"

    # Verify they can log in again
    login_res2 = anon_client.post(
        "/api/v1/auth/login",
        json={"email": "fernando.op@rescuemesh.gov.lk", "password": "rescuemesh123"},
    )
    assert login_res2.status_code == 200


def test_deactivate_safeguard_protects_last_admin(admin_client):
    # Demote Dr. Rohan first so only USR-001 is active admin
    admin_client.patch("/api/v1/users/USR-010/role", json={"role": "Viewer"})

    # Try to deactivate USR-001
    res = admin_client.patch(
        "/api/v1/users/USR-001/status",
        json={"status": "Disabled"},
    )
    assert res.status_code == 400
    assert "Cannot deactivate the last active Administrator" in res.get_json()["error"]


def test_reset_password_by_admin(admin_client, anon_client):
    res = admin_client.post(
        "/api/v1/users/USR-088/reset-password",
        json={"password": "newSecurePassword123"},
    )
    assert res.status_code == 200

    # User USR-088 logs in with new password
    login_res = anon_client.post(
        "/api/v1/auth/login",
        json={"email": "kavinda.j@redcross.lk", "password": "newSecurePassword123"},
    )
    assert login_res.status_code == 200


def test_user_can_change_own_password(client, anon_client):
    # USR-042 (Fernando M N) changes their own password
    fail_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "wrongpassword", "new_password": "updatedPassword2026"},
    )
    assert fail_res.status_code == 400
    assert "Current password is incorrect" in fail_res.get_json()["error"]

    short_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "rescuemesh123", "new_password": "123"},
    )
    assert short_res.status_code == 400
    assert "at least 6 characters" in short_res.get_json()["error"]

    ok_res = client.post(
        "/api/v1/auth/change-password",
        json={"current_password": "rescuemesh123", "new_password": "updatedPassword2026"},
    )
    assert ok_res.status_code == 200

    login_res = anon_client.post(
        "/api/v1/auth/login",
        json={"email": "fernando.op@rescuemesh.gov.lk", "password": "updatedPassword2026"},
    )
    assert login_res.status_code == 200

