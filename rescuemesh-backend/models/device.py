from datetime import datetime

from extensions import db


class Device(db.Model):
    __tablename__ = "devices"

    id = db.Column(db.String(64), primary_key=True)
    name = db.Column(db.String(180), nullable=False)
    type = db.Column(db.String(64), nullable=False)
    status = db.Column(db.String(32), nullable=False, default="Online")
    last_seen = db.Column(db.String(64), default="Now")
    firmware = db.Column(db.String(64))
    gateway = db.Column(db.String(120))
    rssi_dbm = db.Column(db.Integer)
    snr_db = db.Column(db.Float)
    signal_strength = db.Column(db.String(64))
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    location = db.Column(db.String(255))
    packets_transmitted = db.Column(db.Integer, default=0)
    last_incident_id = db.Column(db.String(32))
    frequency_band = db.Column(db.String(32), default="433 MHz")
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "type": self.type,
            "status": self.status,
            "lastSeen": self.last_seen,
            "firmware": self.firmware,
            "gateway": self.gateway,
            "rssiDbm": self.rssi_dbm,
            "snrDb": self.snr_db,
            "signalStrength": self.signal_strength,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "location": self.location,
            "packetsTransmitted": self.packets_transmitted or 0,
            "lastIncidentId": self.last_incident_id,
            "frequencyBand": self.frequency_band or "433 MHz",
        }
