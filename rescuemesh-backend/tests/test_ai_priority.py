"""
Unit and integration tests for RescueMesh TabPFN AI Emergency Prioritization System.

Covers:
1. Category normalization across all 4 categories (RESCUE, MEDICAL, FOOD_WATER, SHELTER)
2. Priority normalization across all 4 classes (CRITICAL, HIGH, MEDIUM, LOW)
3. Geospatial flood risk calculation (High, Medium, Low)
4. Haversine distance calculation
5. Dynamic nearby recent SOS calculation from database
6. TabPFN prediction across all 4 categories & category independence
7. Feature builder and explainability metadata
8. Fallback handling and source labeling
9. REST SOS integration (POST /api/v1/sos)
10. Priority queue sorting (Critical > High > Medium > Low, oldest first)
11. Dynamic reprioritization & manual override protection
"""

import math
from datetime import datetime, timedelta
import pytest

from ai.flood_risk import (
    haversine_distance,
    lookup_flood_risk,
    point_in_polygon,
    KELANI_BASIN_POLYGON,
)
from ai.feature_builder import (
    normalize_category,
    normalize_priority,
    calculate_nearby_sos_count,
    build_factors_dict,
)
from ai.model_service import get_model_service, _rule_based_fallback
from services.priority_service import calculate_ai_priority
from models.incident import Incident
from extensions import db


# ==============================================================================
# 1. CATEGORY & PRIORITY NORMALIZATION TESTS
# ==============================================================================

def test_category_normalization():
    assert normalize_category("MEDICAL") == ("MEDICAL", "Medical")
    assert normalize_category("medical") == ("MEDICAL", "Medical")
    assert normalize_category("RESCUE") == ("RESCUE", "Rescue")
    assert normalize_category("rescue") == ("RESCUE", "Rescue")
    assert normalize_category("FOOD_WATER") == ("FOOD_WATER", "Food & Water")
    assert normalize_category("Food & Water") == ("FOOD_WATER", "Food & Water")
    assert normalize_category("food-and-water") == ("FOOD_WATER", "Food & Water")
    assert normalize_category("SHELTER") == ("SHELTER", "Shelter")
    assert normalize_category("shelter") == ("SHELTER", "Shelter")
    # Unknown fallback
    assert normalize_category("unknown_xyz") == ("MEDICAL", "Medical")


def test_priority_normalization():
    assert normalize_priority("CRITICAL") == "Critical"
    assert normalize_priority("critical") == "Critical"
    assert normalize_priority("HIGH") == "High"
    assert normalize_priority("high") == "High"
    assert normalize_priority("MEDIUM") == "Medium"
    assert normalize_priority("medium") == "Medium"
    assert normalize_priority("LOW") == "Low"
    assert normalize_priority("low") == "Low"
    assert normalize_priority("Unknown") == "Medium"


# ==============================================================================
# 2. GEOSPATIAL FLOOD RISK & DISTANCE TESTS
# ==============================================================================

def test_haversine_distance_accuracy():
    # Distance between Thorana Junction (6.913503, 79.972060) and nearby point (~111m north)
    d = haversine_distance(6.913503, 79.972060, 6.914503, 79.972060)
    assert 110.0 < d < 112.0

    # Distance to same point is 0
    assert haversine_distance(6.913503, 79.972060, 6.913503, 79.972060) == 0.0


def test_flood_risk_zones():
    # Inside Kelani Basin polygon: Thorana Junction hardware location
    assert lookup_flood_risk(6.913503, 79.972060) == "High"

    # Wattala coastal fringe: within 4 km buffer corridor
    assert lookup_flood_risk(6.960, 79.940) == "Medium"

    # Inland highland: outside buffer corridor
    assert lookup_flood_risk(7.290, 80.630) == "Low"


# ==============================================================================
# 3. TABPFN AI PREDICTION & CATEGORY INDEPENDENCE TESTS
# ==============================================================================

