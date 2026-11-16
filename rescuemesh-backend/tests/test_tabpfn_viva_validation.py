"""
Comprehensive viva validation test suite for RescueMesh TabPFN AI Priority System.

Proves:
1. Genuine TabPFN predict runtime execution (NO mocks for core inference)
2. Exact feature schema [category, flood_risk, nearby_count, waiting_time]
3. Encodings and mappings
4. Nearby SOS filtering (strict HARDWARE source, excludes API_TEST and SIMULATION)
5. Graceful null GPS handling without phantom coordinates
6. Database persistence of AI priority, model provenance, and timestamp
7. Operational priority vs manual override preservation
8. Category != Priority (contextual variation on real TabPFN model)
9. Local isolated execution (Production never contacted)
"""

import warnings
import numpy as np
import pytest
from datetime import datetime, timedelta

from ai.model_service import get_model_service
from ai.feature_builder import (
    CATEGORY_ENCODING,
    FLOOD_RISK_ENCODING,
    calculate_nearby_sos_count,
    normalize_category,
    normalize_priority,
)
from ai.flood_risk import lookup_flood_risk
from extensions import db
from models.incident import Incident
from models.device import Device
from services.incident_ingest import create_incident_from_sos


warnings.filterwarnings("ignore")


def test_production_is_never_contacted(app):
    """Safety check: database URI must be local (SQLite / memory / test DB), NEVER production Railway PostgreSQL."""
    db_uri = app.config["SQLALCHEMY_DATABASE_URI"]
    assert "railway" not in db_uri.lower()
    assert "postgres" not in db_uri.lower() or "test" in db_uri.lower() or "localhost" in db_uri.lower()


def test_tabpfn_clf_instance_and_genuine_predict_call():
    """Prove that TabPFNClassifier is genuinely loaded, fitted, and executed."""
    svc = get_model_service()
    assert svc.warm_up() is True
    assert svc.is_loaded is True
    assert svc.clf is not None

    # Verify underlying classifier type
    clf_type = type(svc.clf).__name__
    assert clf_type == "TabPFNClassifier", f"Expected TabPFNClassifier, got {clf_type}"

    # Spy on clf.predict to prove it is genuinely invoked during predict()
    original_predict = svc.clf.predict
    called = []

    def spy_predict(X):
        called.append(X)
        return original_predict(X)

    svc.clf.predict = spy_predict
    try:
        prio, source, factors = svc.predict("Medical", "High", nearby_sos_count=5, request_age_minutes=30.0)
        assert len(called) == 1, "clf.predict was not called!"
        assert called[0].shape == (1, 4), f"Expected shape (1, 4), got {called[0].shape}"
        assert source == "tabpfn"
        assert prio == "Critical"
    finally:
        svc.clf.predict = original_predict


def test_feature_vector_schema_and_encodings():
    """Verify exact 4-feature schema, order, and integer encoding."""
    assert CATEGORY_ENCODING == {"MEDICAL": 0, "RESCUE": 1, "FOOD_WATER": 2, "SHELTER": 3}
    assert FLOOD_RISK_ENCODING == {"LOW": 0, "MEDIUM": 1, "HIGH": 2}

    svc = get_model_service()
    svc.warm_up()

    # Medical (0), High (2), Nearby 4, Age 15
    feat = np.array([[CATEGORY_ENCODING["MEDICAL"], FLOOD_RISK_ENCODING["HIGH"], 4, 15.0]])
    raw_pred = svc.clf.predict(feat)[0]
    assert raw_pred in ("CRITICAL", "HIGH", "MEDIUM", "LOW")


def test_nearby_sos_strictly_filters_hardware_source(app):
    """Verify calculate_nearby_sos_count ONLY counts HARDWARE incidents within radius."""
    with app.app_context():
        # Clear incidents
        Incident.query.delete()
        db.session.commit()

        base_lat = 6.913500
        base_lon = 79.972000
        now = datetime.utcnow()

        # Create 1 HARDWARE incident within 100m
        hw_inc = Incident(
            id="RM-TEST-HW",
            device_id="NODE_001",
            gateway_id="GATEWAY_001",
            category="Rescue",
            latitude=base_lat + 0.0005,
            longitude=base_lon,
            location_name="Pittugala, Colombo District",
            risk_zone="High",
            ai_recommended_priority="High",
            operational_priority="High",
            ingestion_source="HARDWARE",
            status="New",
            received_at=now - timedelta(minutes=5),
            sequence_number=1001,
        )
        # Create 1 API_TEST incident within 100m (MUST BE EXCLUDED)
        api_inc = Incident(
            id="RM-TEST-API",
            device_id="NODE_001",
            gateway_id="GATEWAY_001",
            category="Medical",
            latitude=base_lat + 0.0005,
            longitude=base_lon,
            location_name="Pittugala, Colombo District",
            risk_zone="High",
            ai_recommended_priority="High",
            operational_priority="High",
            ingestion_source="API_TEST",
            status="New",
            received_at=now - timedelta(minutes=5),
            sequence_number=1002,
        )
        # Create 1 SIMULATION incident within 100m (MUST BE EXCLUDED)
        sim_inc = Incident(
            id="RM-TEST-SIM",
            device_id="NODE_001",
            gateway_id="GATEWAY_001",
            category="Medical",
            latitude=base_lat + 0.0005,
            longitude=base_lon,
            location_name="Pittugala, Colombo District",
            risk_zone="High",
            ai_recommended_priority="High",
            operational_priority="High",
            ingestion_source="SIMULATION",
            status="New",
            received_at=now - timedelta(minutes=5),
            sequence_number=1003,
        )
        db.session.add_all([hw_inc, api_inc, sim_inc])
        db.session.commit()

        # Query nearby count from base coords
        count = calculate_nearby_sos_count(db.session, base_lat, base_lon, radius_meters=500.0)
        assert count == 1, f"Expected exactly 1 (HARDWARE only), got {count}"


