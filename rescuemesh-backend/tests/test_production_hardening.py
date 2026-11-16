import pytest

from config import validate_production_config
from conftest import TestConfig
from app import create_app
from extensions import db
from models.user import User

PROTECTED_ROUTES = [
    ("get", "/api/v1/incidents"),
    ("get", "/api/v1/incidents/RM-00184"),
    ("post", "/api/v1/incidents/RM-00184/acknowledge"),
    ("post", "/api/v1/incidents/RM-00184/assign"),
    ("patch", "/api/v1/incidents/RM-00184/status"),
    ("post", "/api/v1/incidents/RM-00184/priority-override"),
    ("post", "/api/v1/incidents/RM-00184/reprioritize"),
    ("get", "/api/v1/teams"),
    ("post", "/api/v1/teams"),
    ("patch", "/api/v1/teams/TEAM-001"),
    ("delete", "/api/v1/teams/TEAM-001"),
    ("get", "/api/v1/devices"),
    ("get", "/api/v1/users"),
    ("post", "/api/v1/users"),
    ("patch", "/api/v1/users/USR-001/role"),
    ("patch", "/api/v1/users/USR-001/status"),
    ("post", "/api/v1/users/USR-001/reset-password"),
    ("patch", "/api/v1/users/USR-001"),
    ("get", "/api/v1/dashboard/summary"),
    ("get", "/api/v1/auth/me"),
    ("post", "/api/v1/auth/change-password"),
    ("post", "/api/v1/testing/sos"),
]


@pytest.mark.parametrize("method,path", PROTECTED_ROUTES)
def test_dashboard_routes_reject_unauthenticated_requests(anon_client, method, path):
    res = getattr(anon_client, method)(path, json={})
    assert res.status_code == 401
    assert res.get_json()["error"] == "Authentication required"


def test_invalid_token_is_rejected(anon_client):
    res = anon_client.get("/api/v1/incidents", headers={"Authorization": "Bearer not-a-jwt"})
    assert res.status_code == 401


def test_token_for_deleted_user_is_rejected(app, client):
    with app.app_context():
        db.session.delete(db.session.get(User, "USR-042"))
        db.session.commit()
    assert client.get("/api/v1/incidents").status_code == 401


def test_health_is_public_and_reports_rest_ingest(anon_client):
    res = anon_client.get("/api/v1/system/health")
    assert res.status_code == 200
    body = res.get_json()
    assert body["backend"] == "online"
    assert body["database"] == "online"
    assert body["ingest"] == "rest"
    assert body["ai"] in ("tabpfn", "loading", "unavailable")


def test_login_and_me_round_trip(anon_client):
    res = anon_client.post(
        "/api/v1/auth/login",
        json={"email": "fernando.op@rescuemesh.gov.lk", "password": "rescuemesh123"},
    )
    assert res.status_code == 200
    token = res.get_json()["access_token"]
    me = anon_client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200
    assert me.get_json()["email"] == "fernando.op@rescuemesh.gov.lk"


def test_wrong_password_is_rejected(anon_client):
    res = anon_client.post(
        "/api/v1/auth/login",
        json={"email": "fernando.op@rescuemesh.gov.lk", "password": "wrong-password"},
    )
    assert res.status_code == 401


def test_testing_sos_is_disabled_unless_enabled():
    class NoTestingConfig(TestConfig):
        ENABLE_TESTING_ENDPOINTS = False

    app = create_app(NoTestingConfig)
    try:
        from flask_jwt_extended import create_access_token

        with app.app_context():
            token = create_access_token(identity="USR-042")
        res = app.test_client().post(
            "/api/v1/testing/sos",
            json={"category": "Rescue"},
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 404
    finally:
        with app.app_context():
            db.session.remove()
            db.drop_all()


def test_demo_data_is_not_seeded_by_default():
    class NoSeedConfig(TestConfig):
        SEED_DEMO_DATA = False

    app = create_app(NoSeedConfig)
    try:
        with app.app_context():
            assert User.query.count() == 0
    finally:
        with app.app_context():
            db.session.remove()
            db.drop_all()


def _prod_config(**overrides):
    config = {
        "IS_PRODUCTION": True,
        "SECRET_KEY": "x" * 64,
        "JWT_SECRET_KEY": "y" * 64,
        "SQLALCHEMY_DATABASE_URI": "postgresql+psycopg://u:p@host/db",
        "SEED_DEMO_DATA": False,
        "ENABLE_TESTING_ENDPOINTS": False,
    }
    config.update(overrides)
    return config


def test_valid_production_config_passes():
    validate_production_config(_prod_config())


@pytest.mark.parametrize(
    "overrides",
    [
        {"SECRET_KEY": "rescuemesh-dev-secret-change-me"},
        {"JWT_SECRET_KEY": "rescuemesh-jwt-secret-change-me"},
        {"SQLALCHEMY_DATABASE_URI": "sqlite:///rescuemesh.db"},
        {"SEED_DEMO_DATA": True},
        {"ENABLE_TESTING_ENDPOINTS": True},
    ],
)
def test_unsafe_production_config_is_refused(overrides):
    with pytest.raises(RuntimeError):
        validate_production_config(_prod_config(**overrides))


def test_ai_health_reports_genuine_tabpfn(anon_client):
    res = anon_client.get("/api/v1/system/ai")
    body = res.get_json()
    assert res.status_code == 200, body
    assert body["prediction_source"] == "tabpfn"
    assert body["model_loaded"] is True
    assert body["versions"]["tabpfn"] == "0.1.11"


def test_fallback_is_never_labelled_as_tabpfn(monkeypatch):
    from ai.model_service import FALLBACK_MODEL_NAME, TabPFNModelService

    service = TabPFNModelService()
    monkeypatch.setattr(service, "_ensure_loaded", lambda: False)
    priority, source, factors = service.predict("Medical", "High", 5, 30.0)
    assert source == "fallback"
    assert factors["predictionSource"] == "fallback"
    assert factors["aiModel"] == FALLBACK_MODEL_NAME
    assert "TabPFN" not in factors["aiModel"].replace("TabPFN unavailable", "")
