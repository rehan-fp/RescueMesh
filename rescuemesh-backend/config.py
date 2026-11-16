import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _database_url() -> str:
    url = os.getenv("DATABASE_URL", "sqlite:///rescuemesh.db")
    # Hosted providers (e.g. Railway) hand out postgres:// URLs; SQLAlchemy needs the psycopg 3 driver name.
    for prefix in ("postgres://", "postgresql://"):
        if url.startswith(prefix):
            return "postgresql+psycopg://" + url[len(prefix):]
    return url


def _env_flag(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


class Config:
    APP_ENV = os.getenv("APP_ENV", "development").strip().lower()
    IS_PRODUCTION = APP_ENV == "production"

    SECRET_KEY = os.getenv("SECRET_KEY", "rescuemesh-dev-secret-change-me")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "rescuemesh-jwt-secret-change-me")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=12)

    # Prefer hosted PostgreSQL for the final project, e.g.:
    # DATABASE_URL=postgresql+psycopg://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require
    # SQLite remains the local Stage 1 fallback.
    SQLALCHEMY_DATABASE_URI = _database_url()
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}

    # ESP32 gateway → POST /api/v1/sos. Comma-separated to allow key rotation.
    GATEWAY_API_KEYS = [
        key.strip() for key in os.getenv("GATEWAY_API_KEY", "").split(",") if key.strip()
    ]
    # Same device + sequence + category within this window is treated as a replay.
    SOS_DEDUP_WINDOW_SECONDS = int(os.getenv("SOS_DEDUP_WINDOW_SECONDS", "300"))

    CORS_ORIGINS = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:3000,http://127.0.0.1:3000",
        ).split(",")
        if origin.strip()
    ]

    # Demo users/teams/devices/incidents are only for local development.
    SEED_DEMO_DATA = _env_flag("SEED_DEMO_DATA", default=False)
    # POST /api/v1/testing/sos fabricates incidents; never enable in production.
    ENABLE_TESTING_ENDPOINTS = _env_flag("ENABLE_TESTING_ENDPOINTS", default=False)

    # SLIIT Exhibition venue GPS fallback configuration (optional, disabled by default)
    EXHIBITION_MODE = _env_flag("EXHIBITION_MODE", default=False)
    EXHIBITION_VENUE_NAME = os.getenv(
        "EXHIBITION_VENUE_NAME",
        "Sri Lanka Institute of Information Technology",
    )
    EXHIBITION_VENUE_DISPLAY_NAME = os.getenv(
        "EXHIBITION_VENUE_DISPLAY_NAME",
        "SLIIT Malabe Campus",
    )
    EXHIBITION_VENUE_ADDRESS = os.getenv(
        "EXHIBITION_VENUE_ADDRESS",
        "New Kandy Road, Malabe 10115, Sri Lanka",
    )
    EXHIBITION_VENUE_LATITUDE = float(os.getenv("EXHIBITION_VENUE_LATITUDE", "6.914678"))
    EXHIBITION_VENUE_LONGITUDE = float(os.getenv("EXHIBITION_VENUE_LONGITUDE", "79.972946"))
    EXHIBITION_VENUE_LOCALITY = os.getenv("EXHIBITION_VENUE_LOCALITY", "Malabe")
    EXHIBITION_VENUE_DISTRICT = os.getenv("EXHIBITION_VENUE_DISTRICT", "Colombo District")


def validate_production_config(config) -> None:
    if not config.get("IS_PRODUCTION"):
        return
    problems = []
    if "change-me" in config["SECRET_KEY"]:
        problems.append("SECRET_KEY")
    if "change-me" in config["JWT_SECRET_KEY"]:
        problems.append("JWT_SECRET_KEY")
    if config["SQLALCHEMY_DATABASE_URI"].startswith("sqlite"):
        problems.append("DATABASE_URL (SQLite is not allowed in production)")
    if config.get("SEED_DEMO_DATA"):
        problems.append("SEED_DEMO_DATA must be false")
    if config.get("ENABLE_TESTING_ENDPOINTS"):
        problems.append("ENABLE_TESTING_ENDPOINTS must be false")
    if problems:
        raise RuntimeError("Unsafe production configuration: " + ", ".join(problems))
