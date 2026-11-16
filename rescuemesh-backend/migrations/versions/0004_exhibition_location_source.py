"""Add location_source, display_latitude, and display_longitude columns for exhibition GPS fallback.

# Revision ID: 0004_exhibition_location_source
# Revises: 0003_source_and_nullable_gps
# Create Date: 2026-11-16
"""
import sqlalchemy as sa
from alembic import op

revision = "0004_exhibition_location_source"
down_revision = "0003_source_and_nullable_gps"
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if bind.dialect.name == "postgresql":
        op.execute(sa.text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS location_source VARCHAR(32);"))
        op.execute(sa.text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS display_latitude DOUBLE PRECISION;"))
        op.execute(sa.text("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS display_longitude DOUBLE PRECISION;"))

        op.execute(sa.text("ALTER TABLE gateway_sos_messages ADD COLUMN IF NOT EXISTS location_source VARCHAR(32);"))
        op.execute(sa.text("ALTER TABLE gateway_sos_messages ADD COLUMN IF NOT EXISTS display_latitude DOUBLE PRECISION;"))
        op.execute(sa.text("ALTER TABLE gateway_sos_messages ADD COLUMN IF NOT EXISTS display_longitude DOUBLE PRECISION;"))
    else:
        incident_cols = {c["name"] for c in insp.get_columns("incidents")}
        with op.batch_alter_table("incidents", recreate="never") as batch:
            if "location_source" not in incident_cols:
                batch.add_column(sa.Column("location_source", sa.String(32), nullable=True))
            if "display_latitude" not in incident_cols:
                batch.add_column(sa.Column("display_latitude", sa.Float, nullable=True))
            if "display_longitude" not in incident_cols:
                batch.add_column(sa.Column("display_longitude", sa.Float, nullable=True))

        gw_cols = {c["name"] for c in insp.get_columns("gateway_sos_messages")}
        with op.batch_alter_table("gateway_sos_messages", recreate="never") as batch:
            if "location_source" not in gw_cols:
                batch.add_column(sa.Column("location_source", sa.String(32), nullable=True))
            if "display_latitude" not in gw_cols:
                batch.add_column(sa.Column("display_latitude", sa.Float, nullable=True))
            if "display_longitude" not in gw_cols:
                batch.add_column(sa.Column("display_longitude", sa.Float, nullable=True))

    # Backfill location_source and display coordinates for existing records
    bind.execute(
        sa.text(
            "UPDATE incidents "
            "SET location_source = 'GPS_FIXED', "
            "    display_latitude = latitude, "
            "    display_longitude = longitude "
            "WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location_source IS NULL"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE incidents "
            "SET location_source = 'NO_FIX' "
            "WHERE (latitude IS NULL OR longitude IS NULL) AND location_source IS NULL"
        )
    )

    bind.execute(
        sa.text(
            "UPDATE gateway_sos_messages "
            "SET location_source = 'GPS_FIXED', "
            "    display_latitude = latitude, "
            "    display_longitude = longitude "
            "WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND location_source IS NULL"
        )
    )
    bind.execute(
        sa.text(
            "UPDATE gateway_sos_messages "
            "SET location_source = 'NO_FIX' "
            "WHERE (latitude IS NULL OR longitude IS NULL) AND location_source IS NULL"
        )
    )


def downgrade():
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("ALTER TABLE gateway_sos_messages DROP COLUMN IF EXISTS display_longitude;"))
        op.execute(sa.text("ALTER TABLE gateway_sos_messages DROP COLUMN IF EXISTS display_latitude;"))
        op.execute(sa.text("ALTER TABLE gateway_sos_messages DROP COLUMN IF EXISTS location_source;"))
        op.execute(sa.text("ALTER TABLE incidents DROP COLUMN IF EXISTS display_longitude;"))
        op.execute(sa.text("ALTER TABLE incidents DROP COLUMN IF EXISTS display_latitude;"))
        op.execute(sa.text("ALTER TABLE incidents DROP COLUMN IF EXISTS location_source;"))
    else:
        with op.batch_alter_table("gateway_sos_messages", recreate="never") as batch:
            batch.drop_column("display_longitude")
            batch.drop_column("display_latitude")
            batch.drop_column("location_source")
        with op.batch_alter_table("incidents", recreate="never") as batch:
            batch.drop_column("display_longitude")
            batch.drop_column("display_latitude")
            batch.drop_column("location_source")

