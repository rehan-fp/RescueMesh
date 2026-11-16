import hmac
import logging
from functools import wraps

from flask import Blueprint, current_app, jsonify, request
from sqlalchemy.exc import SQLAlchemyError

from services.gateway_sos_service import (
    SosValidationError,
    ingest_gateway_sos,
    validate_gateway_payload,
)

logger = logging.getLogger("rescuemesh.gateway")

sos_bp = Blueprint("sos", __name__, url_prefix="/sos")

API_KEY_HEADER = "X-API-Key"
MAX_BODY_BYTES = 4096


def _error(status: int, message: str, details: dict = None):
    body = {"success": False, "error": message}
    if details:
        body["details"] = details
    return jsonify(body), status


def require_gateway_api_key(view):
    @wraps(view)
    def wrapper(*args, **kwargs):
        keys = current_app.config.get("GATEWAY_API_KEYS") or []
        if not keys:
            logger.error("Gateway SOS rejected: GATEWAY_API_KEY is not configured")
            return _error(503, "Gateway ingest is not configured")

        provided = request.headers.get(API_KEY_HEADER, "")
        if not provided or not any(
            hmac.compare_digest(provided.encode(), key.encode()) for key in keys
        ):
            logger.warning(
                "Gateway SOS rejected: %s API key from %s",
                "missing" if not provided else "invalid",
                request.remote_addr,
            )
            return _error(401, "Missing or invalid API key")
        return view(*args, **kwargs)

    return wrapper


@sos_bp.post("")
@require_gateway_api_key
def receive_sos():
    if request.content_length is not None and request.content_length > MAX_BODY_BYTES:
        return _error(413, f"Payload exceeds {MAX_BODY_BYTES} bytes")
    if not request.is_json:
        return _error(415, "Content-Type must be application/json")

    payload = request.get_json(silent=True)
    if payload is None:
        logger.warning("Gateway SOS rejected: malformed JSON from %s", request.remote_addr)
        return _error(400, "Malformed JSON body")

    try:
        sos = validate_gateway_payload(payload)
    except SosValidationError as exc:
        logger.warning("Gateway SOS rejected: validation failed %s", exc.errors)
        status = 400 if "body" in exc.errors else 422
        return _error(status, "Invalid SOS payload", exc.errors)

    # Server-controlled source classification:
    header_source = request.headers.get("X-Ingestion-Source", "").strip().upper()
    if header_source in ("API_TEST", "SIMULATION"):
        source = header_source
    else:
        # Default authenticated gateway traffic is genuine HARDWARE
        source = "HARDWARE"

    try:
        message, created = ingest_gateway_sos(sos, ingestion_source=source)
    except SQLAlchemyError:
        logger.exception(
            "Gateway SOS from %s seq=%s could not be stored", sos.device_id, sos.sequence
        )
        return _error(503, "Database unavailable, retry later")

    if not created:
        logger.info(
            "Duplicate gateway SOS ignored: device=%s seq=%s message_id=%s",
            sos.device_id,
            sos.sequence,
            message.id,
        )
        return (
            jsonify(
                {
                    "success": True,
                    "duplicate": True,
                    "message_id": message.id,
                    "incident_id": message.incident_id,
                    "message": "Duplicate SOS already received",
                }
            ),
            200,
        )

    incident = message.incident
    logger.info(
        "Gateway SOS ingested as %s: device=%s gateway=%s seq=%s category=%s priority=%s",
        incident.id,
        sos.device_id,
        sos.gateway_id,
        sos.sequence,
        sos.category,
        incident.ai_recommended_priority,
    )

    # Publish real-time event to connected dashboards
    try:
        from services.event_broadcaster import broadcast_incident_created
        broadcast_incident_created(incident)
    except Exception as exc:
        logger.warning("Could not broadcast new incident %s: %s", incident.id, exc)

    return (
        jsonify(
            {
                "success": True,
                "duplicate": False,
                "message_id": message.id,
                "incident_id": incident.id,
                "priority": incident.ai_recommended_priority,
                "message": "SOS received",
            }
        ),
        201,
    )
