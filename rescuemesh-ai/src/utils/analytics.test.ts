import {
  filterIncidentsByTimeRange,
  computeSummaryMetrics,
  computeCategoryDistribution,
  computePriorityDistribution,
  computeAreaDistribution,
  computeActivityOverTime,
  computeTeamActivity,
  computePriorityReview,
  generateCsvReport,
} from './analytics';
import { Incident, RescueTeam } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== RUNNING RESCUEMESH ANALYTICS TEST SUITE ===');

const mockTeams: RescueTeam[] = [
  {
    id: 'TEAM-01',
    name: 'Colombo Alpha Squad',
    type: 'Boat Rescue',
    status: 'Available',
    baseLocation: 'Colombo Hub',
    latitude: 6.9271,
    longitude: 79.8612,
    teamLead: 'Captain Perera',
    contactPhone: '+94771234567',
    lastUpdate: 'Just now',
    completedIncidentsToday: 2,
    currentAssignmentsCount: 0,
  },
  {
    id: 'TEAM-02',
    name: 'Gampaha Medical Unit',
    type: 'Medical',
    status: 'Assigned',
    baseLocation: 'Gampaha Center',
    latitude: 7.084,
    longitude: 79.993,
    teamLead: 'Dr. Silva',
    contactPhone: '+94779876543',
    lastUpdate: 'Just now',
    completedIncidentsToday: 0,
    currentAssignmentsCount: 1,
  },
];

const referenceDate = new Date('2026-10-19T12:00:00Z');

const mockIncidents: Incident[] = [
  {
    id: 'RM-101',
    deviceId: 'NODE_001',
    gatewayId: 'GW_001',
    category: 'Medical',
    latitude: 6.906,
    longitude: 79.967,
    locationName: 'Malabe Hospital Road',
    locality: 'Malabe',
    district: 'Colombo District',
    riskZone: 'High',
    nearbySosCount: 2,
    aiRecommendedPriority: 'Critical',
    operationalPriority: 'Critical',
    isOverridden: false,
    receivedTimestamp: '2026-10-19T10:00:00Z',
    acknowledgedTimestamp: '2026-10-19T10:00:30Z', // 30s response
    sequenceNumber: 1,
    status: 'Acknowledged',
    isNewPulse: false,
    timeline: [],
    snrDb: 10,
    rssiDbm: -80,
    decisionTreeFactors: {} as any,
  },
  {
    id: 'RM-102',
    deviceId: 'NODE_002',
    gatewayId: 'GW_001',
    category: 'Rescue',
    latitude: 6.902,
    longitude: 79.961,
    locationName: 'Pittugala Waterway',
    locality: 'Pittugala',
    district: 'Colombo District',
    riskZone: 'High',
    nearbySosCount: 1,
    aiRecommendedPriority: 'Critical',
    operationalPriority: 'Critical',
    isOverridden: false,
    receivedTimestamp: '2026-10-19T11:00:00Z',
    assignedTimestamp: '2026-10-19T11:01:00Z', // 60s response
    assignedTeamId: 'TEAM-01',
    assignedTeamName: 'Colombo Alpha Squad',
    sequenceNumber: 2,
    status: 'Assigned',
    isNewPulse: false,
    timeline: [],
    snrDb: 10,
    rssiDbm: -80,
    decisionTreeFactors: {} as any,
  },
  {
    id: 'RM-103',
    deviceId: 'NODE_003',
    gatewayId: 'GW_001',
    category: 'Food & Water',
    latitude: 7.21,
    longitude: 79.84,
    locationName: 'Negombo Coastal Junction',
    locality: 'Negombo',
    district: 'Gampaha District',
    riskZone: 'Medium',
    nearbySosCount: 0,
    aiRecommendedPriority: 'Medium',
    operationalPriority: 'High',
    isOverridden: true,
    overrideReason: 'Elderly residents stranded without water',
    receivedTimestamp: '2026-10-18T15:00:00Z', // Yesterday
    resolvedTimestamp: '2026-10-18T16:30:00Z',
    assignedTeamId: 'TEAM-02',
    assignedTeamName: 'Gampaha Medical Unit',
    sequenceNumber: 3,
    status: 'Resolved',
    isNewPulse: false,
    timeline: [],
    snrDb: 10,
    rssiDbm: -80,
    decisionTreeFactors: {} as any,
  },
  {
    id: 'RM-104',
    deviceId: 'NODE_004',
    gatewayId: 'GW_001',
    category: 'Shelter',
    latitude: 6.93,
    longitude: 79.85,
    locationName: 'Colombo Central Shelter',
    locality: 'Colombo',
    district: 'Colombo District',
    riskZone: 'Low',
    nearbySosCount: 0,
    aiRecommendedPriority: 'Low',
    operationalPriority: 'Low',
    isOverridden: false,
    receivedTimestamp: '2026-10-15T08:00:00Z', // 4 days ago
    sequenceNumber: 4,
    status: 'New', // No action timestamps
    isNewPulse: false,
    timeline: [],
    snrDb: 10,
    rssiDbm: -80,
    decisionTreeFactors: {} as any,
  },
];

