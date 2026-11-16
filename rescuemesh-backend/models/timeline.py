from datetime import datetime

from extensions import db


class TimelineEntry(db.Model):
    __tablename__ = "incident_timeline"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    incident_id = db.Column(
        db.String(32),
        db.ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status = db.Column(db.String(32), nullable=False)
    timestamp = db.Column(db.String(32), nullable=False)
    operator = db.Column(db.String(120), nullable=False)
    note = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    incident = db.relationship("Incident", back_populates="timeline_entries")

    def to_dict(self) -> dict:
        operator_clean = self.operator
        if any(w in operator_clean.lower() for w in ("lora", "mqtt", "api", "ingest", "rest", "gateway", "433", "system (", "simulation", "node_")):
            operator_clean = "Emergency Communication System"

        note_clean = self.note or ""
        if "SOS packet received" in note_clean or "433 MHz" in note_clean or "GATEWAY_" in note_clean or "distress beacon" in note_clean.lower():
            import re
            prio_match = re.search(r"Priority:\s*([A-Za-z]+)", note_clean, flags=re.IGNORECASE)
            prio = prio_match.group(1) if prio_match else "Assessed"
            note_clean = f"Emergency request received. Recommended Priority: {prio}."
        elif "dynamic reprioritization" in note_clean.lower() or "dynamic priority updated" in note_clean.lower():
            import re
            note_clean = re.sub(r"Nearby (?:beacons|sos|recent):\s*(\d+)", r"Nearby emergency requests: \1", note_clean, flags=re.IGNORECASE)
            note_clean = re.sub(r"Dynamic reprioritization", "Priority assessment updated", note_clean, flags=re.IGNORECASE)
            note_clean = re.sub(r"Dynamic priority updated", "Priority recommendation updated", note_clean, flags=re.IGNORECASE)
        elif "beacon" in note_clean.lower():
            note_clean = note_clean.replace("beacon", "emergency request").replace("Beacon", "Emergency Request")

        if "AI Recommended Priority:" in note_clean:
            note_clean = note_clean.replace("AI Recommended Priority:", "Recommended Priority:")

        iso_time = self.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if self.created_at else None
        return {
            "status": self.status,
            "timestamp": iso_time or self.timestamp,
            "createdAt": iso_time,
            "operator": operator_clean,
            "note": note_clean,
            "rawNote": self.note,
        }
