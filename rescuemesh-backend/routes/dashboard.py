from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from models.device import Device
from models.incident import Incident
from models.rescue_team import RescueTeam

dashboard_bp = Blueprint("dashboard", __name__, url_prefix="/dashboard")


@dashboard_bp.get("/summary")
@jwt_required()
def summary():
    source_param = request.args.get("source", "HARDWARE").strip().upper()
    query = Incident.query
    if source_param != "ALL":
        query = query.filter(Incident.ingestion_source == source_param)

    incidents = query.all()
    teams = RescueTeam.query.all()
    devices = Device.query.all()

    by_status = {}
    by_priority = {}
    for incident in incidents:
        by_status[incident.status] = by_status.get(incident.status, 0) + 1
        by_priority[incident.operational_priority] = (
            by_priority.get(incident.operational_priority, 0) + 1
        )

    return jsonify(
        {
            "totalIncidents": len(incidents),
            "activeIncidents": sum(
                1 for i in incidents if i.status not in ("Resolved",)
            ),
            "criticalIncidents": by_priority.get("Critical", 0),
            "newIncidents": by_status.get("New", 0),
            "availableTeams": sum(1 for t in teams if t.status == "Available"),
            "onlineDevices": sum(1 for d in devices if d.status == "Online"),
            "byStatus": by_status,
            "byPriority": by_priority,
        }
    )
