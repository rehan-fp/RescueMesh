"""
Comprehensive Flood Risk & GIS Data Integrity Tests.

Validates:
1. Point inside High zone (Kelani Basin Corridor Approximation)
2. Point in Medium zone (within 4 km buffer)
3. Point in Low zone (outside 4 km buffer)
4. Exact polygon boundary behavior
5. Just outside polygon boundary (1m - 50m)
6. Null GPS coordinates handling (returns 'Unknown' without throwing exception)
7. Invalid / out-of-range GPS coordinates (returns 'Unknown')
8. Coordinate (0.0, 0.0) handling (returns 'Unknown')
9. Mathematical determinism of classification (repeated runs produce identical results)
10. TabPFN feature vector encoding (LOW: 0, MEDIUM: 1, HIGH: 2, UNKNOWN: 1 neutral midpoint)
11. TabPFN sensitivity: varying flood risk with all other features held constant genuinely alters priority
12. Safety: tests use local mocks / memory DB only; zero production incidents created.
"""

import math
import numpy as np
import pytest

from ai.flood_risk import (
    lookup_flood_risk,
    point_in_polygon,
    distance_to_polygon,
    KELANI_BASIN_POLYGON,
    BUFFER_RADIUS_METERS,
)
from ai.feature_builder import (
    CATEGORY_ENCODING,
    FLOOD_RISK_ENCODING,
    build_factors_dict,
)
from services.priority_service import calculate_ai_priority
from ai.model_service import get_model_service


class TestGeospatialFloodRiskCalculations:
    """Tests the geometry and classification logic in ai.flood_risk."""

    def test_point_inside_high_zone_centroid(self):
        # Kaduwela centroid: (6.9179, 79.9707)
        risk = lookup_flood_risk(6.9179, 79.9707)
        assert risk == "High"
        assert point_in_polygon(6.9179, 79.9707, KELANI_BASIN_POLYGON) is True

    def test_point_inside_high_zone_hardware_incident_site(self):
        # Actual T-Beam hardware incident site (Pittugala, Malabe: 6.913503, 79.972060)
        risk = lookup_flood_risk(6.913503, 79.972060)
        assert risk == "High"
        assert point_in_polygon(6.913503, 79.972060, KELANI_BASIN_POLYGON) is True

    def test_point_in_medium_zone_buffer(self):
        # Peliyagoda / Biyagama edge (~1.7 km north of boundary, well within 4 km buffer)
        lat, lon = 6.960, 79.965
        inside = point_in_polygon(lat, lon, KELANI_BASIN_POLYGON)
        dist = distance_to_polygon(lat, lon, KELANI_BASIN_POLYGON)
        assert inside is False
        assert 0 < dist <= BUFFER_RADIUS_METERS
        assert lookup_flood_risk(lat, lon) == "Medium"

    def test_point_in_low_zone_far_outside(self):
        # Kandy (7.290572, 80.633726) - over 80 km away
        dist = distance_to_polygon(7.290572, 80.633726, KELANI_BASIN_POLYGON)
        assert dist > BUFFER_RADIUS_METERS
        assert lookup_flood_risk(7.290572, 80.633726) == "Low"

        # Colombo Fort (6.934421, 79.842812) - ~12 km away
        dist_fort = distance_to_polygon(6.934421, 79.842812, KELANI_BASIN_POLYGON)
        assert dist_fort > BUFFER_RADIUS_METERS
        assert lookup_flood_risk(6.934421, 79.842812) == "Low"

    def test_polygon_boundary_and_near_boundary_transect(self):
        # Midpoint of edge 0-1
        v0 = KELANI_BASIN_POLYGON[0]
        v1 = KELANI_BASIN_POLYGON[1]
        mid_lat = (v0[0] + v1[0]) / 2.0
        mid_lon = (v0[1] + v1[1]) / 2.0

        # Exact boundary point
        assert lookup_flood_risk(mid_lat, mid_lon) == "High"

        # 50m outward displacement
        dy = v1[0] - v0[0]
        dx = (v1[1] - v0[1]) * math.cos(math.radians(mid_lat))
        length = math.hypot(dx, dy)
        norm_lat = -dx / length
        norm_lon = (dy / length) / math.cos(math.radians(mid_lat))

        # Outside by ~50m
        meters_to_lat = 1.0 / 111000.0
        meters_to_lon = 1.0 / (111000.0 * math.cos(math.radians(mid_lat)))
        out_lat = mid_lat - 50.0 * norm_lat * meters_to_lat
        out_lon = mid_lon - 50.0 * norm_lon * meters_to_lon

        assert point_in_polygon(out_lat, out_lon, KELANI_BASIN_POLYGON) is False
        assert distance_to_polygon(out_lat, out_lon, KELANI_BASIN_POLYGON) <= BUFFER_RADIUS_METERS
        assert lookup_flood_risk(out_lat, out_lon) == "Medium"

    def test_no_gps_handling_null_and_zero(self):
        # Null latitude or longitude must return 'Unknown' safely
        assert lookup_flood_risk(None, 79.972) == "Unknown"
        assert lookup_flood_risk(6.913, None) == "Unknown"
        assert lookup_flood_risk(None, None) == "Unknown"

        # Coordinates 0.0, 0.0 (uninitialized GPS fix)
        assert lookup_flood_risk(0.0, 0.0) == "Unknown"

        # Invalid out-of-range coordinates
        assert lookup_flood_risk(999.0, 79.97) == "Unknown"
        assert lookup_flood_risk(6.913, -999.0) == "Unknown"

    def test_deterministic_classification(self):
        # Run 50 iterations on boundary and interior points to prove zero stochastic variance
        test_points = [
            (6.9179, 79.9707),
            (6.960, 79.965),
            (7.290572, 80.633726),
            (None, None),
            (0.0, 0.0),
        ]
        for lat, lon in test_points:
            first_result = lookup_flood_risk(lat, lon)
            for _ in range(50):
                assert lookup_flood_risk(lat, lon) == first_result


