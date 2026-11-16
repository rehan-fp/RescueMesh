from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from extensions import db
from models.incident import Incident
from models.rescue_team import RescueTeam
from models.timeline import TimelineEntry
from models.user import User
from services.incident_ingest import create_incident_from_sos

incidents_bp = Blueprint("incidents", __name__, url_prefix="/incidents")


def _now() -> datetime:
    return datetime.utcnow()


def _time_str(dt: datetime = None) -> str:
    return (dt or _now()).strftime("%Y-%m-%dT%H:%M:%SZ")


def _current_operator_name() -> str:
    user_id = get_jwt_identity()
    if user_id:
        user = User.query.get(user_id)
        if user:
            return user.name
    return "Emergency Operator"


def _add_timeline(incident: Incident, status: str, operator: str, note: str) -> None:
    incident.timeline_entries.append(
        TimelineEntry(
            status=status,
            timestamp=_time_str(),
            operator=operator,
            note=note,
        )
    )


@incidents_bp.get("")
@jwt_required()
def list_incidents():
    # Source filter: defaults to genuine operational emergencies (HARDWARE)
    source_param = request.args.get("source", "HARDWARE").strip().upper()
    query = Incident.query
    if source_param != "ALL":
        query = query.filter(Incident.ingestion_source == source_param)

    # Operational priority ordering:
    # 1. Unresolved incidents first
    # 2. Priority rank: Critical (1) > High (2) > Medium (3) > Low (4)
    # 3. Oldest unresolved first (received_at ASC)
    is_resolved = db.case((Incident.status == "Resolved", 1), else_=0)
    priority_rank = db.case(
        (Incident.operational_priority == "Critical", 1),
        (Incident.operational_priority == "High", 2),
        (Incident.operational_priority == "Medium", 3),
        (Incident.operational_priority == "Low", 4),
        else_=5,
    )
    incidents = query.order_by(
        is_resolved.asc(),
        priority_rank.asc(),
        Incident.received_at.asc(),
    ).all()
    return jsonify([incident.to_dict() for incident in incidents])


@incidents_bp.get("/<incident_id>")
@jwt_required()
def get_incident(incident_id: str):
    incident = Incident.query.get(incident_id)
    if not incident:
        return jsonify({"error": "Incident not found"}), 404
    return jsonify(incident.to_dict())


@incidents_bp.post("/<incident_id>/acknowledge")
@jwt_required()
def acknowledge_incident(incident_id: str):
    incident = Incident.query.get(incident_id)
    if not incident:
        return jsonify({"error": "Incident not found"}), 404

    if incident.status != "New":
        return jsonify({"error": f"Cannot acknowledge incident in status {incident.status}"}), 400

    operator = _current_operator_name()
    incident.status = "Acknowledged"
    incident.acknowledged_at = _now()
    _add_timeline(
        incident,
        "Acknowledged",
        operator,
        "Emergency request acknowledged. Incident placed in rescue queue.",
    )
    db.session.commit()
    return jsonify(incident.to_dict())


@incidents_bp.post("/<incident_id>/assign")
@jwt_required()
def assign_incident(incident_id: str):
    incident = Incident.query.get(incident_id)
    if not incident:
        return jsonify({"error": "Incident not found"}), 404

    data = request.get_json(silent=True) or {}
    team_id = data.get("team_id") or data.get("teamId")
    notes = data.get("notes")

    if not team_id:
        return jsonify({"error": "team_id is required"}), 400

    team = RescueTeam.query.get(team_id)
    if not team:
        return jsonify({"error": "Response team not found"}), 404

    # Requirement 17: Assignment validation - prevent duplicate / conflicting assignments
    if (
        team.status in ("Assigned", "In Progress")
        and team.current_incident_id
        and team.current_incident_id != incident.id
    ):
        return (
            jsonify({
                "error": f"Team {team.name} is currently responding to emergency {team.current_incident_code or team.current_incident_id}."
            }),
            409,
        )

    if team.status == "Unavailable":
        return (
            jsonify({
                "error": f"Team {team.name} is currently unavailable and cannot receive new assignments."
            }),
            409,
        )

    operator = _current_operator_name()
    incident.status = "Assigned"
    incident.assigned_team_id = team.id
    incident.assigned_at = _now()
    if notes:
        incident.operator_notes = notes
    if not incident.acknowledged_at:
        incident.acknowledged_at = _now()

    team.status = "Assigned"
    team.current_incident_id = incident.id
    team.current_incident_code = incident.id
    team.current_assignments_count = (team.current_assignments_count or 0) + 1
    team.last_update = "Just now"

    note = (
        f"Assigned {team.name}. Note: {notes}"
        if notes
        else f"Assigned {team.name}."
    )
    _add_timeline(incident, "Assigned", operator, note)
    db.session.commit()

    try:
        from services.event_broadcaster import broadcast_incident_updated
        broadcast_incident_updated(incident, "team_assigned")
    except Exception:
        pass

    return jsonify(incident.to_dict())


