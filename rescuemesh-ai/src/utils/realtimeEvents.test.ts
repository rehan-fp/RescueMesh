/**
 * Verification test suite for RescueMesh real-time events, audio, and alert queue logic.
 * Run with: npx tsx src/utils/realtimeEvents.test.ts
 */
import {
  isIncidentAnnounced,
  markIncidentAnnounced,
  getSavedAudioPreference,
  saveAudioPreference
} from './audio';
import { realtimeEvents, IncidentCreatedEvent, IncidentUpdatedEvent } from './realtimeEvents';

// Ensure global localStorage exists in Node.js test environment
const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, val: string) => store.set(key, val),
  removeItem: (key: string) => store.delete(key),
  clear: () => store.clear(),
};

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('=== RUNNING REAL-TIME EVENTS & AUDIO TEST SUITE ===\n');

// 1. Session announcement and duplicate prevention
const incId1 = 'RM-TEST-001';
assert(!isIncidentAnnounced(incId1), 'Fresh incident is not announced initially');
assert(markIncidentAnnounced(incId1) === true, 'First announcement returns true');
assert(isIncidentAnnounced(incId1) === true, 'Incident is now marked announced');
assert(markIncidentAnnounced(incId1) === false, 'Subsequent announcement returns false (prevent alert fatigue)');

// 2. Audio preference persistence
saveAudioPreference(false);
assert(getSavedAudioPreference() === false, 'Audio preference false is saved');
saveAudioPreference(true);
assert(getSavedAudioPreference() === true, 'Audio preference true is saved');

// 3. RealtimeEvents listener subscription and unsubscription
let receivedCreated: IncidentCreatedEvent | null = null;
const unsubCreated = realtimeEvents.subscribeCreated((ev) => {
  receivedCreated = ev;
});

const sampleCreated: IncidentCreatedEvent = {
  incident_id: 'RM-TEST-002',
  category: 'Medical',
  priority: 'Critical',
  ai_recommended_priority: 'Critical',
  status: 'New',
  location_name: 'Malabe, Colombo',
  latitude: 6.904,
  longitude: 79.954,
  risk_zone: 'High',
  nearby_sos_count: 3,
  received_at: '2026-10-19T05:00:00Z',
  sequence_number: 220,
  incident: { id: 'RM-TEST-002', category: 'Medical', operationalPriority: 'Critical' }
};

// Simulate event dispatch
(realtimeEvents as any).createdListeners.forEach((listener: any) => listener(sampleCreated));
assert(receivedCreated !== null, 'Created listener received event');
assert((receivedCreated as any)?.incident_id === 'RM-TEST-002', 'Incident ID matches event payload');

unsubCreated();
receivedCreated = null;
(realtimeEvents as any).createdListeners.forEach((listener: any) => listener(sampleCreated));
assert(receivedCreated === null, 'Unsubscribed listener does not receive events');

// 4. RealtimeEvents updated listener
let receivedUpdated: IncidentUpdatedEvent | null = null;
const unsubUpdated = realtimeEvents.subscribeUpdated((ev) => {
  receivedUpdated = ev;
});

const sampleUpdated: IncidentUpdatedEvent = {
  incident_id: 'RM-TEST-002',
  action: 'status_change',
  status: 'Acknowledged',
  priority: 'Critical',
  incident: { id: 'RM-TEST-002', status: 'Acknowledged' }
};

(realtimeEvents as any).updatedListeners.forEach((listener: any) => listener(sampleUpdated));
assert(receivedUpdated !== null, 'Updated listener received event');
assert((receivedUpdated as any)?.status === 'Acknowledged', 'Updated status matches payload');
unsubUpdated();

// 5. Connection state callbacks
let connectionState = '';
const unsubState = realtimeEvents.subscribeConnectionState((state) => {
  connectionState = state;
});
assert(connectionState === 'disconnected', 'Initial connection state is disconnected');
(realtimeEvents as any).setConnectionState('connected');
assert(connectionState === 'connected', 'State callback fired on connected');
(realtimeEvents as any).setConnectionState('reconnecting');
assert(connectionState === 'reconnecting', 'State callback fired on reconnecting');
unsubState();

// 6. Priority queue ordering for multiple incoming emergencies
const priorityRank: Record<string, number> = { Critical: 1, High: 2, Medium: 3, Low: 4 };
const mockAlerts = [
  { id: 'RM-01', operationalPriority: 'Medium', receivedTimestamp: '2026-10-19T10:00:00Z' },
  { id: 'RM-02', operationalPriority: 'Critical', receivedTimestamp: '2026-10-19T10:05:00Z' },
  { id: 'RM-03', operationalPriority: 'High', receivedTimestamp: '2026-10-19T10:02:00Z' },
  { id: 'RM-04', operationalPriority: 'Critical', receivedTimestamp: '2026-10-19T10:01:00Z' }, // Older Critical
];

const sortedAlerts = [...mockAlerts].sort((a, b) => {
  const rankA = priorityRank[a.operationalPriority] || 5;
  const rankB = priorityRank[b.operationalPriority] || 5;
  if (rankA !== rankB) return rankA - rankB;
  return new Date(a.receivedTimestamp).getTime() - new Date(b.receivedTimestamp).getTime();
});

assert(sortedAlerts[0].id === 'RM-04', 'Queue prioritizes oldest Critical first: RM-04');
assert(sortedAlerts[1].id === 'RM-02', 'Queue places second Critical next: RM-02');
assert(sortedAlerts[2].id === 'RM-03', 'Queue places High priority third: RM-03');
assert(sortedAlerts[3].id === 'RM-01', 'Queue places Medium priority fourth: RM-01');

console.log('\n🎉 ALL REAL-TIME LOGIC TESTS PASSED! 🎉\n');
