from datetime import datetime
from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from models.rescue_team import RescueTeam
from models.user import User

teams_bp = Blueprint("teams", __name__, url_prefix="/teams")

BASE_COORDINATES = {
    "colombo": (6.9271, 79.8612),
    "gampaha": (7.0840, 79.9943),
    "kalutara": (6.5854, 79.9607),
    "kelaniya": (6.9538, 79.9142),
    "kaduwela": (6.9333, 79.9833),
    "malabe": (6.9042, 79.9547),
    "ratnapura": (6.6828, 80.3992),
    "kandy": (7.2906, 80.6337),
    "galle": (6.0535, 80.2210),
    "negombo": (7.2008, 79.8736),
    "matara": (5.9549, 80.5550),
    "kurunegala": (7.4863, 80.3623),
}


def _get_current_user_and_check_roles(allowed_roles=None):
    """Verify caller is active and holds one of the required roles."""
    user_id = get_jwt_identity()
    user = User.query.get(user_id)
    if not user or user.status == "Disabled":
        return None, (jsonify({"error": "Unauthorized or inactive account"}), 401)
    if allowed_roles and user.role not in allowed_roles:
        return None, (
            jsonify({"error": "Insufficient permissions for response team operation"}),
            403,
        )
    return user, None


@teams_bp.get("")
@jwt_required()
def list_teams():
    """List all response teams."""
    teams = RescueTeam.query.order_by(RescueTeam.id.asc()).all()
    return jsonify([team.to_dict() for team in teams])


@teams_bp.get("/<team_id>")
@jwt_required()
def get_team(team_id: str):
    """Get single response team details."""
    team = RescueTeam.query.get(team_id)
    if not team:
        return jsonify({"error": "Response team not found"}), 404
    return jsonify(team.to_dict())


@teams_bp.post("")
@jwt_required()
def create_team():
    """Add a new response team (Admin or Response Coordinator only)."""
    user, err = _get_current_user_and_check_roles(
        ["Administrator", "Response Coordinator", "Rescue Coordinator"]
    )
    if err:
        return err

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Team name is required"}), 400

    team_type = (data.get("type") or "Rescue").strip()
    base_location = (data.get("baseLocation") or data.get("base_location") or "Colombo").strip()
    team_lead = (data.get("teamLead") or data.get("team_lead") or "").strip()
    contact_phone = (data.get("contactPhone") or data.get("contact_phone") or "").strip()
    status = (data.get("status") or "Available").strip()

    # Normalize status to standard values
    if status.lower() in ("available", "ready"):
        status = "Available"
    elif status.lower() in ("unavailable", "offline", "standby", "off duty"):
        status = "Unavailable"
    elif status.lower() in ("assigned",):
        status = "Assigned"
    elif status.lower() in ("responding", "in progress"):
        status = "In Progress"
    else:
        status = "Available"

    # Resolve coordinates
    lat = data.get("latitude")
    lng = data.get("longitude")
    if lat is None or lng is None:
        coords = BASE_COORDINATES.get(base_location.lower(), (6.9271, 79.8612))
        lat, lng = coords

    try:
        lat = float(lat)
        lng = float(lng)
    except (TypeError, ValueError):
        lat, lng = (6.9271, 79.8612)

    # Generate sequential identifier TEAM-001, TEAM-002, etc.
    all_teams = RescueTeam.query.all()
    existing_ids = {t.id for t in all_teams}
    idx = len(all_teams) + 1
    team_id = f"TEAM-{idx:03d}"
    while team_id in existing_ids:
        idx += 1
        team_id = f"TEAM-{idx:03d}"

    team = RescueTeam(
        id=team_id,
        name=name,
        type=team_type,
        status=status,
        base_location=base_location,
        latitude=lat,
        longitude=lng,
        team_lead=team_lead,
        contact_phone=contact_phone,
        completed_incidents_today=0,
        current_assignments_count=0,
        last_update="Just now",
    )
    db.session.add(team)
    db.session.commit()

    return jsonify(team.to_dict()), 201