@incidents_bp.patch("/<incident_id>/status")
@jwt_required()
def update_status(incident_id: str):
    incident = Incident.query.get(incident_id)
    if not incident:
        return jsonify({"error": "Incident not found"}), 404

    data = request.get_json(silent=True) or {}
    new_status = data.get("status")
    notes = data.get("notes")

    allowed = {"New", "Acknowledged", "Assigned", "In Progress", "Resolved"}
    if new_status not in allowed:
        return jsonify({"error": "Invalid status"}), 400

    operator = _current_operator_name()
    now = _now()
    incident.status = new_status

    if new_status == "Acknowledged" and not incident.acknowledged_at:
        incident.acknowledged_at = now
    elif new_status == "In Progress":
        incident.in_progress_at = now
        if incident.assigned_team:
            incident.assigned_team.status = "In Progress"
            incident.assigned_team.last_update = "Just now"
    elif new_status == "Resolved":
        incident.resolved_at = now
        if incident.assigned_team:
            team = incident.assigned_team
            team.status = "Available"
            team.current_incident_id = None
            team.current_incident_code = None
            team.current_assignments_count = max(0, (team.current_assignments_count or 0) - 1)
            team.completed_incidents_today = (team.completed_incidents_today or 0) + 1
            team.last_update = "Just now"

    _add_timeline(
        incident,
        new_status,
        operator,
        notes or f"Incident status moved to {new_status}.",
    )
    db.session.commit()

    try:
        from services.event_broadcaster import broadcast_incident_updated
        broadcast_incident_updated(incident, "status_change")
    except Exception:
        pass

    return jsonify(incident.to_dict())


@incidents_bp.post("/<incident_id>/priority-override")
@jwt_required()
def priority_override(incident_id: str):
    incident = Incident.query.get(incident_id)
    if not incident:
        return jsonify({"error": "Incident not found"}), 404

    data = request.get_json(silent=True) or {}
    new_priority = data.get("priority") or data.get("new_priority")
    reason = (data.get("reason") or "").strip()

    allowed = {"Critical", "High", "Medium", "Low"}
    if new_priority not in allowed:
        return jsonify({"error": "Invalid priority"}), 400
    if not reason:
        return jsonify({"error": "reason is required"}), 400

    operator = _current_operator_name()
    previous = incident.operational_priority
    incident.operational_priority = new_priority
    incident.is_overridden = True
    incident.override_reason = reason
    incident.override_operator = operator
    incident.override_timestamp = _now()

    _add_timeline(
        incident,
        incident.status,
        operator,
        (
            f'OPERATOR OVERRIDE: Priority changed from {previous} to {new_priority}. '
            f'Reason: "{reason}"'
        ),
    )
    db.session.commit()

    try:
        from services.event_broadcaster import broadcast_incident_updated
        broadcast_incident_updated(incident, "priority_override")
    except Exception:
        pass

    return jsonify(incident.to_dict())


@incidents_bp.post("/<incident_id>/reprioritize")
@jwt_required()
def reprioritize_incident(incident_id: str):
    """
    Dynamically re-evaluates incident priority using TabPFN based on current
    elapsed waiting time and latest nearby beacon cluster density.
    Preserves human operator priority if is_overridden is True.
    """
    incident = Incident.query.get(incident_id)
    if not incident:
        return jsonify({"error": "Incident not found"}), 404

    if incident.status == "Resolved":
        return jsonify({"error": "Cannot reprioritize an already resolved incident"}), 400

    from ai.feature_builder import calculate_nearby_sos_count, normalize_priority
    from ai.flood_risk import lookup_flood_risk
    from services.priority_service import calculate_ai_priority

    now = _now()
    age_minutes = max(0.0, (now - incident.received_at).total_seconds() / 60.0)

    # Dynamic flood risk lookup from incident GPS coordinates
    risk_zone = lookup_flood_risk(incident.latitude, incident.longitude)
    incident.risk_zone = risk_zone

    # Dynamic nearby recent SOS count (within 500m / 60min)
    nearby_count = calculate_nearby_sos_count(
        db.session,
        incident.latitude,
        incident.longitude,
        exclude_incident_id=incident.id,
    )
    incident.nearby_sos_count = nearby_count

    # Run real TabPFN classifier
    new_priority_raw, factors = calculate_ai_priority(
        category=incident.category,
        risk_zone=risk_zone,
        nearby_sos_count=nearby_count,
        request_age_minutes=age_minutes,
    )
    new_ai_priority = normalize_priority(new_priority_raw)
    old_ai_priority = incident.ai_recommended_priority

    incident.ai_recommended_priority = new_ai_priority
    incident.priority_source = factors.get("predictionSource", "tabpfn")
    incident.ai_model = factors.get("aiModel", "TabPFNClassifier(v0.1.11, N_ensemble=1)")
    incident.ai_prediction_timestamp = now
    incident.set_ai_priority_factors(factors)

    # Manual override protection: operator decision is NEVER overwritten automatically
    if not incident.is_overridden:
        incident.operational_priority = new_ai_priority
        if old_ai_priority != new_ai_priority:
            _add_timeline(
                incident,
                incident.status,
                "Emergency System",
                (
                    f"Priority recommendation updated from {old_ai_priority} to {new_ai_priority} "
                    f"(Waiting time: {int(round(age_minutes))} min, Nearby emergency requests: {nearby_count})."
                ),
            )
    else:
        _add_timeline(
            incident,
            incident.status,
            "Emergency System",
            (
                f"Recommended priority updated to {new_ai_priority} (Waiting time: {int(round(age_minutes))} min). "
                f"Operator manual override ({incident.operational_priority}: \"{incident.override_reason}\") preserved."
            ),
        )

    db.session.commit()

    try:
        from services.event_broadcaster import broadcast_incident_updated
        broadcast_incident_updated(incident, "reprioritize")
    except Exception:
        pass

    return jsonify(incident.to_dict())


def create_testing_sos(ingestion_source: str = "API_TEST"):
    data = request.get_json(silent=True) or {}
    data = {**data, "source": "api", "ingestion_source": ingestion_source}
    try:
        incident, _ = create_incident_from_sos(
            data,
            source_label=f"Emergency System ({ingestion_source})",
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    try:
        from services.event_broadcaster import broadcast_incident_created
        broadcast_incident_created(incident)
    except Exception:
        pass

    return jsonify(incident.to_dict()), 201
