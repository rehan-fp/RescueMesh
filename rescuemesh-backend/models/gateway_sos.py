import uuid
from datetime import datetime

from extensions import db


class GatewaySosMessage(db.Model):
    """Raw SOS packet as forwarded by an ESP32 gateway over REST, linked to its Incident."""

    __tablename__ = "gateway_sos_messages"
    __table_args__ = (
        db.Index("ix_gateway_sos_device_sequence", "device_id", "sequence"),
    )

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    incident_id = db.Column(
        db.String(32),
        db.ForeignKey("incidents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    device_id = db.Column(db.String(64), nullable=False)
    gateway_id = db.Column(db.String(64), nullable=False)
    category = db.Column(db.String(64), nullable=False)
    sequence = db.Column(db.Integer)
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)
    display_latitude = db.Column(db.Float, nullable=True)
    display_longitude = db.Column(db.Float, nullable=True)
    location_source = db.Column(db.String(32), nullable=True)
    battery = db.Column(db.Float)
    gps_status = db.Column(db.Boolean)
    rssi_dbm = db.Column(db.Integer)
    snr_db = db.Column(db.Float)
    device_timestamp = db.Column(db.String(64))
    ingestion_source = db.Column(db.String(32), nullable=False, default="HARDWARE", index=True)
    received_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)

    incident = db.relationship("Incident")

    def to_dict(self) -> dict:
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
            "messageId": self.id,
            "incidentId": self.incident_id,
            "deviceId": self.device_id,
            "gatewayId": self.gateway_id,
            "category": self.category,
            "sequence": self.sequence,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "displayLatitude": display_lat,
            "displayLongitude": display_lon,
            "locationSource": loc_src,
            "battery": self.battery,
            "gpsStatus": self.gps_status,
            "rssiDbm": self.rssi_dbm,
            "snrDb": self.snr_db,
            "deviceTimestamp": self.device_timestamp,
            "ingestionSource": getattr(self, "ingestion_source", "HARDWARE") or "HARDWARE",
            "receivedAt": self.received_at.isoformat() + "Z" if self.received_at else None,
        }
