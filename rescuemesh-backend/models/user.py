from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from extensions import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.String(32), primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(180), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(64), nullable=False)
    badge_number = db.Column(db.String(64), nullable=False)
    assigned_district = db.Column(db.String(180), nullable=False)
    station = db.Column(db.String(180))
    station_id = db.Column(db.String(64), nullable=False, default="DMC_WESTERN_HQ_01")
    status = db.Column(db.String(32), nullable=False, default="Active")
    last_login = db.Column(db.DateTime)
    avatar_url = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, password: str) -> None:
        # pbkdf2 avoids scrypt, which is unavailable on some macOS Python builds
        self.password_hash = generate_password_hash(password, method="pbkdf2:sha256")

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def is_active(self) -> bool:
        return self.status != "Disabled"

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "badgeNumber": self.badge_number,
            "assignedDistrict": self.assigned_district,
            "station": self.station,
            "stationId": self.station_id,
            "status": self.status,
            "lastLogin": self.last_login.isoformat() if self.last_login else None,
            "avatarUrl": self.avatar_url,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