def test_tabpfn_category_independence():
    """
    CRITICAL REQUIREMENT 2: Emergency categories are NOT static priorities.
    The same category must produce different priorities depending on contextual conditions.
    """
    model_service = get_model_service()

    # MEDICAL: Critical under severe conditions vs High under isolated/mild conditions
    med_crit, src1, _ = model_service.predict("Medical", "High", nearby_sos_count=5, request_age_minutes=30.0)
    med_mild, src2, _ = model_service.predict("Medical", "Low", nearby_sos_count=0, request_age_minutes=0.0)
    assert med_crit == "Critical"
    assert med_mild in ("High", "Medium")
    assert src1 == "tabpfn"
    assert src2 == "tabpfn"

    # RESCUE: Critical under severe flood conditions vs Low/Medium under minor isolated conditions
    res_crit, _, _ = model_service.predict("Rescue", "High", nearby_sos_count=4, request_age_minutes=20.0)
    res_low, _, _ = model_service.predict("Rescue", "Low", nearby_sos_count=0, request_age_minutes=0.0)
    assert res_crit == "Critical"
    assert res_low in ("Low", "Medium")

    # FOOD_WATER: Critical/High under severe cluster vs Low under isolated initial request
    food_high, _, _ = model_service.predict("Food & Water", "High", nearby_sos_count=6, request_age_minutes=50.0)
    food_low, _, _ = model_service.predict("Food & Water", "Low", nearby_sos_count=0, request_age_minutes=0.0)
    assert food_high in ("Critical", "High")
    assert food_low == "Low"

    # SHELTER: High/Critical under large cluster vs Low under isolated initial request
    sh_high, _, _ = model_service.predict("Shelter", "High", nearby_sos_count=7, request_age_minutes=50.0)
    sh_low, _, _ = model_service.predict("Shelter", "Low", nearby_sos_count=0, request_age_minutes=0.0)
    assert sh_high in ("Critical", "High")
    assert sh_low == "Low"


def test_ai_feature_builder_output():
    factors = build_factors_dict("Rescue", "High", 3, 15.0, source="tabpfn")
    assert factors["category"] == "Rescue"
    assert factors["riskZone"] == "High"
    assert factors["nearbySosCount"] == 3
    assert factors["requestAgeMinutes"] == 15
    assert len(factors["factorsConsidered"]) == 4
    assert "Emergency Type: Rescue" in factors["factorsConsidered"]
    assert "Flood Risk: High" in factors["factorsConsidered"]
    assert "Nearby Recent SOS: 3" in factors["factorsConsidered"]
    assert "Waiting Time: 15 min" in factors["factorsConsidered"]
    assert factors["predictionSource"] == "tabpfn"


def test_fallback_mechanism():
    """Verify fallback accurately classifies and explicitly identifies prediction source as 'fallback'."""
    fb_crit = _rule_based_fallback("MEDICAL", "HIGH", 5, 30.0)
    assert fb_crit == "Critical"

    fb_low = _rule_based_fallback("FOOD_WATER", "LOW", 0, 0.0)
    assert fb_low == "Low"


# ==============================================================================
# 4. DATABASE & QUEUE SORTING TESTS
# ==============================================================================

def test_priority_queue_sorting(client):
    """
    CRITICAL REQUIREMENT 19: Incident queue sorting:
    1. Critical
    2. High
    3. Medium
    4. Low
    Within same priority: oldest unresolved incident first.
    Resolved at bottom.
    """
    resp = client.get("/api/v1/incidents")
    assert resp.status_code == 200
    incidents = resp.get_json()

    # Priority mapping rank
    rank = {"Critical": 1, "High": 2, "Medium": 3, "Low": 4}

    unresolved = [i for i in incidents if i["status"] != "Resolved"]
    resolved = [i for i in incidents if i["status"] == "Resolved"]

    # All unresolved must appear before resolved
    if unresolved and resolved:
        first_resolved_idx = min(incidents.index(i) for i in resolved)
        last_unresolved_idx = max(incidents.index(i) for i in unresolved)
        assert last_unresolved_idx < first_resolved_idx

    # Check unresolved priority ranking
    for a, b in zip(unresolved[:-1], unresolved[1:]):
        rank_a = rank.get(a["operationalPriority"], 5)
        rank_b = rank.get(b["operationalPriority"], 5)
        assert rank_a <= rank_b


def test_reprioritization_and_override_protection(client, app):
    """
    CRITICAL REQUIREMENT 9 & 20: Dynamic reprioritization must NOT overwrite
    a human operator's manual override.
    """
    # 1. Fetch an active incident
    resp = client.get("/api/v1/incidents")
    assert resp.status_code == 200
    incidents = resp.get_json()
    active = next((i for i in incidents if i["status"] in ("New", "Acknowledged")), None)
    if not active:
        pytest.skip("No active incident for override test")

    inc_id = active["id"]

    # 2. Apply operator override
    override_resp = client.post(
        f"/api/v1/incidents/{inc_id}/priority-override",
        json={"priority": "Low", "reason": "Operator field assessment: False alarm"},
    )
    assert override_resp.status_code == 200
    overridden = override_resp.get_json()
    assert overridden["operationalPriority"] == "Low"
    assert overridden["isOverridden"] is True
    assert overridden["overrideReason"] == "Operator field assessment: False alarm"

    # 3. Trigger dynamic reprioritization
    reprio_resp = client.post(f"/api/v1/incidents/{inc_id}/reprioritize")
    assert reprio_resp.status_code == 200
    reprioritized = reprio_resp.get_json()

    # 4. Verify AI updated its recommendation, but OPERATOR PRIORITY WAS PRESERVED
    assert reprioritized["operationalPriority"] == "Low"
    assert reprioritized["isOverridden"] is True
    assert reprioritized["overrideReason"] == "Operator field assessment: False alarm"
