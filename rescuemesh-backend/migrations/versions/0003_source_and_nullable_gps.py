"""Add ingestion_source column and make latitude/longitude nullable.

# Revision ID: 0003_source_and_nullable_gps
# Revises: 0002_incident_location_metadata
# Create Date: 2026-10-19
"""
import sqlalchemy as sa
from alembic import op

revision = "0003_source_and_nullable_gps"
down_revision = "0002_incident_location_metadata"
branch_labels = None
depends_on = None

CONFIRMED_TEST_IDS = (
    "RM-00198", "RM-00209", "RM-00210", "RM-00211",
    "RM-00212", "RM-00213", "RM-00214", "RM-00215"
)
CONFIRMED_REAL_IDS = (
    "RM-00195", "RM-00196", "RM-00197", "RM-00199", "RM-00200",
    "RM-00201", "RM-00202", "RM-00203", "RM-00204", "RM-00205",
    "RM-00206", "RM-00207", "RM-00208"
)


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if bind.dialect.name == "postgresql":
        # Native, non-blocking PostgreSQL DDL
        op.execute(sa.text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS ingestion_source VARCHAR(32) NOT NULL DEFAULT 'HARDWARE';"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_incidents_ingestion_source ON incidents (ingestion_source);"))
        op.execute(sa.text("ALTER TABLE incidents ALTER COLUMN latitude DROP NOT NULL;"))
        op.execute(sa.text("ALTER TABLE incidents ALTER COLUMN longitude DROP NOT NULL;"))

        op.execute(sa.text("ALTER TABLE gateway_sos_messages ADD COLUMN IF NOT EXISTS ingestion_source VARCHAR(32) NOT NULL DEFAULT 'HARDWARE';"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_gateway_sos_ingestion_source ON gateway_sos_messages (ingestion_source);"))
        op.execute(sa.text("ALTER TABLE gateway_sos_messages ALTER COLUMN latitude DROP NOT NULL;"))
        op.execute(sa.text("ALTER TABLE gateway_sos_messages ALTER COLUMN longitude DROP NOT NULL;"))
    else:
        # SQLite local fallback (no table recreation required)
        incident_cols = {c["name"] for c in insp.get_columns("incidents")}
        with op.batch_alter_table("incidents", recreate="never") as batch:
            if "ingestion_source" not in incident_cols:
                batch.add_column(sa.Column("ingestion_source", sa.String(32), nullable=False, server_default="HARDWARE"))

        gw_cols = {c["name"] for c in insp.get_columns("gateway_sos_messages")}
        with op.batch_alter_table("gateway_sos_messages", recreate="never") as batch:
            if "ingestion_source" not in gw_cols:
                batch.add_column(sa.Column("ingestion_source", sa.String(32), nullable=False, server_default="HARDWARE"))

    # Update source classifications for existing incidents
    for test_id in CONFIRMED_TEST_IDS:
        bind.execute(
            sa.text("UPDATE incidents SET ingestion_source = 'API_TEST' WHERE id = :id"),
            {"id": test_id}
        )
        bind.execute(
            sa.text("UPDATE gateway_sos_messages SET ingestion_source = 'API_TEST' WHERE incident_id = :id"),
            {"id": test_id}
        )

    for real_id in CONFIRMED_REAL_IDS:
        bind.execute(
            sa.text("UPDATE incidents SET ingestion_source = 'HARDWARE' WHERE id = :id"),
            {"id": real_id}
        )
        bind.execute(
            sa.text("UPDATE gateway_sos_messages SET ingestion_source = 'HARDWARE' WHERE incident_id = :id"),
            {"id": real_id}
        )


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("DROP INDEX IF EXISTS ix_gateway_sos_ingestion_source;"))
        op.execute(sa.text("ALTER TABLE gateway_sos_messages DROP COLUMN IF EXISTS ingestion_source;"))
        op.execute(sa.text("DROP INDEX IF EXISTS ix_incidents_ingestion_source;"))
        op.execute(sa.text("ALTER TABLE incidents DROP COLUMN IF EXISTS ingestion_source;"))
    else:
        with op.batch_alter_table("gateway_sos_messages", recreate="never") as batch:
            batch.drop_column("ingestion_source")
        with op.batch_alter_table("incidents", recreate="never") as batch:
            batch.drop_column("ingestion_source")