def test_null_gps_handled_gracefully(app):
    """Verify that an SOS packet without GPS fix is ingested safely with null coords and no crash."""
    with app.app_context():
        payload = {
            "device_id": "NODE_001",
            "gateway_id": "GATEWAY_001",
            "category": "Medical",
            "latitude": None,
            "longitude": None,
            "gps_status": False,
            "ingestion_source": "HARDWARE",
        }
        incident, created = create_incident_from_sos(payload, commit=True)
        assert created is True
        assert incident.latitude is None
        assert incident.longitude is None
        assert incident.location_name == "Location unavailable — waiting for GPS"
        assert incident.ai_recommended_priority in ("Critical", "High", "Medium", "Low")
        assert incident.operational_priority == incident.ai_recommended_priority


def test_database_persistence_and_override_protection(app):
    """Verify TabPFN prediction persistence, model provenance, and operator override preservation."""
    with app.app_context():
        payload = {
            "device_id": "NODE_001",
            "gateway_id": "GATEWAY_001",
            "category": "Rescue",
            "latitude": 6.913503,
            "longitude": 79.972060,  # Kelani Basin (High flood risk)
            "gps_status": True,
            "ingestion_source": "HARDWARE",
        }
        incident, _ = create_incident_from_sos(payload, commit=True)
        inc_id = incident.id

        # Reload from DB
        saved = Incident.query.get(inc_id)
        assert saved is not None
        assert saved.ai_recommended_priority in ("Critical", "High")
        assert saved.operational_priority == saved.ai_recommended_priority
        assert saved.priority_source == "tabpfn"
        assert "TabPFNClassifier" in saved.ai_model
        assert saved.ai_prediction_timestamp is not None
        assert saved.is_overridden is False

        original_ai_priority = saved.ai_recommended_priority

        # Simulate Operator Override to Low
        saved.operational_priority = "Low"
        saved.is_overridden = True
        saved.override_operator = "Test Admin"
        saved.override_reason = "Controlled drill / false alarm"
        saved.override_timestamp = datetime.utcnow()
        db.session.commit()

        # Reload and verify AI recommendation was NOT overwritten
        reloaded = Incident.query.get(inc_id)
        assert reloaded.operational_priority == "Low"
        assert reloaded.ai_recommended_priority == original_ai_priority, "AI recommendation was overwritten!"
        assert reloaded.is_overridden is True


def test_viva_proof_category_not_equal_priority():
    """
    CORE VIVA PROOF:
    Same category with different contextual conditions MUST produce different predicted priorities.
    """
    svc = get_model_service()
    svc.warm_up()

    # MEDICAL: Low context vs High context
    med_low, src1, _ = svc.predict("Medical", "Low", nearby_sos_count=0, request_age_minutes=0.0)
    med_high, src2, _ = svc.predict("Medical", "High", nearby_sos_count=5, request_age_minutes=30.0)
    assert src1 == "tabpfn" and src2 == "tabpfn"
    assert med_low != med_high, f"Medical did not vary: low={med_low}, high={med_high}"
    assert med_low in ("Medium", "High")
    assert med_high == "Critical"

    # RESCUE: Low context vs High context
    res_low, _, _ = svc.predict("Rescue", "Low", nearby_sos_count=0, request_age_minutes=0.0)
    res_high, _, _ = svc.predict("Rescue", "High", nearby_sos_count=4, request_age_minutes=20.0)
    assert res_low != res_high, f"Rescue did not vary: low={res_low}, high={res_high}"
    assert res_low in ("Low", "Medium")
    assert res_high == "Critical"

    # FOOD_WATER: Low context vs High context
    food_low, _, _ = svc.predict("Food & Water", "Low", nearby_sos_count=0, request_age_minutes=0.0)
    food_high, _, _ = svc.predict("Food & Water", "High", nearby_sos_count=6, request_age_minutes=50.0)
    assert food_low != food_high, f"Food & Water did not vary: low={food_low}, high={food_high}"
    assert food_low == "Low"
    assert food_high in ("High", "Critical")
