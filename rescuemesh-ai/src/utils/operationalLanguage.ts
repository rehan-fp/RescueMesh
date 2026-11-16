import { EmergencyCategory, PriorityLevel, IncidentStatus } from '../types';

/**
 * Human-friendly operational language dictionary for emergency operators.
 * Replaces technical developer jargon with clear, calm, operational terms.
 */

export const CATEGORY_LABELS: Record<EmergencyCategory, string> = {
  'Medical': 'Medical Assistance',
  'Rescue': 'Immediate Rescue',
  'Food & Water': 'Relief Supplies',
  'Shelter': 'Shelter & Evacuation'
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  'Critical': 'Critical Priority',
  'High': 'High Priority',
  'Medium': 'Medium Priority',
  'Low': 'Low Priority'
};

export const STATUS_LABELS: Record<IncidentStatus, string> = {
  'New': 'New',
  'Acknowledged': 'Acknowledged',
  'Assigned': 'Assigned',
  'In Progress': 'Responding',
  'Resolved': 'Resolved'
};

export function getCategoryLabel(category?: string): string {
  if (!category) return 'Emergency';
  return CATEGORY_LABELS[category as EmergencyCategory] || category;
}

export function getPriorityLabel(priority?: string): string {
  if (!priority) return 'Pending';
  return PRIORITY_LABELS[priority as PriorityLevel] || priority;
}

export function getStatusLabel(status?: string): string {
  if (!status) return 'Unknown';
  return STATUS_LABELS[status as IncidentStatus] || (status === 'In Progress' ? 'Responding' : status);
}

export function getSignalQuality(rssiDbm?: number | null, snrDb?: number | null): {
  label: 'Excellent' | 'Good' | 'Fair' | 'Weak' | 'Unavailable';
  badgeClass: string;
  description: string;
  rawDetails: string;
} {
  if (rssiDbm === undefined || rssiDbm === null) {
    return {
      label: 'Unavailable',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      description: 'No signal reported',
      rawDetails: 'Diagnostics unavailable'
    };
  }

  const snrStr = snrDb !== undefined && snrDb !== null ? ` • SNR ${snrDb >= 0 ? '+' : ''}${snrDb} dB` : '';
  const raw = `${rssiDbm} dBm${snrStr}`;

  if (rssiDbm >= -90) {
    return {
      label: 'Excellent',
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      description: 'Excellent connection quality',
      rawDetails: raw
    };
  }

  if (rssiDbm >= -105) {
    return {
      label: 'Good',
      badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
      description: 'Stable operational connection',
      rawDetails: raw
    };
  }

  if (rssiDbm >= -115) {
    return {
      label: 'Fair',
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
      description: 'Moderate signal strength',
      rawDetails: raw
    };
  }

  return {
    label: 'Weak',
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200',
    description: 'Low signal strength',
    rawDetails: raw
  };
}

export function getDeviceTypeLabel(type?: string): string {
  if (!type) return 'Emergency Device';
  if (type.includes('Gateway')) return 'Communication Gateway';
  return 'Emergency Device';
}

export function getConnectionStatusLabel(status?: string): string {
  if (!status) return 'Connected';
  if (status.toLowerCase().includes('wifi') || status.toLowerCase().includes('uplink') || status.toLowerCase().includes('direct')) {
    return 'Connected';
  }
  return status;
}

export function getBatteryStatus(battery?: number | null): {
  label: string;
  colorClass: string;
  barColor: string;
} {
  if (battery === undefined || battery === null) {
    return {
      label: 'Not reported',
      colorClass: 'text-slate-500',
      barColor: 'bg-slate-300'
    };
  }

  if (battery > 60) {
    return {
      label: `${Math.round(battery)}% (Good)`,
      colorClass: 'text-emerald-700',
      barColor: 'bg-emerald-500'
    };
  }

  if (battery > 25) {
    return {
      label: `${Math.round(battery)}% (Adequate)`,
      colorClass: 'text-blue-700',
      barColor: 'bg-blue-500'
    };
  }

  return {
    label: `${Math.round(battery)}% (Low Battery)`,
    colorClass: 'text-rose-700',
    barColor: 'bg-rose-500'
  };
}

export interface FormattedTimelineEvent {
  title: string;
  description: string;
  operator: string;
  timestamp: string;
  status: IncidentStatus;
}

