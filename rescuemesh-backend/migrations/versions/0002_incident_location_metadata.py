"""Add locality, district, and location_resolved_at to incidents and repair hardcoded location names.

Revision ID: 0002_incident_location_metadata
Revises: 0001_incident_ai_metadata
Create Date: 2026-10-18
"""
from datetime import datetime
import sqlalchemy as sa
from alembic import op

from services.geocoding_service import reverse_geocode

revision = "0002_incident_location_metadata"
down_revision = "0001_incident_ai_metadata"
branch_labels = None
depends_on = None

NEW_COLUMNS = (
    ("locality", sa.String(120)),
    ("district", sa.String(120)),
    ("location_resolved_at", sa.DateTime()),
)


def upgrade():
    bind = op.get_bind()
    existing = {col["name"] for col in sa.inspect(bind).get_columns("incidents")}
    missing = [(name, type_) for name, type_ in NEW_COLUMNS if name not in existing]
    if missing:
        with op.batch_alter_table("incidents") as batch:
            for name, type_ in missing:
                batch.add_column(sa.Column(name, type_, nullable=True))

    # Repair existing incidents that have the hardcoded "Thorana Junction" sector name
    # or missing resolved metadata, re-resolving strictly from their authoritative GPS coordinates.
    rows = bind.execute(
        sa.text("SELECT id, latitude, longitude, location_name FROM incidents")
    ).fetchall()

    for incident_id, lat, lon, current_loc in rows:
        if lat is None or lon is None:
            continue
        try:
            resolved = reverse_geocode(float(lat), float(lon))
            new_loc_name = resolved.location_name
            # If reverse geocoding is unavailable, fall back to "Location unavailable" if current was fake
            if new_loc_name == "Location unavailable":
                if current_loc and "Thorana" in current_loc:
                    new_loc_name = "Location unavailable"
                else:
                    new_loc_name = current_loc or "Location unavailable"
            
            resolved_at = datetime.utcnow() if new_loc_name != "Location unavailable" else None

            bind.execute(
                sa.text(
                    "UPDATE incidents "
                    "SET location_name = :loc_name, "
                    "    locality = :locality, "
                    "    district = :district, "
                    "    location_resolved_at = :resolved_at "
                    "WHERE id = :id"
                ),
                {
                    "loc_name": new_loc_name,
                    "locality": resolved.locality,
                    "district": resolved.district,
                    "resolved_at": resolved_at,
                    "id": incident_id,
                },
            )
        except Exception:
            # Geocoding must never block migration
            pass


def downgrade():
    with op.batch_alter_table("incidents") as batch:
        for name, _ in reversed(NEW_COLUMNS):
            batch.drop_column(name)
