import { PriorityLevel, EmergencyCategory, IncidentStatus, RiskZone } from '../types';

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

export function getPriorityBadgeClasses(priority: PriorityLevel): {
  badge: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
} {
  switch (priority) {
    case 'Critical':
      return {
        badge: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
        dot: 'bg-rose-600',
        text: 'text-rose-700',
        bg: 'bg-rose-600',
        border: 'border-rose-300'
      };
    case 'High':
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
        dot: 'bg-amber-600',
        text: 'text-amber-700',
        bg: 'bg-amber-500',
        border: 'border-amber-300'
      };
    case 'Medium':
      return {
        badge: 'bg-yellow-50 text-yellow-800 border-yellow-200 ring-yellow-500/20',
        dot: 'bg-yellow-500',
        text: 'text-yellow-800',
        bg: 'bg-yellow-500',
        border: 'border-yellow-300'
      };
    case 'Low':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
        dot: 'bg-emerald-600',
        text: 'text-emerald-700',
        bg: 'bg-emerald-500',
        border: 'border-emerald-300'
      };
  }
}

export function getStatusBadgeClasses(status: IncidentStatus): {
  badge: string;
  dot: string;
  text: string;
} {
  switch (status) {
    case 'New':
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        dot: 'bg-blue-600 animate-pulse',
        text: 'text-blue-700'
      };
    case 'Acknowledged':
      return {
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        dot: 'bg-purple-600',
        text: 'text-purple-700'
      };
    case 'Assigned':
      return {
        badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        dot: 'bg-indigo-600',
        text: 'text-indigo-700'
      };
    case 'In Progress':
      return {
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        dot: 'bg-amber-600',
        text: 'text-amber-700'
      };
    case 'Resolved':
      return {
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        dot: 'bg-emerald-600',
        text: 'text-emerald-700'
      };
  }
}

export function getCategoryBadgeClasses(category: EmergencyCategory): {
  badge: string;
  iconColor: string;
} {
  switch (category) {
    case 'Medical':
      return {
        badge: 'bg-red-50 text-red-700 border-red-200',
        iconColor: 'text-red-600'
      };
    case 'Rescue':
      return {
        badge: 'bg-blue-50 text-blue-700 border-blue-200',
        iconColor: 'text-blue-600'
      };
    case 'Food & Water':
      return {
        badge: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        iconColor: 'text-cyan-600'
      };
    case 'Shelter':
      return {
        badge: 'bg-purple-50 text-purple-700 border-purple-200',
        iconColor: 'text-purple-600'
      };
  }
}

export function getRiskZoneBadgeClasses(zone: RiskZone): {
  badge: string;
} {
  switch (zone) {
    case 'High':
      return { badge: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'Medium':
      return { badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'Low':
      return { badge: 'bg-slate-100 text-slate-700 border-slate-200' };
    case 'Unknown':
    default:
      return { badge: 'bg-zinc-100 text-zinc-600 border-zinc-200' };
  }
}

export function formatRelativeTime(timeStr: string): string {
  // If time is just HH:MM or relative
  if (timeStr.includes(':')) {
    return `Today at ${timeStr}`;
  }
  return timeStr;
}
