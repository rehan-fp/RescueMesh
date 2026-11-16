/**
 * Centralized, operational date and time formatting utilities for RescueMesh.
 * 
 * Provides:
 * - Authoritative operational timezone formatting: Asia/Colombo (UTC+05:30)
 * - Robust parsing for ISO-8601 UTC strings, timestamps, and legacy time strings
 * - Timezone-invariant operational time display regardless of client browser locale
 * - Human-friendly relative time calculations ("Just now", "1 minute ago", "3 hours ago", "2 days ago")
 * - Compact relative time for high-density tables ("1 min ago", "3 hrs ago")
 * - Exact operational date/time ("19 Oct 2026 · 11:46 AM")
 * - Activity timeline date/time formatting with cross-day awareness
 * - Safe handling for clock skew, future timestamps, and invalid data
 */

export const OPERATIONAL_TIMEZONE = 'Asia/Colombo';
export const OPERATIONAL_TIMEZONE_LABEL = '+05:30';
export const OPERATIONAL_TIMEZONE_NAME = 'IST';

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: OPERATIONAL_TIMEZONE,
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: OPERATIONAL_TIMEZONE,
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});

const time24Formatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: OPERATIONAL_TIMEZONE,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false
});

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: OPERATIONAL_TIMEZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

/**
 * Parses any timestamp input into a valid Date object or null.
 * Correctly interprets UTC ISO strings without timezone shift bugs.
 */
export function parseTimestamp(input: string | number | Date | null | undefined): Date | null {
  if (input === null || input === undefined || input === '') return null;
  
  if (input instanceof Date) {
    return isNaN(input.getTime()) ? null : input;
  }
  
  if (typeof input === 'number') {
    // If epoch seconds rather than milliseconds
    const d = new Date(input < 1e11 ? input * 1000 : input);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(input).trim();
  if (!str) return null;

  // 1. Direct ISO-8601 parsing (e.g. 2026-10-19T06:16:32Z or 2026-10-19 06:16:32)
  if (str.includes('-') && (str.includes('T') || str.includes(' '))) {
    // If missing explicit timezone suffix, assume UTC to prevent local-browser skew
    const normalized = (str.endsWith('Z') || str.includes('+') || (str.lastIndexOf('-') > 7 && str.lastIndexOf('-') > str.indexOf('T')))
      ? str
      : str.includes('T')
      ? `${str}Z`
      : `${str.replace(' ', 'T')}Z`;

    const d = new Date(normalized);
    if (!isNaN(d.getTime())) return d;
  }

  // 2. Standard Date constructor attempt
  const directDate = new Date(str);
  if (!isNaN(directDate.getTime())) return directDate;

  // 3. Fallback for legacy "HH:MM" or "HH:MM:SS" time-only strings
  const timeMatch = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?(?:\s*(AM|PM))?$/i);
  if (timeMatch) {
    const now = new Date();
    let hours = parseInt(timeMatch[1], 10);
    const minutes = parseInt(timeMatch[2], 10);
    const seconds = timeMatch[3] ? parseInt(timeMatch[3], 10) : 0;
    const ampm = timeMatch[4]?.toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    const colomboDateStr = isoDateFormatter.format(now);
    const isoString = `${colomboDateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}+05:30`;
    const reconstructed = new Date(isoString);
    if (!isNaN(reconstructed.getTime())) {
      if (reconstructed.getTime() > now.getTime() + 60000) {
        reconstructed.setDate(reconstructed.getDate() - 1);
      }
      return reconstructed;
    }
  }

  return null;
}

/**
 * Returns formatted 12-hour time string in Asia/Colombo (UTC+05:30), e.g. "11:46 AM".
 */
export function formatTimeOnly(input: string | number | Date | null | undefined): string {
  const date = parseTimestamp(input);
  if (!date) return '—';

  return timeFormatter.format(date);
}

/**
 * Returns formatted date-only string in Asia/Colombo (UTC+05:30), e.g. "19 Oct 2026".
 */
export function formatDateOnly(input: string | number | Date | null | undefined): string {
  const date = parseTimestamp(input);
  if (!date) return '—';

  return dateFormatter.format(date);
}

/**
 * Returns exact operational date and time string in Asia/Colombo (UTC+05:30), e.g. "19 Oct 2026 · 11:46 AM".
 */
export function formatExactDateTime(input: string | number | Date | null | undefined): string {
  const date = parseTimestamp(input);
  if (!date) return 'Time unavailable';

  const dateStr = formatDateOnly(date);
  const timeStr = formatTimeOnly(date);

  return `${dateStr} · ${timeStr}`;
}

/**
 * Returns exact operational date and time string with explicit operational timezone badge,
 * e.g. "19 Oct 2026 · 11:46 AM (+05:30)".
 */
export function formatExactDateTimeWithZone(input: string | number | Date | null | undefined): string {
  const date = parseTimestamp(input);
  if (!date) return 'Time unavailable';

  return `${formatExactDateTime(date)} (${OPERATIONAL_TIMEZONE_LABEL})`;
}

