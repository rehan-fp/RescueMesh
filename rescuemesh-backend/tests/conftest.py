import os
import sys

# Must be set before config/app are imported so the module-level app never
# touches the developer's real DATABASE_URL.
os.environ["DATABASE_URL"] = "sqlite://"
os.environ["GATEWAY_API_KEY"] = "test-gateway-key"

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest  # noqa: E402
from flask_jwt_extended import create_access_token  # noqa: E402

from app import create_app  # noqa: E402
from config import Config  # noqa: E402
from extensions import db  # noqa: E402

API_KEY = "test-gateway-key"


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite://"
    GATEWAY_API_KEYS = [API_KEY]
    SOS_DEDUP_WINDOW_SECONDS = 300
    SEED_DEMO_DATA = True
    ENABLE_TESTING_ENDPOINTS = True


@pytest.fixture
def app():
    app = create_app(TestConfig)
    yield app
    with app.app_context():
        db.session.remove()
        db.drop_all()


@pytest.fixture
def anon_client(app):
    return app.test_client()


@pytest.fixture
def client(app):
    """Test client signed in as a seeded operator (dashboard routes require a JWT)."""
    with app.app_context():
        token = create_access_token(identity="USR-042")
    test_client = app.test_client()
    test_client.environ_base["HTTP_AUTHORIZATION"] = f"Bearer {token}"
    return test_client


@pytest.fixture
def auth_headers():
    return {"X-API-Key": API_KEY}


@pytest.fixture
def valid_payload():
    return {
        "device_id": "NODE_001",
        "category": "MEDICAL",
        "latitude": 6.9271,
        "longitude": 79.8612,
        "battery": 85,
        "gps_status": True,
        "sequence": 1,
    }
