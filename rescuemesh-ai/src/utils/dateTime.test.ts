/**
 * Verification test suite for RescueMesh date, time, and relative age presentation.
 * Run with: npx tsx src/utils/dateTime.test.ts
 */
import {
  parseTimestamp,
  formatDateOnly,
  formatTimeOnly,
  formatExactDateTime,
  formatExactDateTimeWithZone,
  formatRelativeTime,
  formatIncidentDateTime,
  formatTimelineEventTimestamp,
  formatIsoDateOnly,
  formatTime24Only,
  OPERATIONAL_TIMEZONE,
  OPERATIONAL_TIMEZONE_LABEL
} from './dateTime';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log('=== RUNNING RESCUEMESH DATE/TIME TEST SUITE ===\n');

const BASE_NOW = new Date('2026-10-19T11:46:00Z');

// 1. Just now
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 10 * 1000), BASE_NOW) === 'Just now',
  '10 seconds ago -> "Just now"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 40 * 1000), BASE_NOW) === 'Just now',
  '40 seconds ago -> "Just now"'
);

// 2. Future timestamp caused by clock mismatch (Never display negative relative times)
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() + 60 * 1000), BASE_NOW) === 'Just now',
  'Future timestamp (+1 min clock skew) -> "Just now"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() + 5 * 60 * 1000), BASE_NOW) === 'Just now',
  'Future timestamp (+5 min clock skew) -> "Just now"'
);

// 3. 1 minute ago (singular grammar)
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 60 * 1000), BASE_NOW) === '1 minute ago',
  '60 seconds ago -> "1 minute ago"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 60 * 1000), BASE_NOW, { compact: true }) === '1 min ago',
  '60 seconds ago (compact) -> "1 min ago"'
);

// 4. 2 minutes ago (plural grammar)
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 2 * 60 * 1000), BASE_NOW) === '2 minutes ago',
  '2 minutes ago -> "2 minutes ago"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 2 * 60 * 1000), BASE_NOW, { compact: true }) === '2 mins ago',
  '2 minutes ago (compact) -> "2 mins ago"'
);

// 5. 59 minutes ago
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 59 * 60 * 1000), BASE_NOW) === '59 minutes ago',
  '59 minutes ago -> "59 minutes ago"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 59 * 60 * 1000), BASE_NOW, { compact: true }) === '59 mins ago',
  '59 minutes ago (compact) -> "59 mins ago"'
);

// 6. 1 hour ago (singular grammar)
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 60 * 60 * 1000), BASE_NOW) === '1 hour ago',
  '60 minutes ago -> "1 hour ago"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 60 * 60 * 1000), BASE_NOW, { compact: true }) === '1 hr ago',
  '60 minutes ago (compact) -> "1 hr ago"'
);

// 7. 2 hours ago (plural grammar)
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 2 * 3600 * 1000), BASE_NOW) === '2 hours ago',
  '2 hours ago -> "2 hours ago"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 2 * 3600 * 1000), BASE_NOW, { compact: true }) === '2 hrs ago',
  '2 hours ago (compact) -> "2 hrs ago"'
);

// 8. 12 hours ago
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 12 * 3600 * 1000), BASE_NOW) === '12 hours ago',
  '12 hours ago -> "12 hours ago"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 12 * 3600 * 1000), BASE_NOW, { compact: true }) === '12 hrs ago',
  '12 hours ago (compact) -> "12 hrs ago"'
);

// 9. 23 hours ago
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 23 * 3600 * 1000), BASE_NOW) === '23 hours ago',
  '23 hours ago -> "23 hours ago"'
);

// 10. 24 hours / 1 day ago (singular grammar)
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 24 * 3600 * 1000), BASE_NOW) === '1 day ago',
  '24 hours ago -> "1 day ago"'
);

// 11. 2 days ago (plural grammar)
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 48 * 3600 * 1000), BASE_NOW) === '2 days ago',
  '48 hours ago -> "2 days ago"'
);

// 12. 7 days ago
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 7 * 86400 * 1000), BASE_NOW) === '7 days ago',
  '7 days ago -> "7 days ago"'
);

// 13. Previous month
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 35 * 86400 * 1000), BASE_NOW) === '1 month ago',
  '35 days ago -> "1 month ago"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 65 * 86400 * 1000), BASE_NOW) === '2 months ago',
  '65 days ago -> "2 months ago"'
);

// 14. Previous year
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 370 * 86400 * 1000), BASE_NOW) === '1 year ago',
  '370 days ago -> "1 year ago"'
);
assert(
  formatRelativeTime(new Date(BASE_NOW.getTime() - 750 * 86400 * 1000), BASE_NOW) === '2 years ago',
  '750 days ago -> "2 years ago"'
);

// 15. Invalid and missing timestamps
assert(formatRelativeTime(null) === 'Time unavailable', 'null input -> "Time unavailable"');
assert(formatRelativeTime(undefined) === 'Time unavailable', 'undefined input -> "Time unavailable"');
assert(formatRelativeTime('') === 'Time unavailable', 'empty string -> "Time unavailable"');
assert(formatRelativeTime('not-a-valid-date') === 'Time unavailable', 'invalid string -> "Time unavailable"');

// 16. Exact date/time formatting
const sampleDate = new Date('2026-10-19T06:16:00Z'); // 11:46 AM in Asia/Colombo (UTC+5:30)
const exactResult = formatExactDateTime(sampleDate);
assert(exactResult.includes('19 Oct 2026'), `formatExactDateTime contains date "19 Oct 2026": ${exactResult}`);
assert(exactResult.includes('·'), `formatExactDateTime contains middle dot delimiter: ${exactResult}`);

