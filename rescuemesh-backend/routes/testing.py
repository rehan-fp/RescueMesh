from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import jwt_required

from routes.incidents import create_testing_sos

testing_bp = Blueprint("testing", __name__, url_prefix="/testing")


@testing_bp.post("/sos")
@jwt_required()
def testing_sos():
    if not current_app.config.get("ENABLE_TESTING_ENDPOINTS"):
        return jsonify({"error": "Testing endpoints are disabled"}), 404
    return create_testing_sos(ingestion_source="API_TEST")


@testing_bp.post("/simulation")
@jwt_required()
def simulation_sos():
    if not current_app.config.get("ENABLE_TESTING_ENDPOINTS"):
        return jsonify({"error": "Testing endpoints are disabled"}), 404
    return create_testing_sos(ingestion_source="SIMULATION")
