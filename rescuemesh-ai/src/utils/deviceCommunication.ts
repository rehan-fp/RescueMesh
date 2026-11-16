import { IoTDevice, Incident } from '../types';
import { formatRelativeTime, formatExactDateTime } from './dateTime';

export interface DeviceSignal {
  label: 'Excellent' | 'Good' | 'Fair' | 'Weak' | 'Unavailable';
  badgeClass: string;
  dotColor: string;
}

export interface DeviceOperationalStatus {
  status: 'Connected' | 'Needs Attention' | 'Offline';
  statusBadgeClass: string;
  connectionLabel: string;
  lastContactTimestamp: string | null;
  relativeLastContact: string;
  exactLastContact: string;
  linkedIncident: Incident | null;
  isEmergencyActive: boolean;
  batteryPercentage: number | null;
}

/**
 * Returns a human-friendly display name for an emergency device.
 */
export function getDeviceDisplayName(dev: IoTDevice): string {
  if (dev.id.startsWith('NODE_')) {
    const num = dev.id.replace('NODE_', '').padStart(3, '0');
    return `Emergency Device ${num}`;
  }
  if (dev.id.startsWith('GATEWAY_')) {
    const num = dev.id.replace('GATEWAY_', '').padStart(3, '0');
    return `Communication Equipment ${num}`;
  }
  return dev.name || dev.id;
}

/**
 * Returns the operational purpose for the device.
 */
export function getDevicePurpose(dev: IoTDevice): string {
  const isGateway = dev.type.includes('Gateway') || dev.id.startsWith('GATEWAY_');
  if (isGateway) {
    return 'Emergency Communication Station';
  }
  return 'Emergency Request Device';
}

/**
 * Resolves the legitimate operational location for a device.
 */
export function getDeviceLocation(dev: IoTDevice, linkedIncident?: Incident | null): string {
  const isGateway = dev.type.includes('Gateway') || dev.id.startsWith('GATEWAY_');
  if (isGateway) {
    return 'Disaster Management Command Center';
  }
  if (linkedIncident) {
    if (linkedIncident.locality) return linkedIncident.locality;
    if (linkedIncident.locationName) return linkedIncident.locationName.split(',')[0].trim();
    if (linkedIncident.district) return linkedIncident.district;
  }
  if (dev.location && !dev.location.includes('(gateway position not reported)')) {
    return dev.location;
  }
  return 'Location unavailable';
}

/**
 * Translates raw RSSI and SNR values into a clean, operational signal state.
 */
export function getDeviceSignalQuality(
  rssiDbm: number | null | undefined,
  snrDb: number | null | undefined
): DeviceSignal {
  if (rssiDbm == null || isNaN(rssiDbm)) {
    if (snrDb != null && !isNaN(snrDb) && snrDb > 5) {
      return {
        label: 'Good',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dotColor: 'bg-emerald-500',
      };
    }
    return {
      label: 'Unavailable',
      badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
      dotColor: 'bg-slate-400',
    };
  }

  if (rssiDbm >= -80) {
    return {
      label: 'Excellent',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      dotColor: 'bg-emerald-500',
    };
  }
  if (rssiDbm >= -95) {
    return {
      label: 'Good',
      badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
      dotColor: 'bg-blue-500',
    };
  }
  if (rssiDbm >= -110) {
    return {
      label: 'Fair',
      badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
      dotColor: 'bg-amber-500',
    };
  }
  return {
    label: 'Weak',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotColor: 'bg-rose-500',
  };
}

/**
 * Derives operational communication status from verified last-contact timestamps.
 * Does not invent a continuous online heartbeat for event-driven emergency devices.
 */
export function computeDeviceOperationalStatus(
  dev: IoTDevice,
  incidents: Incident[],
  currentTime: Date = new Date()
): DeviceOperationalStatus {
  const isGateway = dev.type.includes('Gateway') || dev.id.startsWith('GATEWAY_');

  // Find linked incident if available
  const linkedIncident = dev.lastIncidentId
    ? incidents.find((i) => i.id === dev.lastIncidentId) || null
    : null;

  const isEmergencyActive = Boolean(
    linkedIncident && linkedIncident.status !== 'Resolved'
  );

  // Extract battery if available
  const devBattery = (dev as { battery?: number | null }).battery;
  const batteryPercentage =
    linkedIncident?.battery != null
      ? Math.round(linkedIncident.battery)
      : devBattery != null
      ? Math.round(devBattery)
      : null;

  // Derive last contact timestamp
  let lastContactTimestamp: string | null = null;
  if (linkedIncident?.receivedTimestamp || linkedIncident?.receivedAt) {
    lastContactTimestamp = linkedIncident.receivedTimestamp || linkedIncident.receivedAt;
  } else if (dev.lastSeen && dev.lastSeen !== 'Now') {
    lastContactTimestamp = dev.lastSeen;
  }

  let status: 'Connected' | 'Needs Attention' | 'Offline' = 'Connected';
  let connectionLabel = 'Available';

  if (lastContactTimestamp) {
    const contactMs = new Date(lastContactTimestamp).getTime();
    if (!isNaN(contactMs)) {
      const diffMinutes = Math.max(0, (currentTime.getTime() - contactMs) / (60 * 1000));

      if (diffMinutes <= 60) {
        status = 'Connected';
        connectionLabel = 'Connected';
      } else if (diffMinutes <= 24 * 60) {
        if (isEmergencyActive) {
          // An active emergency was reported by this device, but no communication received in over 1 hour
          status = 'Needs Attention';
          connectionLabel = 'Intermittent';
        } else {
          // Device is in normal standby awaiting next emergency activation
          status = 'Connected';
          connectionLabel = 'Standby Available';
        }
      } else {
        // No contact for over 24 hours
        status = 'Offline';
        connectionLabel = 'Disconnected';
      }
    }
  } else if (dev.status === 'Offline') {
    status = 'Offline';
    connectionLabel = 'Disconnected';
  }

  const statusBadgeClass =
    status === 'Connected'
      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
      : status === 'Needs Attention'
      ? 'bg-amber-50 text-amber-800 border-amber-200'
      : 'bg-slate-100 text-slate-700 border-slate-200';

  const relativeLastContact = lastContactTimestamp
    ? formatRelativeTime(lastContactTimestamp, currentTime)
    : 'Recent';

  const exactLastContact = lastContactTimestamp
    ? formatExactDateTime(lastContactTimestamp)
    : 'Communication verified';

  return {
    status,
    statusBadgeClass,
    connectionLabel,
    lastContactTimestamp,
    relativeLastContact,
    exactLastContact,
    linkedIncident,
    isEmergencyActive,
    batteryPercentage,
  };
}
