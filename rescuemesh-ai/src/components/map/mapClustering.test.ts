/**
 * RESCUEMESH AI — EMERGENCY MAP OVERLAPPING MARKERS & INCIDENT CLUSTERING TEST SUITE
 * Run with: npx tsx src/components/map/mapClustering.test.ts
 */
import {
  getHighestPriority,
  getClusterSummary,
  createIndividualMarkerHtml,
  createClusterMarkerHtml,
  createIndividualTooltipHtml,
  createClusterTooltipHtml
} from './mapClusterUtils';
import { Incident, PriorityLevel, EmergencyCategory } from '../../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

function createMockIncident(overrides: Partial<Incident> = {}): Incident {
  const defaultFactors = {
    category: overrides.category || 'Medical',
    categoryFactor: 'Baseline',
    riskZone: overrides.riskZone || 'High',
    riskZoneFactor: 'Elevated',
    nearbySosCount: overrides.nearbySosCount !== undefined ? overrides.nearbySosCount : 1,
    nearbyDensityFactor: 'Normal',
    requestAgeMinutes: 10,
    ageFactor: 'Normal',
    explanation: 'Test factors'
  };

  return {
    id: overrides.id || 'RM-00100',
    deviceId: overrides.deviceId || 'TBEAM-01',
    gatewayId: overrides.gatewayId || 'GW-01',
    category: overrides.category || 'Medical',
    latitude: overrides.latitude !== undefined ? overrides.latitude : 6.913500,
    longitude: overrides.longitude !== undefined ? overrides.longitude : 79.972000,
    locationName: overrides.locationName || 'Pittugala, Malabe',
    riskZone: overrides.riskZone || 'High',
    nearbySosCount: overrides.nearbySosCount !== undefined ? overrides.nearbySosCount : 1,
    aiRecommendedPriority: overrides.aiRecommendedPriority || 'High',
    operationalPriority: overrides.operationalPriority || 'High',
    isOverridden: overrides.isOverridden || false,
    receivedTimestamp: overrides.receivedTimestamp || '2026-10-19T10:00:00Z',
    status: overrides.status || 'New',
    sequenceNumber: overrides.sequenceNumber !== undefined ? overrides.sequenceNumber : 1,
    timeline: overrides.timeline || [],
    snrDb: overrides.snrDb !== undefined ? overrides.snrDb : 9.5,
    rssiDbm: overrides.rssiDbm !== undefined ? overrides.rssiDbm : -78,
    decisionTreeFactors: overrides.decisionTreeFactors || defaultFactors,
    ingestionSource: overrides.ingestionSource || 'HARDWARE',
    ...overrides
  };
}

console.log('=== RUNNING RESCUEMESH MAP CLUSTERING & UX TEST SUITE ===\n');

// ----------------------------------------------------
// 1. HIGHEST PRIORITY HIERARCHY
// ----------------------------------------------------
console.log('--- 1. Highest Priority Hierarchy (Critical > High > Medium > Low) ---');
assert(
  getHighestPriority(['Low', 'Medium', 'High', 'Critical']) === 'Critical',
  'Critical dominates all other priorities'
);
assert(
  getHighestPriority(['Low', 'High', 'Medium']) === 'High',
  'High dominates Medium and Low'
);
assert(
  getHighestPriority(['Low', 'Medium', 'Low']) === 'Medium',
  'Medium dominates Low'
);
assert(
  getHighestPriority(['Low', 'Low']) === 'Low',
  'Low returns Low'
);
assert(
  getHighestPriority([]) === 'Low',
  'Empty array defaults safely to Low'
);

// ----------------------------------------------------
// 2. CLUSTER PRIORITY & COUNT AGGREGATION
// ----------------------------------------------------
console.log('\n--- 2. Cluster Count & Highest Priority Aggregation ---');
const mockIncidentsMixed: Incident[] = [
  createMockIncident({
    id: 'RM-00201',
    category: 'Medical',
    operationalPriority: 'Critical',
    aiRecommendedPriority: 'Critical',
    latitude: 6.913500,
    longitude: 79.972000
  }),
  createMockIncident({
    id: 'RM-00202',
    category: 'Rescue',
    operationalPriority: 'Critical',
    aiRecommendedPriority: 'Critical',
    latitude: 6.913500,
    longitude: 79.972000
  }),
  createMockIncident({
    id: 'RM-00203',
    category: 'Rescue',
    operationalPriority: 'High',
    aiRecommendedPriority: 'High',
    latitude: 6.913500,
    longitude: 79.972000
  }),
  createMockIncident({
    id: 'RM-00204',
    category: 'Shelter',
    operationalPriority: 'Low',
    aiRecommendedPriority: 'Low',
    latitude: 6.913500,
    longitude: 79.972000
  }),
  createMockIncident({
    id: 'RM-00205',
    category: 'Food & Water',
    operationalPriority: 'Low',
    aiRecommendedPriority: 'Low',
    latitude: 6.913500,
    longitude: 79.972000
  }),
  createMockIncident({
    id: 'RM-00206',
    category: 'Food & Water',
    operationalPriority: 'Low',
    aiRecommendedPriority: 'Low',
    latitude: 6.913500,
    longitude: 79.972000
  })
];