// Test 1: Date Range Filtering
const todayIncidents = filterIncidentsByTimeRange(mockIncidents, 'today', referenceDate);
assert(todayIncidents.length === 2, `Today filter returns 2 incidents (got ${todayIncidents.length})`);
assert(todayIncidents.every((i) => i.id === 'RM-101' || i.id === 'RM-102'), 'Today incidents are RM-101 and RM-102');

const sevenDayIncidents = filterIncidentsByTimeRange(mockIncidents, '7d', referenceDate);
assert(sevenDayIncidents.length === 4, `7d filter returns all 4 incidents within past week (got ${sevenDayIncidents.length})`);

// Test 2: Summary Metrics (Empty List)
const emptyMetrics = computeSummaryMetrics([]);
assert(emptyMetrics.totalEmergencies === 0, 'Empty list total is 0');
assert(emptyMetrics.criticalEmergencies === 0, 'Empty list critical is 0');
assert(emptyMetrics.resolvedEmergencies === 0, 'Empty list resolved is 0');
assert(emptyMetrics.activeEmergencies === 0, 'Empty list active is 0');
assert(emptyMetrics.averageResponseTimeFormatted === '—', 'Empty list avg response time formatted is "—"');
assert(!emptyMetrics.hasResponseTimeData, 'Empty list hasResponseTimeData is false');

// Test 3: Summary Metrics (Today Incidents)
// RM-101 (delta: 30s), RM-102 (delta: 60s) -> avg delta = 45s
const todayMetrics = computeSummaryMetrics(todayIncidents);
assert(todayMetrics.totalEmergencies === 2, 'Today total emergencies is 2');
assert(todayMetrics.criticalEmergencies === 2, 'Today critical emergencies is 2');
assert(todayMetrics.resolvedEmergencies === 0, 'Today resolved emergencies is 0');
assert(todayMetrics.activeEmergencies === 2, 'Today active emergencies is 2');
assert(todayMetrics.resolutionRateFormatted === '0% resolution rate', 'Today resolution rate is 0%');
assert(todayMetrics.hasResponseTimeData, 'Today has response time data');
assert(todayMetrics.averageResponseTimeSeconds === 45, `Today average response time is 45s (got ${todayMetrics.averageResponseTimeSeconds})`);
assert(todayMetrics.averageResponseTimeFormatted === '45s', `Today formatted response time is '45s' (got '${todayMetrics.averageResponseTimeFormatted}')`);

// Test 4: Summary Metrics with Resolved Emergency (7-day window)
const sevenDayMetrics = computeSummaryMetrics(sevenDayIncidents);
assert(sevenDayMetrics.totalEmergencies === 4, '7-day total emergencies is 4');
assert(sevenDayMetrics.resolvedEmergencies === 1, '7-day resolved emergencies is 1');
assert(sevenDayMetrics.activeEmergencies === 3, '7-day active emergencies is 3');
assert(sevenDayMetrics.resolutionRateFormatted === '25% resolution rate', '7-day resolution rate is 25%');

// Test 5: Category Distribution
const categories = computeCategoryDistribution(sevenDayIncidents);
assert(categories.length === 4, 'Categories array has 4 items');
const medical = categories.find((c) => c.name === 'Medical');
assert(medical?.count === 1 && medical?.percentage === 25, 'Medical count is 1 and 25%');

// Test 6: Priority Distribution
const priorities = computePriorityDistribution(sevenDayIncidents);
const critical = priorities.find((p) => p.name === 'Critical');
const high = priorities.find((p) => p.name === 'High');
assert(critical?.count === 2 && critical?.percentage === 50, 'Critical count is 2 and 50%');
assert(high?.count === 1 && high?.percentage === 25, 'High count is 1 and 25%');

// Test 7: Area Distribution
const areas = computeAreaDistribution(sevenDayIncidents);
assert(areas.length === 4, `Area count is 4 (got ${areas.length})`);
assert(areas[0].count === 1, 'Each area has 1 incident in test set');
assert(areas.some((a) => a.name === 'Malabe'), 'Areas include Malabe');
assert(areas.some((a) => a.name === 'Negombo'), 'Areas include Negombo');

// Test 8: Response Team Activity
const teamActivity = computeTeamActivity(sevenDayIncidents, mockTeams);
assert(teamActivity.length === 2, `Team activity has 2 assigned teams (got ${teamActivity.length})`);
const teamAlpha = teamActivity.find((t) => t.teamId === 'TEAM-01');
assert(teamAlpha?.assignedCount === 1, 'Team Alpha assigned count is 1');
assert(teamAlpha?.activeCount === 1, 'Team Alpha active count is 1');

// Test 9: Priority Review (Overrides Audit)
const review = computePriorityReview(sevenDayIncidents);
assert(review.total === 4, 'Review total is 4');
assert(review.acceptedCount === 3, 'Review accepted count is 3');
assert(review.overriddenCount === 1, 'Review overridden count is 1');
assert(review.overriddenPercentage === 25, 'Review overridden percentage is 25%');

// Test 10: CSV Generation
const csv = generateCsvReport(sevenDayIncidents, 'Last 7 Days', referenceDate);
assert(csv.includes('RescueMesh AI — Operational Emergency Report'), 'CSV header present');
assert(csv.includes('"RM-101"'), 'CSV contains RM-101');
assert(csv.includes('"Malabe Hospital Road"'), 'CSV contains location');

console.log('\n🎉 ALL ANALYTICS LOGIC TESTS PASSED! 🎉\n');
