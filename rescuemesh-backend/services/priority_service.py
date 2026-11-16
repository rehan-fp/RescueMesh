"""
Priority calculation service for RescueMesh.

Connects directly to the real TabPFN tabular classifier (ai.model_service).
Preserves the calculate_ai_priority() interface for backward compatibility.
"""

from __future__ import annotations

from typing import Any, Dict, Tuple
from ai.model_service import get_model_service


def calculate_ai_priority(
    category: str,
    risk_zone: str,
    nearby_sos_count: int,
    request_age_minutes: float = 0.0,
) -> Tuple[str, Dict[str, Any]]:
    """
    Computes priority using the genuine TabPFN model pipeline.

    Returns:
        (priority, factors) where priority is 'Critical', 'High', 'Medium', or 'Low'
        and factors is a dictionary containing the factors considered, prediction source,
        and human-readable explanations.
    """
    model_service = get_model_service()
    priority, source, factors = model_service.predict(
        category=category,
        flood_risk=risk_zone,
        nearby_sos_count=nearby_sos_count,
        request_age_minutes=request_age_minutes,
    )
    return priority, factors