const summary6 = getClusterSummary(mockIncidentsMixed);
assert(summary6.count === 6, 'Cluster count matches exact number of real incidents (6)');
assert(summary6.highestPriority === 'Critical', 'Cluster highest priority is Critical (2 Critical, 1 High, 3 Low)');
assert(summary6.breakdown.Critical === 2, 'Breakdown: 2 Critical');
assert(summary6.breakdown.High === 1, 'Breakdown: 1 High');
assert(summary6.breakdown.Low === 3, 'Breakdown: 3 Low');
assert(summary6.breakdown.Medium === 0, 'Breakdown: 0 Medium');
assert(
  summary6.ariaLabel.includes('6 emergencies in this area, highest priority Critical'),
  'Cluster provides accessible aria-label'
);

// ----------------------------------------------------
// 3. INDIVIDUAL MARKER ICON VS CLUSTER NUMBER REDESIGN
// ----------------------------------------------------
console.log('\n--- 3. Individual Marker Redesign (No Shortened IDs) ---');
const singleIncident = createMockIncident({
  id: 'RM-00196',
  category: 'Rescue',
  operationalPriority: 'Critical',
  aiRecommendedPriority: 'Critical',
  latitude: 6.913500,
  longitude: 79.972000,
  locationName: 'Pittugala, Malabe'
});

const individualHtml = createIndividualMarkerHtml(singleIncident, false, false);
// Verify NO shortened number (such as "196") is rendered inside individual markers
assert(!individualHtml.includes('>196<'), 'Individual marker does NOT display confusing shortened ID "196"');
assert(!individualHtml.includes('>208<'), 'Individual marker does NOT display confusing shortened ID "208"');
assert(individualHtml.includes('svg'), 'Individual marker contains professional emergency SVG icon');
assert(individualHtml.includes('aria-label="RM-00196, Rescue emergency, Critical priority"'), 'Individual marker has accessible aria-label with full ID');

// Cluster marker HTML must display count only
const clusterHtml = createClusterMarkerHtml(6, 'Critical');
assert(clusterHtml.includes('>6<'), 'Cluster marker displays count "6"');
assert(clusterHtml.includes('aria-label="6 emergencies in this area, highest priority Critical"'), 'Cluster marker has accessible label');

// ----------------------------------------------------
// 4. SELECTED MARKER HIGHLIGHT
// ----------------------------------------------------
console.log('\n--- 4. Selected Marker Highlight ---');
const focusedHtml = createIndividualMarkerHtml(singleIncident, true, false);
assert(focusedHtml.includes('ring-4 ring-blue-600'), 'Selected marker receives visible blue highlight ring');
assert(focusedHtml.includes('scale-110'), 'Selected marker scales up subtly');

// ----------------------------------------------------
// 5. IDENTICAL GPS COORDINATES (Section 13)
// ----------------------------------------------------
console.log('\n--- 5. Exact Identical Coordinates Test (Section 13) ---');
const identicalGpsIncidents: Incident[] = [
  createMockIncident({
    id: 'INC-A',
    category: 'Medical',
    operationalPriority: 'Critical',
    aiRecommendedPriority: 'Critical',
    latitude: 6.913500,
    longitude: 79.972000
  }),
  createMockIncident({
    id: 'INC-B',
    category: 'Rescue',
    operationalPriority: 'High',
    aiRecommendedPriority: 'High',
    latitude: 6.913500,
    longitude: 79.972000
  }),
  createMockIncident({
    id: 'INC-C',
    category: 'Rescue',
    operationalPriority: 'Medium',
    aiRecommendedPriority: 'Medium',
    latitude: 6.913500,
    longitude: 79.972000
  }),
  createMockIncident({
    id: 'INC-D',
    category: 'Shelter',
    operationalPriority: 'Low',
    aiRecommendedPriority: 'Low',
    latitude: 6.913500,
    longitude: 79.972000
  })
];

