import {
  getDeviceDisplayName,
  getDevicePurpose,
  getDeviceLocation,
  getDeviceSignalQuality,
  computeDeviceOperationalStatus,
} from './deviceCommunication';
import { IoTDevice, Incident } from '../types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  }
  console.log(`✅ PASSED: ${message}`);
}

console.log('=== RUNNING DEVICE COMMUNICATION LOGIC TEST SUITE ===');

const mockNode: IoTDevice = {
  id: 'NODE_001',
  name: 'T-Beam SOS Node NODE_001',
  type: 'Community Emergency Node',
  status: 'Online',
  lastSeen: 'Now',
  firmware: 'v1.4.2',
  gateway: 'GATEWAY_001',
  rssiDbm: -88,
  snrDb: 7.2,
  signalStrength: '-88 dBm (Good)',
  latitude: 6.906,
  longitude: 79.967,
  location: 'Kelaniya - Thorana Junction Sector',
  packetsTransmitted: 15,
  lastIncidentId: 'RM-201',
  frequencyBand: '433 MHz',
};

const mockGateway: IoTDevice = {
  id: 'GATEWAY_001',
  name: 'ESP32 + RA-02 LoRa Gateway',
  type: 'ESP32 LoRa Gateway',
  status: 'Online',
  lastSeen: 'Now',
  firmware: 'v2.1',
  gateway: 'Direct (Wi-Fi HTTPS Uplink)',
  rssiDbm: null as any,
  snrDb: null as any,
  signalStrength: 'Unavailable',
  latitude: 6.913,
  longitude: 79.972,
  location: 'Near NODE_001 (gateway position not reported)',
  packetsTransmitted: 20,
  lastIncidentId: 'RM-201',
  frequencyBand: '433 MHz',
};

const referenceDate = new Date('2026-10-19T12:00:00Z');

const mockActiveIncident: Incident = {
  id: 'RM-201',
  deviceId: 'NODE_001',
  gatewayId: 'GATEWAY_001',
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
  receivedTimestamp: '2026-10-19T11:45:00Z', // 15 mins ago
  sequenceNumber: 1,
  status: 'New',
  isNewPulse: true,
  battery: 64,
  timeline: [],
  snrDb: 7.2,
  rssiDbm: -88,
  decisionTreeFactors: {} as any,
};

// 1. Device Display Names
assert(
  getDeviceDisplayName(mockNode) === 'Emergency Device 001',
  `Node displays as 'Emergency Device 001' (got '${getDeviceDisplayName(mockNode)}')`
);
assert(
  getDeviceDisplayName(mockGateway) === 'Communication Equipment 001',
  `Gateway displays as 'Communication Equipment 001' (got '${getDeviceDisplayName(mockGateway)}')`
);

// 2. Device Purpose
assert(
  getDevicePurpose(mockNode) === 'Emergency Request Device',
  `Node purpose is 'Emergency Request Device'`
);
assert(
  getDevicePurpose(mockGateway) === 'Emergency Communication Station',
  `Gateway purpose is 'Emergency Communication Station'`
);

// 3. Location Resolution
assert(
  getDeviceLocation(mockNode, mockActiveIncident) === 'Malabe',
  `Node location resolves from linked incident locality: 'Malabe'`
);
assert(
  getDeviceLocation(mockGateway, null) === 'Disaster Management Command Center',
  `Gateway location resolves to 'Disaster Management Command Center'`
);

// 4. Signal Translation
assert(getDeviceSignalQuality(-75, 10).label === 'Excellent', '-75 dBm is Excellent');
assert(getDeviceSignalQuality(-88, 7).label === 'Good', '-88 dBm is Good');
assert(getDeviceSignalQuality(-102, 3).label === 'Fair', '-102 dBm is Fair');
assert(getDeviceSignalQuality(-118, -4).label === 'Weak', '-118 dBm is Weak');
assert(getDeviceSignalQuality(null, null).label === 'Unavailable', 'Null RSSI is Unavailable');

// 5. Operational Status Computation
const statusResult = computeDeviceOperationalStatus(mockNode, [mockActiveIncident], referenceDate);
assert(statusResult.status === 'Connected', `Recent contact (15m) gives 'Connected'`);
assert(statusResult.isEmergencyActive === true, 'Emergency is active');
assert(statusResult.batteryPercentage === 64, 'Battery percentage extracted as 64%');
assert(statusResult.relativeLastContact.includes('minute'), `Relative time contains minute (got '${statusResult.relativeLastContact}')`);

// 6. Needs Attention Transition (when active emergency exists but contact delayed > 1 hour)
const delayedIncident = { ...mockActiveIncident, receivedTimestamp: '2026-10-19T10:00:00Z' }; // 2 hours ago
const attentionResult = computeDeviceOperationalStatus(mockNode, [delayedIncident], referenceDate);
assert(attentionResult.status === 'Needs Attention', `Active emergency with contact 2h ago gives 'Needs Attention'`);

// 7. Standby Mode (when incident is resolved and contact was 2 hours ago)
const resolvedIncident = { ...mockActiveIncident, receivedTimestamp: '2026-10-19T10:00:00Z', status: 'Resolved' as any };
const standbyResult = computeDeviceOperationalStatus(mockNode, [resolvedIncident], referenceDate);
assert(standbyResult.status === 'Connected', `Resolved emergency in standby mode gives 'Connected'`);

// 8. Offline Transition (contact > 24 hours ago)
const oldIncident = { ...mockActiveIncident, receivedTimestamp: '2026-10-17T10:00:00Z' }; // 2 days ago
const offlineResult = computeDeviceOperationalStatus(mockNode, [oldIncident], referenceDate);
assert(offlineResult.status === 'Offline', `Contact 2 days ago gives 'Offline'`);

console.log('\n🎉 ALL DEVICE COMMUNICATION TESTS PASSED! 🎉\n');