@teams_bp.patch("/<team_id>")
@jwt_required()
def update_team(team_id: str):
    """Update team details, capability, or availability status."""
    user, err = _get_current_user_and_check_roles(
        ["Administrator", "Response Coordinator", "Rescue Coordinator", "Emergency Operator"]
    )
    if err:
        return err

    team = RescueTeam.query.get(team_id)
    if not team:
        return jsonify({"error": "Response team not found"}), 404

    data = request.get_json(silent=True) or {}

    # If updating operational fields (name, type, location), ensure Admin or Coordinator
    if any(k in data for k in ("name", "type", "baseLocation", "base_location", "teamLead", "team_lead")):
        if user.role not in ("Administrator", "Response Coordinator", "Rescue Coordinator"):
            return jsonify({"error": "Only Administrators and Response Coordinators can edit team profiles"}), 403

    if "name" in data and data["name"]:
        team.name = str(data["name"]).strip()
    if "type" in data and data["type"]:
        team.type = str(data["type"]).strip()
    if "baseLocation" in data or "base_location" in data:
        loc = (data.get("baseLocation") or data.get("base_location") or "").strip()
        if loc:
            team.base_location = loc
            # update coordinates if not explicitly provided
            if "latitude" not in data and "longitude" not in data:
                coords = BASE_COORDINATES.get(loc.lower())
                if coords:
                    team.latitude, team.longitude = coords
    if "teamLead" in data or "team_lead" in data:
        team.team_lead = (data.get("teamLead") or data.get("team_lead") or "").strip()
    if "contactPhone" in data or "contact_phone" in data:
        team.contact_phone = (data.get("contactPhone") or data.get("contact_phone") or "").strip()

    if "latitude" in data and "longitude" in data:
        try:
            team.latitude = float(data["latitude"])
            team.longitude = float(data["longitude"])
        except (TypeError, ValueError):
            pass

    if "status" in data:
        raw_status = str(data["status"]).strip()
        if raw_status.lower() in ("available", "ready"):
            # Check if team is currently actively responding
            if team.status in ("Assigned", "In Progress") and team.current_incident_id:
                return (
                    jsonify({
                        "error": f"Cannot set team to Available while responding to incident {team.current_incident_code or team.current_incident_id}. Resolve or reassign the incident first."
                    }),
                    409,
                )
            team.status = "Available"
        elif raw_status.lower() in ("unavailable", "offline", "standby", "off duty"):
            if team.status in ("Assigned", "In Progress") and team.current_incident_id:
                return (
                    jsonify({
                        "error": f"Cannot mark team as Unavailable while responding to active incident {team.current_incident_code or team.current_incident_id}."
                    }),
                    409,
                )
            team.status = "Unavailable"
        elif raw_status in ("Assigned", "In Progress"):
            team.status = raw_status

    team.last_update = "Just now"
    team.updated_at = datetime.utcnow()
    db.session.commit()

    return jsonify(team.to_dict())


@teams_bp.delete("/<team_id>")
@jwt_required()
def delete_or_deactivate_team(team_id: str):
    """
    Remove or deactivate a response team (Admin only).
    If the team has historical incident assignments, it is safely deactivated to preserve audit records.
    """
    user, err = _get_current_user_and_check_roles(["Administrator"])
    if err:
        return err

    team = RescueTeam.query.get(team_id)
    if not team:
        return jsonify({"error": "Response team not found"}), 404

    # Prevent deleting if actively responding
    if team.status in ("Assigned", "In Progress") and team.current_incident_id:
        return (
            jsonify({
                "error": f"Cannot remove team {team.name} because it is currently responding to emergency {team.current_incident_code or team.current_incident_id}."
            }),
            409,
        )

    # Check for historical incident assignments
    from models.incident import Incident
    has_history = Incident.query.filter_by(assigned_team_id=team.id).first() is not None

    if has_history:
        # Deactivate team to preserve historical incident records
        team.status = "Unavailable"
        team.last_update = "Deactivated"
        team.updated_at = datetime.utcnow()
        db.session.commit()
        return jsonify({
            "message": f"Team {team.name} has historical incident assignments and was deactivated to preserve operational records.",
            "team": team.to_dict(),
            "deactivated": True,
        })
    else:
        # Safe hard delete if no historical assignments exist
        db.session.delete(team)
        db.session.commit()
        return jsonify({
            "message": f"Team {team.name} was successfully removed.",
            "deleted": True,
        })