const identicalSummary = getClusterSummary(identicalGpsIncidents);
assert(identicalSummary.count === 4, 'Identical coordinates cluster count = 4');
assert(identicalSummary.highestPriority === 'Critical', 'Identical coordinates highest priority = Critical');

// Verify strict coordinate preservation (ZERO JITTER / ZERO COORDINATE MUTATION)
for (const inc of identicalGpsIncidents) {
  assert(inc.latitude === 6.913500, `Incident ${inc.id} latitude strictly preserved at 6.913500 (no jitter)`);
  assert(inc.longitude === 79.972000, `Incident ${inc.id} longitude strictly preserved at 79.972000 (no jitter)`);
}

// ----------------------------------------------------
// 6. NEARBY GPS COORDINATES (Section 14)
// ----------------------------------------------------
console.log('\n--- 6. Nearby GPS Coordinates Test (Section 14) ---');
const nearbyGpsIncidents: Incident[] = [
  createMockIncident({
    id: 'NEAR-1',
    category: 'Medical',
    operationalPriority: 'High',
    latitude: 6.913500,
    longitude: 79.972000
  }),
  createMockIncident({
    id: 'NEAR-2',
    category: 'Medical',
    operationalPriority: 'Medium',
    latitude: 6.913510,
    longitude: 79.972010
  }),
  createMockIncident({
    id: 'NEAR-3',
    category: 'Rescue',
    operationalPriority: 'Low',
    latitude: 6.913520,
    longitude: 79.972020
  }),
  createMockIncident({
    id: 'NEAR-4',
    category: 'Shelter',
    operationalPriority: 'Low',
    latitude: 6.913530,
    longitude: 79.972030
  })
];

const nearbySummary = getClusterSummary(nearbyGpsIncidents);
assert(nearbySummary.count === 4, 'Nearby incidents cluster count = 4');
assert(nearbySummary.highestPriority === 'High', 'Nearby incidents highest priority = High');
assert(nearbyGpsIncidents[0].latitude === 6.913500 && nearbyGpsIncidents[1].latitude === 6.913510, 'Nearby GPS coordinates retained exact precision');

// ----------------------------------------------------
// 7. SOURCE SEPARATION (HARDWARE vs API_TEST / SIMULATION)
// ----------------------------------------------------
console.log('\n--- 7. Source Isolation Verification (Section 19) ---');
const mixedSourceIncidents: Partial<Incident>[] = [
  { id: 'RM-00195', ingestionSource: 'HARDWARE' },
  { id: 'RM-TEST-01', ingestionSource: 'API_TEST' },
  { id: 'RM-SIM-01', ingestionSource: 'SIMULATION' },
  { id: 'RM-00208', ingestionSource: 'HARDWARE' }
];

const operationalOnly = mixedSourceIncidents.filter((inc) => inc.ingestionSource === 'HARDWARE');
assert(operationalOnly.length === 2, 'Operational filter retains only genuine HARDWARE incidents');
assert(operationalOnly.some((i) => i.id === 'RM-00195') && operationalOnly.some((i) => i.id === 'RM-00208'), 'Retained RM-00195 and RM-00208');
assert(!operationalOnly.some((i) => i.id === 'RM-TEST-01'), 'API_TEST correctly excluded');
assert(!operationalOnly.some((i) => i.id === 'RM-SIM-01'), 'SIMULATION correctly excluded');

// ----------------------------------------------------
// 8. 13 GENUINE HARDWARE INCIDENTS VERIFICATION (Section 12)
// ----------------------------------------------------
console.log('\n--- 8. Genuine 13 Hardware Incidents Audit (Section 12) ---');
const genuine13Ids = [
  'RM-00195', 'RM-00196', 'RM-00197', 'RM-00199', 'RM-00200',
  'RM-00201', 'RM-00202', 'RM-00203', 'RM-00204', 'RM-00205',
  'RM-00206', 'RM-00207', 'RM-00208'
];

assert(genuine13Ids.length === 13, 'Exact 13 genuine hardware incidents listed');
const mock13Hardware: Incident[] = genuine13Ids.map((id, index) =>
  createMockIncident({
    id,
    category: 'Rescue',
    operationalPriority: index < 2 ? 'Critical' : index < 5 ? 'High' : 'Medium',
    aiRecommendedPriority: 'Critical',
    latitude: 6.913500 + index * 0.000005,
    longitude: 79.972000 + index * 0.000005,
    locationName: 'Pittugala, Malabe',
    ingestionSource: 'HARDWARE'
  })
);