// 17. ISO export formatting for CSV
const isoDate = formatIsoDateOnly(sampleDate);
assert(/^\d{4}-\d{2}-\d{2}$/.test(isoDate), `formatIsoDateOnly produces YYYY-MM-DD: ${isoDate}`);
const time24 = formatTime24Only(sampleDate);
assert(/^\d{2}:\d{2}:\d{2}$/.test(time24), `formatTime24Only produces HH:MM:SS: ${time24}`);

// 18. Live ticker progression simulation (Page left open for several minutes)
const incidentTime = new Date('2026-10-19T11:46:00Z');
let simulatedNow = new Date('2026-10-19T11:49:00Z'); // 3 minutes later
assert(
  formatRelativeTime(incidentTime, simulatedNow) === '3 minutes ago',
  'Simulated 3 minutes later -> "3 minutes ago"'
);

// Advance 1 minute (ticker fires)
simulatedNow = new Date('2026-10-19T11:50:00Z'); // 4 minutes later
assert(
  formatRelativeTime(incidentTime, simulatedNow) === '4 minutes ago',
  'Simulated live progression 3 mins -> 4 minutes ago without reload'
);

// 19. Sorting verification (Epoch sorting vs formatted string sorting)
const incidents = [
  { id: 'RM-001', receivedTimestamp: '2026-10-19T10:00:00Z', priority: 'High' }, // 1 hr 46 min ago
  { id: 'RM-002', receivedTimestamp: '2026-10-19T11:40:00Z', priority: 'High' }, // 6 min ago
  { id: 'RM-003', receivedTimestamp: '2026-10-18T11:46:00Z', priority: 'High' }, // 1 day ago
];

// Sort ascending (oldest first)
const sortedAsc = [...incidents].sort((a, b) => {
  const timeA = parseTimestamp(a.receivedTimestamp)?.getTime() || 0;
  const timeB = parseTimestamp(b.receivedTimestamp)?.getTime() || 0;
  return timeA - timeB;
});
assert(sortedAsc[0].id === 'RM-003', 'Ascending sort puts oldest (1 day ago) first: RM-003');
assert(sortedAsc[1].id === 'RM-001', 'Ascending sort puts middle (1 hr ago) second: RM-001');
assert(sortedAsc[2].id === 'RM-002', 'Ascending sort puts newest (6 min ago) last: RM-002');

// Sort descending (newest first)
const sortedDesc = [...incidents].sort((a, b) => {
  const timeA = parseTimestamp(a.receivedTimestamp)?.getTime() || 0;
  const timeB = parseTimestamp(b.receivedTimestamp)?.getTime() || 0;
  return timeB - timeA;
});
assert(sortedDesc[0].id === 'RM-002', 'Descending sort puts newest (6 min ago) first: RM-002');
assert(sortedDesc[2].id === 'RM-003', 'Descending sort puts oldest (1 day ago) last: RM-003');

// 20. Timeline event cross-day awareness
const todayEvent = formatTimelineEventTimestamp('2026-10-19T06:16:00Z', new Date('2026-10-19T12:00:00Z'));
const yesterdayEvent = formatTimelineEventTimestamp('2026-10-18T06:16:00Z', new Date('2026-10-19T12:00:00Z'));
assert(!yesterdayEvent.isSameDay, 'Yesterday event isSameDay === false');
assert(yesterdayEvent.display.includes('18 Oct 2026'), `Yesterday event display includes full date: ${yesterdayEvent.display}`);

// 21. Operational timezone verification (Asia/Colombo UTC+05:30)
const utcTimestamp = '2026-11-15T07:31:08Z';
assert(formatTimeOnly(utcTimestamp) === '1:01 PM', `07:31:08 UTC -> "1:01 PM" in Asia/Colombo, got ${formatTimeOnly(utcTimestamp)}`);
assert(formatDateOnly(utcTimestamp) === '15 Nov 2026', `07:31:08 UTC -> "15 Nov 2026" in Asia/Colombo, got ${formatDateOnly(utcTimestamp)}`);
assert(formatExactDateTime(utcTimestamp) === '15 Nov 2026 · 1:01 PM', `07:31:08 UTC -> "15 Nov 2026 · 1:01 PM", got ${formatExactDateTime(utcTimestamp)}`);
assert(formatExactDateTimeWithZone(utcTimestamp) === '15 Nov 2026 · 1:01 PM (+05:30)', `07:31:08 UTC -> "15 Nov 2026 · 1:01 PM (+05:30)", got ${formatExactDateTimeWithZone(utcTimestamp)}`);
assert(formatIsoDateOnly(utcTimestamp) === '2026-11-15', `07:31:08 UTC -> "2026-11-15", got ${formatIsoDateOnly(utcTimestamp)}`);
assert(formatTime24Only(utcTimestamp) === '13:01:08', `07:31:08 UTC -> "13:01:08", got ${formatTime24Only(utcTimestamp)}`);

// 22. Cross-day UTC to Asia/Colombo (+05:30) conversion
// 19:00 UTC on Nov 15 is 00:30 on Nov 16 in Asia/Colombo
const nightUtc = '2026-11-15T19:00:00Z';
assert(formatDateOnly(nightUtc) === '16 Nov 2026', `19:00 UTC Nov 15 crosses midnight to 16 Nov in Asia/Colombo, got ${formatDateOnly(nightUtc)}`);
assert(formatTimeOnly(nightUtc) === '12:30 AM', `19:00 UTC -> 12:30 AM in Asia/Colombo, got ${formatTimeOnly(nightUtc)}`);

console.log('\n🎉 ALL 27 TESTS PASSED SUCCESSFULLY! 🎉\n');