export function formatTimelineEvent(
  entry: { status: IncidentStatus; timestamp: string; operator: string; note?: string },
  incident?: { category?: string; operationalPriority?: string; aiRecommendedPriority?: string; assignedTeamName?: string; overrideReason?: string }
): FormattedTimelineEvent {
  let operator = entry.operator || 'Emergency Operator';
  const lowerOp = operator.toLowerCase();
  if (
    lowerOp.includes('lora') ||
    lowerOp.includes('mqtt') ||
    lowerOp.includes('api') ||
    lowerOp.includes('ingest') ||
    lowerOp.includes('gateway') ||
    lowerOp.includes('rest') ||
    lowerOp.includes('433') ||
    lowerOp.includes('node_') ||
    lowerOp.includes('simulation') ||
    lowerOp.includes('system (') ||
    lowerOp.includes('system')
  ) {
    operator = 'Emergency System';
  }

  const note = entry.note || '';
  let title = getStatusLabel(entry.status);
  let description = note;

  const lowerNote = note.toLowerCase();
  if (
    entry.status === 'New' ||
    lowerNote.includes('sos packet received') ||
    lowerNote.includes('433 mhz') ||
    lowerNote.includes('lora') ||
    lowerNote.includes('emergency request received') ||
    lowerNote.includes('emergency reported')
  ) {
    title = 'Emergency reported';
    const prio = incident?.aiRecommendedPriority || incident?.operationalPriority || 'Assessed';
    const cat = incident?.category || 'emergency';
    description = `Emergency reported for ${cat}. Priority assessed as ${prio}.`;
  } else if (
    entry.status === 'Acknowledged' ||
    lowerNote.includes('distress beacon') ||
    lowerNote.includes('acknowledged')
  ) {
    title = 'Operator acknowledged emergency';
    description = 'Emergency acknowledged and placed into the active response queue.';
  } else if (entry.status === 'Assigned' || lowerNote.includes('dispatched') || lowerNote.includes('assigned')) {
    title = 'Response Team assigned';
    description = incident?.assignedTeamName
      ? `Assigned ${incident.assignedTeamName} to emergency coordinates.`
      : 'Response Team assigned to emergency coordinates.';
  } else if (
    entry.status === 'In Progress' ||
    lowerNote.includes('operational assistance underway') ||
    lowerNote.includes('in progress') ||
    lowerNote.includes('started')
  ) {
    title = 'Response started';
    description = 'Response team deployed and emergency response is actively underway.';
  } else if (
    entry.status === 'Resolved' ||
    lowerNote.includes('resolved') ||
    lowerNote.includes('closed')
  ) {
    title = 'Emergency resolved';
    description = 'Emergency assistance completed and incident safely resolved.';
  } else if (note.toUpperCase().includes('OPERATOR OVERRIDE')) {
    title = 'Priority adjusted by operator';
    description = incident?.overrideReason
      ? `Priority manually adjusted to ${incident.operationalPriority}. Reason: "${incident.overrideReason}"`
      : 'Priority manually adjusted by operator.';
  } else if (
    lowerNote.includes('dynamic') ||
    lowerNote.includes('reprioritization') ||
    lowerNote.includes('priority updated') ||
    lowerNote.includes('priority recommendation updated')
  ) {
    title = 'Priority updated';
    description = description
      .replace(/Nearby (?:beacons|sos|recent):\s*/gi, 'Nearby emergencies: ')
      .replace(/AI Recommended Priority:\s*/gi, 'Recommended Priority: ')
      .replace(/Dynamic reprioritization/gi, 'Priority assessment updated')
      .replace(/Dynamic priority updated/gi, 'Priority recommendation updated');
  }

  // Remove any remaining technical jargon from description
  description = description
    .replace(/SOS packet received from [^)]+\([^)]+\)/gi, 'Emergency reported')
    .replace(/NODE_\d+/gi, 'Emergency Device')
    .replace(/GATEWAY_\d+/gi, 'Gateway')
    .replace(/\b433\s*MHz\b/gi, '')
    .replace(/distress beacon/gi, 'emergency')
    .replace(/AI Recommended Priority:/gi, 'Recommended Priority:');

  return {
    title,
    description,
    operator,
    timestamp: entry.timestamp,
    status: entry.status
  };
}
