import { EmergencyCategory, PriorityLevel, RiskZone, DecisionTreeFactors } from '../types';

/**
 * Stage 1 baseline classifier (academic comparison). Stage 4 uses TabPFN.
 *
 * Core Decision Features:
 * 1. Emergency Need Category (Medical / Rescue / Food & Water / Shelter)
 * 2. Flood Risk Zone (High / Medium / Low)
 * 3. Nearby Recent SOS Count (Unique recent SOS reports within 500m window — not an exact head count)
 * 4. Request Age (Minutes since initial distress signal)
 *
 * Ground-truth Logic:
 * - Branch 1 (Critical): Medical in High Risk Zone OR Rescue with >= 4 nearby SOS in High Risk Zone OR Medical with >= 3 nearby SOS
 * - Branch 2 (High): Medical in Medium Risk OR Rescue in High/Med Risk OR Food & Water in High Risk with >= 4 nearby SOS
 * - Branch 3 (Medium): Food & Water in Medium Risk OR Shelter in High/Med Risk OR Low Risk with high concentration
 * - Branch 4 (Low): Shelter in Low Risk OR Food & Water in Low Risk with isolated beacon
 */
export function calculateDecisionTreePriority(params: {
  category: EmergencyCategory;
  riskZone: RiskZone;
  nearbySosCount: number;
  requestAgeMinutes?: number;
}): { priority: PriorityLevel; factors: DecisionTreeFactors } {
  const { category, riskZone, nearbySosCount, requestAgeMinutes = 2 } = params;

  let priority: PriorityLevel = 'Medium';
  const factorExplanations: string[] = [];

  // 1. Category assessment
  let catFactor = '';
  if (category === 'Medical') {
    catFactor = 'Medical Emergency (Immediate triage requirement)';
    factorExplanations.push('Medical urgency');
  } else if (category === 'Rescue') {
    catFactor = 'Physical Extraction / Trapped (Evacuation boat requirement)';
    factorExplanations.push('Physical rescue needed');
  } else if (category === 'Food & Water') {
    catFactor = 'Food & Potable Water Relief (Ration delivery)';
    factorExplanations.push('Supply depletion risk');
  } else {
    catFactor = 'Temporary Shelter / Safe Refuge Request';
    factorExplanations.push('Displacement refuge request');
  }

  // 2. Risk Zone assessment
  let zoneFactor = '';
  if (riskZone === 'High') {
    zoneFactor = 'Flood Risk Zone: High';
    factorExplanations.push('High flood risk zone');
  } else if (riskZone === 'Medium') {
    zoneFactor = 'Flood Risk Zone: Medium';
    factorExplanations.push('Medium flood risk zone');
  } else {
    zoneFactor = 'Flood Risk Zone: Low';
    factorExplanations.push('Low flood risk zone');
  }

  // 3. Nearby Recent SOS Count
  let densityFactor = '';
  if (nearbySosCount >= 5) {
    densityFactor = `High Concentration (${nearbySosCount} unique recent SOS reports within 500m radius)`;
    factorExplanations.push('High concentration of recent SOS signals');
  } else if (nearbySosCount >= 2) {
    densityFactor = `Moderate Concentration (${nearbySosCount} unique recent SOS reports nearby)`;
    factorExplanations.push('Multiple nearby SOS signals');
  } else {
    densityFactor = `Isolated Request (${nearbySosCount} recent SOS report in sector)`;
    factorExplanations.push('Isolated distress signal');
  }

  // 4. Request Age
  let ageFactor = `Request Age: ${requestAgeMinutes} min`;
  if (requestAgeMinutes >= 30) {
    ageFactor += ' (Elevated waiting duration)';
  }

  // Decision Tree Classifier Execution
  if (category === 'Medical') {
    if (riskZone === 'High' || nearbySosCount >= 3 || requestAgeMinutes >= 20) {
      priority = 'Critical';
    } else {
      priority = 'High';
    }
  } else if (category === 'Rescue') {
    if (riskZone === 'High' && nearbySosCount >= 3) {
      priority = 'Critical';
    } else if (riskZone === 'High' || riskZone === 'Medium') {
      priority = 'High';
    } else {
      priority = 'Medium';
    }
  } else if (category === 'Food & Water') {
    if (riskZone === 'High' && nearbySosCount >= 5) {
      priority = 'High';
    } else if (riskZone === 'High' || riskZone === 'Medium') {
      priority = 'Medium';
    } else {
      priority = 'Low';
    }
  } else {
    // Shelter
    if (riskZone === 'High' && nearbySosCount >= 4) {
      priority = 'Medium';
    } else {
      priority = 'Low';
    }
  }

  return {
    priority,
    factors: {
      category,
      categoryFactor: catFactor,
      riskZone,
      riskZoneFactor: zoneFactor,
      nearbySosCount,
      nearbyDensityFactor: densityFactor,
      requestAgeMinutes,
      ageFactor: ageFactor,
      explanation: factorExplanations.join(' • ')
    }
  };
}
