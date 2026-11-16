"""
Server-Sent Events (SSE) route for real-time dashboard updates.

Endpoint: GET /api/v1/events/stream
Protected by JWT authentication via ?token=<jwt> or Authorization header.
"""
import logging
import queue
import time
from datetime import datetime

from flask import Blueprint, Response, current_app, jsonify, request
from flask_jwt_extended import decode_token
from flask_jwt_extended.exceptions import JWTExtendedException

from extensions import db
from models.user import User
from services.event_broadcaster import broadcaster

logger = logging.getLogger("rescuemesh.events")

events_bp = Blueprint("events", __name__, url_prefix="/events")


def _get_authenticated_user_id() -> str:
    """Extract and validate the JWT token from query param or header."""
    token = request.args.get("token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()

    if not token:
        return None

    try:
        decoded = decode_token(token)
        user_id = decoded.get("sub")
        # Verify user still exists in database and is not disabled
        user = db.session.get(User, user_id)
        if not user or user.status == "Disabled":
            return None
        return user_id
    except (JWTExtendedException, Exception) as exc:
        logger.warning("SSE authentication failed: %s", exc)
        return None


@events_bp.get("/stream")
def sse_stream():
    """
    Real-time Server-Sent Events stream for operational dashboards.
    Sends incident.created, incident.updated, and 15s heartbeats.
    """
    user_id = _get_authenticated_user_id()
    if not user_id:
        return jsonify({"error": "Authentication required for live stream"}), 401

    def event_generator():
        client_queue = broadcaster.subscribe()
        try:
            # 1. Initial handshake event
            now_iso = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
            initial_msg = (
                f"event: connected\n"
                f'data: {{"status": "connected", "server_time": "{now_iso}"}}\n\n'
            )
            yield initial_msg

            # 2. Event loop with periodic heartbeats
            while True:
                try:
                    # Wait up to 15 seconds for a message
                    message = client_queue.get(timeout=15.0)
                    if message is None:
                        break
                    yield message
                except queue.Empty:
                    # Send comment heartbeat to keep connection alive and detect dropped clients
                    heartbeat_time = datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ")
                    yield f": ping {heartbeat_time}\n\n"
        except GeneratorExit:
            logger.debug("SSE client closed connection")
        except Exception as exc:
            logger.warning("SSE generator error: %s", exc)
        finally:
            broadcaster.unsubscribe(client_queue)

    response = Response(
        event_generator(),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": request.headers.get("Origin", "*"),
            "Access-Control-Allow-Credentials": "true",
        },
    )
    return response


@events_bp.get("/status")
def sse_status():
    """Public health status check for the SSE subsystem."""
    return jsonify({
        "status": "online",
        "service": "RescueMesh Real-Time Event Stream",
        "subscribers": len(broadcaster._subscribers),
        "timestamp": datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"),
    })
