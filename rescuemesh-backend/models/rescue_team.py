from datetime import datetime

from extensions import db


class RescueTeam(db.Model):
    __tablename__ = "rescue_teams"

    id = db.Column(db.String(32), primary_key=True)
    name = db.Column(db.String(180), nullable=False)
    type = db.Column(db.String(64), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="Available")
    current_incident_id = db.Column(db.String(32))
    current_incident_code = db.Column(db.String(32))
    base_location = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    completed_incidents_today = db.Column(db.Integer, default=0)
    last_update = db.Column(db.String(64), default="Just now")
    contact_phone = db.Column(db.String(64))
    team_lead = db.Column(db.String(120))
    current_assignments_count = db.Column(db.Integer, default=0)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    incidents = db.relationship("Incident", back_populates="assigned_team", lazy="dynamic")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "status": self.status,
            "currentIncidentId": self.current_incident_id,
            "currentIncidentCode": self.current_incident_code,
            "baseLocation": self.base_location,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "completedIncidentsToday": self.completed_incidents_today or 0,
            "lastUpdate": self.last_update,
            "contactPhone": self.contact_phone,
            "teamLead": self.team_lead,
            "currentAssignmentsCount": self.current_assignments_count or 0,
        }
