import logging
from datetime import datetime

from flask import Blueprint, jsonify
from sqlalchemy import text

from ai.model_service import get_model_service
from extensions import db
from models.incident import Incident
from services.gateway_sos_service import last_gateway_message

logger = logging.getLogger("rescuemesh.system")

system_bp = Blueprint("system", __name__, url_prefix="/system")

GATEWAY_ONLINE_SECONDS = 300


@system_bp.get("/health")
def health():
    database_status = "offline"
    gateway_status = "standby"
    last_packet_at = None
    try:
        db.session.execute(text("SELECT 1"))
        database_status = "online"

        last_message = last_gateway_message()
        if last_message:
            last_packet_at = last_message.received_at.isoformat() + "Z"
            age = (datetime.utcnow() - last_message.received_at).total_seconds()
            if age <= GATEWAY_ONLINE_SECONDS:
                gateway_status = "online"
        else:
            latest = Incident.query.order_by(Incident.received_at.desc()).first()
            if latest and latest.received_at:
                last_packet_at = latest.received_at.isoformat()
    except Exception as exc:
        db.session.rollback()
        logger.error("Health check database query failed: %s", exc)

    model_service = get_model_service()
    if model_service.is_loaded:
        ai_status = "tabpfn"
    elif model_service.load_error:
        ai_status = "unavailable"
    else:
        ai_status = "loading"

    return jsonify(
        {
            "backend": "online",
            "database": database_status,
            # Kept for dashboard compatibility; gateway uplink is now REST (POST /api/v1/sos).
            "mqtt": "disabled",
            "ingest": "rest",
            "gateway": gateway_status,
            "ai": ai_status,
            "last_packet_at": last_packet_at,
            "checked_at": datetime.utcnow().isoformat() + "Z",
        }
    )


@system_bp.get("/ai")
def ai_health():
    report = get_model_service().health_check()
    return jsonify(report), 200 if report["prediction_source"] == "tabpfn" else 503
