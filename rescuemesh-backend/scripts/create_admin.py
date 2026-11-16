"""
Create or reset a RescueMesh administrator account.

Usage (inside the backend container or a configured venv):
    ADMIN_EMAIL=admin@example.com python scripts/create_admin.py
The password is read from ADMIN_PASSWORD if set, otherwise prompted for.
It is hashed with User.set_password and never printed.
"""

import getpass
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app import create_app  # noqa: E402
from extensions import db  # noqa: E402
from models.user import User  # noqa: E402

ADMIN_ROLE = "Administrator"


def _next_user_id() -> str:
    numbers = [
        int(user_id[4:])
        for (user_id,) in db.session.query(User.id).all()
        if user_id.startswith("USR-") and user_id[4:].isdigit()
    ]
    return f"USR-{(max(numbers) + 1) if numbers else 1:03d}"


def main() -> int:
    email = (os.getenv("ADMIN_EMAIL") or input("Admin email: ")).strip().lower()
    password = os.getenv("ADMIN_PASSWORD") or getpass.getpass("Admin password: ")
    if not email or len(password) < 8:
        print("A valid email and a password of at least 8 characters are required.")
        return 1

    app = create_app()
    with app.app_context():
        user = User.query.filter_by(email=email).first()
        created = user is None
        if created:
            user = User(
                id=_next_user_id(),
                name=os.getenv("ADMIN_NAME", "RescueMesh Administrator"),
                email=email,
                role=ADMIN_ROLE,
                badge_number=os.getenv("ADMIN_BADGE", "ADMIN-001"),
                assigned_district=os.getenv("ADMIN_DISTRICT", "National Command Center"),
                station=os.getenv("ADMIN_STATION", "Disaster Management Center HQ"),
                station_id=os.getenv("ADMIN_STATION_ID", "DMC_WESTERN_HQ_01"),
                status="Active",
                created_at=datetime.utcnow(),
            )
            db.session.add(user)
        user.role = ADMIN_ROLE
        user.set_password(password)
        db.session.commit()

        verified = User.query.filter_by(email=email).first()
        ok = verified is not None and verified.check_password(password)
        print(
            f"{'Created' if created else 'Updated'} administrator {verified.id} <{email}>; "
            f"password hash verified: {ok}"
        )
        return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
