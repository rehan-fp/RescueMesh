"""Add AI metadata and gateway telemetry columns to incidents.

Tables are created by db.create_all() at startup, so on a fresh database these
columns already exist; every step here is conditional so it is safe on both
fresh and pre-existing databases.

Revision ID: 0001_incident_ai_metadata
Revises:
Create Date: 2026-10-18
"""
import json

import sqlalchemy as sa
from alembic import op

revision = "0001_incident_ai_metadata"
down_revision = None
branch_labels = None
depends_on = None

LEGACY_SOURCE = "legacy"
LEGACY_MODEL = "Legacy rule engine (pre-TabPFN)"

NEW_COLUMNS = (
    ("priority_source", sa.String(32)),
    ("ai_model", sa.String(64)),
    ("ai_prediction_timestamp", sa.DateTime()),
    ("battery", sa.Float()),
    ("gps_status", sa.Boolean()),
)


def upgrade():
    bind = op.get_bind()
    existing = {col["name"] for col in sa.inspect(bind).get_columns("incidents")}
    missing = [(name, type_) for name, type_ in NEW_COLUMNS if name not in existing]
    if missing:
        with op.batch_alter_table("incidents") as batch:
            for name, type_ in missing:
                batch.add_column(sa.Column(name, type_, nullable=True))

    # Incidents prioritised before TabPFN have no recorded source; label them
    # honestly instead of letting the UI assume TabPFN produced them.
    rows = bind.execute(
        sa.text("SELECT id, ai_priority_factors FROM incidents WHERE priority_source IS NULL")
    ).fetchall()
    for incident_id, raw_factors in rows:
        try:
            factors = json.loads(raw_factors or "{}")
        except ValueError:
            factors = {}
        source = factors.get("predictionSource") or LEGACY_SOURCE
        model = factors.get("aiModel") or (LEGACY_MODEL if source == LEGACY_SOURCE else None)
        bind.execute(
            sa.text("UPDATE incidents SET priority_source = :source, ai_model = :model WHERE id = :id"),
            {"source": source, "model": model, "id": incident_id},
        )


def downgrade():
    with op.batch_alter_table("incidents") as batch:
        for name, _ in reversed(NEW_COLUMNS):
            batch.drop_column(name)