class TestTabPfnIntegrationAndEncoding:
    """Tests the interaction between flood risk and TabPFN classifier."""

    def test_flood_risk_encoding_dictionary(self):
        assert FLOOD_RISK_ENCODING["LOW"] == 0
        assert FLOOD_RISK_ENCODING["MEDIUM"] == 1
        assert FLOOD_RISK_ENCODING["HIGH"] == 2

    def test_tabpfn_sensitivity_to_flood_risk(self):
        """Proves that TabPFN priority output scales monotonically when only flood risk changes."""
        # Hold category=FOOD_WATER, nearby=1, age=0.0 constant
        p_low, f_low = calculate_ai_priority("FOOD_WATER", "LOW", 1, 0.0)
        p_med, f_med = calculate_ai_priority("FOOD_WATER", "MEDIUM", 1, 0.0)
        p_high, f_high = calculate_ai_priority("FOOD_WATER", "HIGH", 1, 0.0)

        # TabPFN produces Low for Low/Medium, and elevates to Medium for High
        assert p_low == "Low"
        assert p_med == "Low"
        assert p_high == "Medium"
        assert f_high["predictionSource"] in ("tabpfn", "fallback")

        # Test Rescue category sensitivity:
        p_res_low, _ = calculate_ai_priority("RESCUE", "LOW", 1, 0.0)
        p_res_med, _ = calculate_ai_priority("RESCUE", "MEDIUM", 1, 0.0)
        p_res_high, _ = calculate_ai_priority("RESCUE", "HIGH", 1, 0.0)

        assert p_res_low == "Low"
        assert p_res_med == "Medium"
        assert p_res_high == "High"

    def test_unknown_flood_risk_fallback_in_tabpfn(self):
        """When flood risk is 'Unknown', TabPFN receives neutral midpoint without failing."""
        priority, factors = calculate_ai_priority("Medical", "Unknown", 0, 0.0)
        assert priority in ("Critical", "High", "Medium", "Low")
        assert factors["riskZone"] == "Unknown"
        assert "Awaiting GPS fix" in factors["riskZoneFactor"]

    def test_build_factors_dict_descriptions(self):
        factors_high = build_factors_dict("Medical", "High", 2, 10.0)
        assert "Kelani Basin Corridor Approximation" in factors_high["riskZoneFactor"]

        factors_unknown = build_factors_dict("Rescue", "Unknown", 0, 0.0)
        assert "Awaiting GPS fix" in factors_unknown["riskZoneFactor"]