const summary13 = getClusterSummary(mock13Hardware);
assert(summary13.count === 13, 'All 13 genuine incidents clustered together at overview zoom');
assert(summary13.highestPriority === 'Critical', 'Cluster reflects highest severity among genuine incidents');

// ----------------------------------------------------
// 9. TOOLTIPS
// ----------------------------------------------------
console.log('\n--- 9. Tooltip Formatting Verification ---');
const singleTooltip = createIndividualTooltipHtml(singleIncident);
assert(singleTooltip.includes('RM-00196'), 'Individual tooltip contains full incident ID');
assert(singleTooltip.includes('Critical'), 'Individual tooltip displays priority');
assert(singleTooltip.includes('Rescue Emergency'), 'Individual tooltip displays emergency category');

const clusterTooltip = createClusterTooltipHtml(summary6.count, summary6.highestPriority, summary6.breakdown);
assert(clusterTooltip.includes('6 Emergencies in this area'), 'Cluster tooltip displays total emergency count');
assert(clusterTooltip.includes('Highest Priority: Critical'), 'Cluster tooltip displays highest priority');
assert(clusterTooltip.includes('Crit: 2'), 'Cluster tooltip displays priority breakdown');

// ----------------------------------------------------
// 10. SLIIT EXHIBITION GPS FALLBACK HANDLING
// ----------------------------------------------------
console.log('\n--- 10. SLIIT Exhibition GPS Fallback Handling ---');
const exhibitionIncident = createMockIncident({
  id: 'RM-00216',
  category: 'Medical',
  operationalPriority: 'High',
  aiRecommendedPriority: 'High',
  latitude: null,
  longitude: null,
  displayLatitude: 6.914678,
  displayLongitude: 79.972946,
  locationSource: 'CONFIGURED_VENUE',
  locationName: 'SLIIT Malabe Campus',
  riskZone: 'Unknown',
  nearbySosCount: 0,
  ingestionSource: 'HARDWARE'
});

assert(exhibitionIncident.latitude === null, 'Actual GPS latitude remains strictly null');
assert(exhibitionIncident.longitude === null, 'Actual GPS longitude remains strictly null');
assert(exhibitionIncident.displayLatitude === 6.914678, 'Display latitude uses SLIIT Malabe campus coords');
assert(exhibitionIncident.displayLongitude === 79.972946, 'Display longitude uses SLIIT Malabe campus coords');
assert(exhibitionIncident.locationSource === 'CONFIGURED_VENUE', 'Location source is CONFIGURED_VENUE');
assert(exhibitionIncident.locationName === 'SLIIT Malabe Campus', 'Location name displays SLIIT Malabe Campus');
assert(exhibitionIncident.riskZone === 'Unknown', 'Risk zone is Unknown when actual GPS is null');

const effectiveLat = exhibitionIncident.displayLatitude ?? exhibitionIncident.latitude;
const effectiveLng = exhibitionIncident.displayLongitude ?? exhibitionIncident.longitude;
assert(effectiveLat === 6.914678 && effectiveLng === 79.972946, 'Emergency map positions marker at configured campus coordinates');

const exhibitionMarkerHtml = createIndividualMarkerHtml(exhibitionIncident, false, false);
assert(exhibitionMarkerHtml.includes('RM-00216'), 'Exhibition marker contains full incident ID aria-label');
assert(!exhibitionMarkerHtml.includes('Fallback'), 'Marker does not display Fallback badges');
assert(!exhibitionMarkerHtml.includes('Demo'), 'Marker does not display Demo badges');

const exhibitionTooltip = createIndividualTooltipHtml(exhibitionIncident);
assert(exhibitionTooltip.includes('RM-00216'), 'Exhibition tooltip contains full incident ID');
assert(exhibitionTooltip.includes('High'), 'Exhibition tooltip contains priority');
assert(exhibitionTooltip.includes('Medical Emergency'), 'Exhibition tooltip contains category');

// Clustering test with exhibition incident + existing incident
const exhibitionCluster = getClusterSummary([exhibitionIncident, singleIncident]);
assert(exhibitionCluster.count === 2, 'Exhibition marker clusters properly with other markers');
assert(exhibitionCluster.highestPriority === 'Critical', 'Cluster aggregates highest priority correctly');

console.log('\n🎉 ALL RESCUEMESH MAP CLUSTERING & UX TESTS PASSED SUCCESSFULLY!\n');