/**
 * Returns formatted ISO date-only string ("YYYY-MM-DD") in Asia/Colombo for data exports and audit records.
 */
export function formatIsoDateOnly(input: string | number | Date | null | undefined): string {
  const date = parseTimestamp(input);
  if (!date) return '—';

  return isoDateFormatter.format(date);
}

/**
 * Returns formatted 24-hour time string with seconds ("HH:MM:SS") in Asia/Colombo for data exports and audit records.
 */
export function formatTime24Only(input: string | number | Date | null | undefined): string {
  const date = parseTimestamp(input);
  if (!date) return '—';

  return time24Formatter.format(date);
}

/**
 * Calculates human-friendly relative time from an actual incident timestamp.
 * Automatically handles clock skew, pluralization, and compact display options.
 *
 * Examples:
 * - "Just now"
 * - "1 minute ago" (compact: "1 min ago")
 * - "12 minutes ago" (compact: "12 mins ago")
 * - "1 hour ago" (compact: "1 hr ago")
 * - "3 hours ago" (compact: "3 hrs ago")
 * - "1 day ago" (compact: "1 day ago")
 * - "4 days ago" (compact: "4 days ago")
 */
export function formatRelativeTime(
  input: string | number | Date | null | undefined,
  now: Date = new Date(),
  options: { compact?: boolean } = {}
): string {
  const target = parseTimestamp(input);
  if (!target) return 'Time unavailable';

  const diffMs = now.getTime() - target.getTime();
  
  // Guard against any future timestamp caused by client clock skew or slight ingestion mismatch
  // Never display misleading negative relative times like "-1 minutes ago"
  if (diffMs <= 0) {
    return 'Just now';
  }

  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Under 45 seconds -> "Just now"
  if (diffSec < 45) {
    return 'Just now';
  }

  // Under 60 minutes
  if (diffMin < 60) {
    const mins = Math.max(1, diffMin);
    if (options.compact) {
      return mins === 1 ? '1 min ago' : `${mins} mins ago`;
    }
    return mins === 1 ? '1 minute ago' : `${mins} minutes ago`;
  }

  // Under 24 hours
  if (diffHour < 24) {
    if (options.compact) {
      return diffHour === 1 ? '1 hr ago' : `${diffHour} hrs ago`;
    }
    return diffHour === 1 ? '1 hour ago' : `${diffHour} hours ago`;
  }

  // Under 30 days
  if (diffDay < 30) {
    return diffDay === 1 ? '1 day ago' : `${diffDay} days ago`;
  }

  // Months
  if (diffDay < 365) {
    const months = Math.floor(diffDay / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }

  // Years
  const years = Math.floor(diffDay / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Returns structured representation containing exact, zoned, and relative date/times.
 */
export function formatIncidentDateTime(
  input: string | number | Date | null | undefined,
  now: Date = new Date()
): {
  exact: string;
  exactWithZone: string;
  relative: string;
  relativeCompact: string;
  dateOnly: string;
  timeOnly: string;
  timeZone: string;
  iso: string;
} {
  const date = parseTimestamp(input);
  if (!date) {
    return {
      exact: 'Time unavailable',
      exactWithZone: 'Time unavailable',
      relative: 'Time unavailable',
      relativeCompact: 'Time unavailable',
      dateOnly: '—',
      timeOnly: '—',
      timeZone: OPERATIONAL_TIMEZONE_LABEL,
      iso: ''
    };
  }

  return {
    exact: formatExactDateTime(date),
    exactWithZone: formatExactDateTimeWithZone(date),
    relative: formatRelativeTime(date, now, { compact: false }),
    relativeCompact: formatRelativeTime(date, now, { compact: true }),
    dateOnly: formatDateOnly(date),
    timeOnly: formatTimeOnly(date),
    timeZone: OPERATIONAL_TIMEZONE_LABEL,
    iso: date.toISOString()
  };
}

/**
 * Formats a timeline event timestamp.
 * If the event happened today in Asia/Colombo time, returns time only ("11:46 AM").
 * If the event occurred on a previous day, returns full date and time ("18 Oct 2026 · 11:46 PM").
 */
export function formatTimelineEventTimestamp(
  input: string | number | Date | null | undefined,
  now: Date = new Date()
): {
  display: string;
  relative: string;
  isSameDay: boolean;
  exact: string;
} {
  const date = parseTimestamp(input);
  if (!date) {
    return {
      display: typeof input === 'string' && input ? input : '—',
      relative: '',
      isSameDay: true,
      exact: 'Time unavailable'
    };
  }

  // Evaluate calendar day according to operational Asia/Colombo date
  const isSameDay = formatIsoDateOnly(date) === formatIsoDateOnly(now);
  const exact = formatExactDateTime(date);
  const relative = formatRelativeTime(date, now);

  return {
    display: isSameDay ? formatTimeOnly(date) : exact,
    relative,
    isSameDay,
    exact
  };
}
