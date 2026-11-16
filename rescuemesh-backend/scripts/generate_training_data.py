"""
Generate the canonical scenario-based disaster triage training dataset for RescueMesh TabPFN.

Grounding:
Based on humanitarian emergency triage principles (INSARAG, WHO disaster triage, FEMA incident management):
- Categories: RESCUE, MEDICAL, FOOD_WATER, SHELTER
- Flood Risk: HIGH, MEDIUM, LOW (Kelani River basin inundation zone)
- Nearby Recent SOS: 0 to 10+ (indicates casualty concentration / disaster density)
- Request Age: 0 to 90+ minutes (waiting duration for unresolved distress)
- Priorities: CRITICAL, HIGH, MEDIUM, LOW

Rules for Ground Truth Labeling:
1. MEDICAL:
   - High Flood Risk OR Nearby >= 3 OR Age >= 30 -> CRITICAL
   - Medium Flood Risk OR Nearby in [1, 2] OR Age in [10, 29] -> HIGH
   - Low Flood Risk AND Nearby == 0 AND Age < 10 -> HIGH or MEDIUM (non-critical medical triage)
   - Low Flood Risk, age == 0, isolated minor injury -> MEDIUM

2. RESCUE (Physical Extraction / Trapped):
   - High Flood Risk AND (Nearby >= 2 OR Age >= 15) -> CRITICAL
   - High Flood Risk AND Nearby < 2 AND Age < 15 -> HIGH
   - Medium Flood Risk AND (Nearby >= 3 OR Age >= 25) -> HIGH
   - Medium Flood Risk AND Nearby < 3 AND Age < 25 -> MEDIUM
   - Low Flood Risk AND Nearby <= 1 AND Age < 20 -> MEDIUM
   - Low Flood Risk, 0 nearby, 0 age -> LOW (minor obstruction, no immediate hazard)

3. FOOD_WATER:
   - Prolonged deprivation in flood zone (High risk AND Age >= 45 AND Nearby >= 4) -> CRITICAL
   - High risk AND (Nearby >= 3 OR Age >= 25) -> HIGH
   - Medium risk OR (Nearby >= 2 AND Age >= 20) -> MEDIUM
   - Low risk, isolated (Nearby <= 1, Age < 25) -> LOW

4. SHELTER:
   - Severe displacement cluster in hazard zone (High risk AND Nearby >= 6 AND Age >= 40) -> CRITICAL
   - High risk AND (Nearby >= 3 OR Age >= 30) -> HIGH
   - Medium risk OR (Nearby >= 2 AND Age >= 15) -> MEDIUM
   - Low risk, initial request -> LOW
"""

import os
import csv
from collections import Counter

OUTPUT_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "priority_training_data.csv")


def determine_priority(category: str, flood_risk: str, nearby_sos: int, age_min: float) -> str:
    category = category.upper()
    flood_risk = flood_risk.upper()

    if category == "MEDICAL":
        if flood_risk == "HIGH" or nearby_sos >= 4 or age_min >= 30:
            return "CRITICAL"
        elif flood_risk == "MEDIUM" or nearby_sos >= 2 or age_min >= 15:
            return "HIGH"
        elif nearby_sos >= 1 or age_min >= 5:
            return "HIGH"
        else:
            return "MEDIUM"

    elif category == "RESCUE":
        if flood_risk == "HIGH" and (nearby_sos >= 2 or age_min >= 15):
            return "CRITICAL"
        elif flood_risk == "HIGH":
            return "HIGH"
        elif flood_risk == "MEDIUM":
            if nearby_sos >= 4 or age_min >= 35:
                return "CRITICAL"
            elif nearby_sos >= 2 or age_min >= 15:
                return "HIGH"
            else:
                return "MEDIUM"
        else:  # LOW
            if nearby_sos >= 5 or age_min >= 45:
                return "HIGH"
            elif nearby_sos >= 2 or age_min >= 20:
                return "MEDIUM"
            else:
                return "LOW"

    elif category == "FOOD_WATER":
        if flood_risk == "HIGH" and nearby_sos >= 5 and age_min >= 45:
            return "CRITICAL"
        elif flood_risk == "HIGH" and (nearby_sos >= 3 or age_min >= 25):
            return "HIGH"
        elif flood_risk == "HIGH":
            return "MEDIUM"
        elif flood_risk == "MEDIUM":
            if nearby_sos >= 4 and age_min >= 35:
                return "HIGH"
            elif nearby_sos >= 2 or age_min >= 15:
                return "MEDIUM"
            else:
                return "LOW"
        else:  # LOW
            if nearby_sos >= 5 and age_min >= 45:
                return "MEDIUM"
            else:
                return "LOW"

    elif category == "SHELTER":
        if flood_risk == "HIGH" and nearby_sos >= 6 and age_min >= 45:
            return "CRITICAL"
        elif flood_risk == "HIGH" and (nearby_sos >= 3 or age_min >= 25):
            return "HIGH"
        elif flood_risk == "HIGH":
            return "MEDIUM"
        elif flood_risk == "MEDIUM":
            if nearby_sos >= 4 and age_min >= 30:
                return "HIGH"
            elif nearby_sos >= 2 or age_min >= 15:
                return "MEDIUM"
            else:
                return "LOW"
        else:  # LOW
            if nearby_sos >= 5 and age_min >= 40:
                return "MEDIUM"
            else:
                return "LOW"

    return "MEDIUM"


def generate_scenarios():
    categories = ["RESCUE", "MEDICAL", "FOOD_WATER", "SHELTER"]
    flood_risks = ["HIGH", "MEDIUM", "LOW"]
    nearby_counts = [0, 1, 2, 3, 5, 8]
    ages = [0, 5, 12, 25, 40, 60]

    records = []
    seen = set()

    for cat in categories:
        for fr in flood_risks:
            for nb in nearby_counts:
                for age in ages:
                    key = (cat, fr, nb, age)
                    if key in seen:
                        continue
                    seen.add(key)
                    priority = determine_priority(cat, fr, nb, age)
                    records.append({
                        "emergency_category": cat,
                        "flood_risk_level": fr,
                        "nearby_recent_sos_count": nb,
                        "request_age_minutes": age,
                        "priority": priority,
                    })

    return records


def main():
    os.makedirs(os.path.dirname(OUTPUT_PATH), exist_ok=True)
    scenarios = generate_scenarios()

    counts = Counter(r["priority"] for r in scenarios)
    print("Dataset Class Distribution:")
    for prio, count in counts.most_common():
        print(f"  {prio}: {count} ({count / len(scenarios) * 100:.1f}%)")
    print(f"Total scenario records: {len(scenarios)}")

    with open(OUTPUT_PATH, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "emergency_category",
                "flood_risk_level",
                "nearby_recent_sos_count",
                "request_age_minutes",
                "priority",
            ],
        )
        writer.writeheader()
        writer.writerows(scenarios)

    print(f"Successfully generated {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
