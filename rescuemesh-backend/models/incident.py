import json
from datetime import datetime
from typing import Optional

from extensions import db


def _fmt_time(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    return value.strftime("%H:%M")


def _fmt_iso(value: Optional[datetime]) -> Optional[str]:
    if not value:
        return None
    return value.strftime("%Y-%m-%dT%H:%M:%SZ")


class Incident(db.Model):
    __tablename__ = "incidents"

    id = db.Column(db.String(32), primary_key=True)
    device_id = db.Column(db.String(64), nullable=False, index=True)
    gateway_id = db.Column(db.String(64), nullable=False)
    category = db.Column(db.String(64), nullable=False)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    display_latitude = db.Column(db.Float, nullable=True)
    display_longitude = db.Column(db.Float, nullable=True)
    location_source = db.Column(db.String(32), nullable=True)
    location_name = db.Column(db.String(255), nullable=False)
    locality = db.Column(db.String(120), nullable=True)
    district = db.Column(db.String(120), nullable=True)
    location_resolved_at = db.Column(db.DateTime, nullable=True)
    risk_zone = db.Column(db.String(32), nullable=False)
    nearby_sos_count = db.Column(db.Integer, default=0)
    ingestion_source = db.Column(db.String(32), nullable=False, default="HARDWARE", index=True)

    ai_recommended_priority = db.Column(db.String(32), nullable=False)
    operational_priority = db.Column(db.String(32), nullable=False)
    ai_priority_factors = db.Column(db.Text)
    # Set explicitly from the prediction result; never default to "tabpfn".
    priority_source = db.Column(db.String(32))
    ai_model = db.Column(db.String(64))
    ai_prediction_timestamp = db.Column(db.DateTime)

    is_overridden = db.Column(db.Boolean, default=False)
    override_reason = db.Column(db.Text)
    override_operator = db.Column(db.String(120))
    override_timestamp = db.Column(db.DateTime)

    sequence_number = db.Column(db.Integer, nullable=False)
    status = db.Column(db.String(32), nullable=False, default="New")

    assigned_team_id = db.Column(
        db.String(32),
        db.ForeignKey("rescue_teams.id"),
        nullable=True,
    )
    operator_notes = db.Column(db.Text)

    received_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    acknowledged_at = db.Column(db.DateTime)
    assigned_at = db.Column(db.DateTime)
    in_progress_at = db.Column(db.DateTime)
    resolved_at = db.Column(db.DateTime)

    rssi_dbm = db.Column(db.Integer)
    snr_db = db.Column(db.Float)
    battery = db.Column(db.Float, nullable=True)
    gps_status = db.Column(db.Boolean, nullable=True)

    assigned_team = db.relationship("RescueTeam", back_populates="incidents")
    timeline_entries = db.relationship(
        "TimelineEntry",
        back_populates="incident",
        cascade="all, delete-orphan",
        order_by="TimelineEntry.id",
    )

    def get_ai_priority_factors(self) -> dict:
        if not self.ai_priority_factors:
            return {}
        try:
            return json.loads(self.ai_priority_factors)
        except json.JSONDecodeError:
            return {}

    def set_ai_priority_factors(self, factors: dict) -> None:
        self.ai_priority_factors = json.dumps(factors)

    def to_dict(self) -> dict:
        team_name = self.assigned_team.name if self.assigned_team else None
        factors = self.get_ai_priority_factors()
        battery = getattr(self, "battery", None)
        gps_status = getattr(self, "gps_status", None)
        if battery is None or gps_status is None:
            try:
                from models.gateway_sos import GatewaySosMessage
                msg = GatewaySosMessage.query.filter_by(incident_id=self.id).first()
                if msg:
                    if battery is None:
                        battery = msg.battery
                    if gps_status is None:
                        gps_status = msg.gps_status
            except Exception:
                pass

        display_lat = getattr(self, "display_latitude", None)
        if display_lat is None:
            display_lat = self.latitude
        display_lon = getattr(self, "display_longitude", None)
        if display_lon is None:
            display_lon = self.longitude
        loc_src = getattr(self, "location_source", None)
        if not loc_src:
            loc_src = "GPS_FIXED" if (self.latitude is not None and self.longitude is not None) else "NO_FIX"

        return {
            "id": self.id,
            "deviceId": self.device_id,
            "gatewayId": self.gateway_id,
            "category": self.category,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "displayLatitude": display_lat,
            "displayLongitude": display_lon,
            "locationSource": loc_src,
            "locationName": self.location_name,
            "locality": self.locality,
            "district": self.district,
            "locationResolvedAt": _fmt_iso(self.location_resolved_at) or _fmt_time(self.location_resolved_at),
            "riskZone": self.risk_zone,
            "nearbySosCount": self.nearby_sos_count or 0,
            "aiRecommendedPriority": self.ai_recommended_priority,
            "operationalPriority": self.operational_priority,
            "isOverridden": bool(self.is_overridden),
            "overrideReason": self.override_reason,
            "overrideOperator": self.override_operator,
            "overrideTimestamp": _fmt_iso(self.override_timestamp) or _fmt_time(self.override_timestamp),
            "receivedTimestamp": _fmt_iso(self.received_at) or "",
            "receivedAt": _fmt_iso(self.received_at),
            "sequenceNumber": self.sequence_number,
            "status": self.status,
            "assignedTeamId": self.assigned_team_id,
            "assignedTeamName": team_name,
            "assignedTimestamp": _fmt_iso(self.assigned_at) or _fmt_time(self.assigned_at),
            "acknowledgedTimestamp": _fmt_iso(self.acknowledged_at) or _fmt_time(self.acknowledged_at),
            "inProgressTimestamp": _fmt_iso(self.in_progress_at) or _fmt_time(self.in_progress_at),
            "resolvedTimestamp": _fmt_iso(self.resolved_at) or _fmt_time(self.resolved_at),
            "operatorNotes": self.operator_notes,
            "timeline": [entry.to_dict() for entry in self.timeline_entries],
            "snrDb": self.snr_db,
            "rssiDbm": self.rssi_dbm,
            "battery": battery,
            "gpsStatus": gps_status,
            # Keep legacy key so existing UI keeps working during rename.
            "aiPriorityFactors": factors,
            "decisionTreeFactors": factors,
            "prioritySource": self.priority_source or factors.get("predictionSource"),
            "aiModel": self.ai_model or factors.get("aiModel"),
            "aiPredictionTimestamp": _fmt_iso(self.ai_prediction_timestamp) or factors.get("predictionTimestamp"),
            "isNewPulse": self.status == "New",
            "ingestionSource": getattr(self, "ingestion_source", "HARDWARE") or "HARDWARE",
        }
