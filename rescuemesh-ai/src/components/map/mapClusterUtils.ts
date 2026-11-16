import { PriorityLevel, Incident } from '../../types';

export const PRIORITY_WEIGHTS: Record<PriorityLevel, number> = {
  Critical: 4,
  High: 3,
  Medium: 2,
  Low: 1
};

export const PRIORITY_COLORS: Record<
  PriorityLevel,
  { bg: string; border: string; ring: string; badgeBg: string; badgeText: string }
> = {
  Critical: {
    bg: '#e11d48',
    border: '#be123c',
    ring: 'rgba(225, 29, 72, 0.35)',
    badgeBg: 'bg-rose-50',
    badgeText: 'text-rose-700'
  },
  High: {
    bg: '#ea580c',
    border: '#c2410c',
    ring: 'rgba(234, 88, 12, 0.35)',
    badgeBg: 'bg-orange-50',
    badgeText: 'text-orange-700'
  },
  Medium: {
    bg: '#eab308',
    border: '#ca8a04',
    ring: 'rgba(234, 179, 8, 0.35)',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-700'
  },
  Low: {
    bg: '#10b981',
    border: '#059669',
    ring: 'rgba(16, 185, 129, 0.35)',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-700'
  }
};

/**
 * Returns the highest priority level from a list of priority strings.
 * Hierarchy: Critical > High > Medium > Low.
 */
export function getHighestPriority(priorities: (PriorityLevel | string)[]): PriorityLevel {
  let highest: PriorityLevel = 'Low';
  let maxWeight = 1;
  for (const p of priorities) {
    const validPrio = (p as PriorityLevel) in PRIORITY_WEIGHTS ? (p as PriorityLevel) : 'Low';
    const w = PRIORITY_WEIGHTS[validPrio] || 1;
    if (w > maxWeight) {
      maxWeight = w;
      highest = validPrio;
    }
  }
  return highest;
}

/**
 * Generates summary statistics and accessible label for a cluster of incidents.
 */
export function getClusterSummary(incidents: Incident[]): {
  count: number;
  highestPriority: PriorityLevel;
  breakdown: Record<PriorityLevel, number>;
  ariaLabel: string;
} {
  const breakdown: Record<PriorityLevel, number> = {
    Critical: 0,
    High: 0,
    Medium: 0,
    Low: 0
  };

  for (const inc of incidents) {
    if (breakdown[inc.operationalPriority] !== undefined) {
      breakdown[inc.operationalPriority]++;
    } else {
      breakdown.Low++;
    }
  }

  const highestPriority = getHighestPriority(incidents.map((i) => i.operationalPriority));
  const count = incidents.length;
  const ariaLabel = `${count} emergencies in this area, highest priority ${highestPriority}`;

  return { count, highestPriority, breakdown, ariaLabel };
}

/**
 * Generates accessible HTML for an individual incident marker.
 * CRITICAL RULE: Never displays shortened numerical IDs (e.g. "196" or "208")
 * inside the marker. Uses an emergency indicator glyph with priority color.
 */
export function createIndividualMarkerHtml(
  incident: Incident,
  isFocused: boolean = false,
  isPulse: boolean = false
): string {
  const prio = incident.operationalPriority || 'Medium';
  const color = PRIORITY_COLORS[prio] || PRIORITY_COLORS.Low;

  const focusRing = isFocused
    ? 'ring-4 ring-blue-600 ring-offset-2 scale-110 shadow-xl'
    : '';

  return `
    <div class="relative flex items-center justify-center cursor-pointer group"
         style="width: 34px; height: 34px;"
         role="button"
         tabindex="0"
         aria-label="${incident.id}, ${incident.category} emergency, ${incident.operationalPriority} priority">
      ${isPulse && !isFocused ? `<div class="absolute inset-0 rounded-full custom-pulse-ring" style="background-color: ${color.ring};"></div>` : ''}
      <div class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white shadow-md border-2 border-white transition-all transform group-hover:scale-110 ${focusRing}"
           style="background-color: ${color.bg};">
        <svg class="w-4 h-4 text-white drop-shadow-xs" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
      </div>
    </div>
  `;
}

/**
 * Generates HTML for a cluster marker.
 * Number represents the exact COUNT of emergencies in the area.
 * Border and glow represent the HIGHEST priority among incidents in the cluster.
 */
export function createClusterMarkerHtml(
  count: number,
  highestPriority: PriorityLevel
): string {
  const color = PRIORITY_COLORS[highestPriority] || PRIORITY_COLORS.Low;
  const pulseClass = highestPriority === 'Critical' ? 'animate-pulse' : '';

  return `
    <div class="relative flex items-center justify-center cursor-pointer group"
         style="width: 40px; height: 40px;"
         role="button"
         tabindex="0"
         aria-label="${count} emergencies in this area, highest priority ${highestPriority}">
      <div class="absolute inset-0 rounded-full ${pulseClass}" style="background-color: ${color.ring};"></div>
      <div class="relative z-10 flex items-center justify-center w-8 h-8 rounded-full text-white shadow-lg border-2 border-white transition-transform transform group-hover:scale-110 font-black"
           style="background-color: ${color.bg};">
        <span class="text-xs tracking-tight">${count}</span>
      </div>
    </div>
  `;
}

/**
 * Formats hover tooltip HTML for an individual incident marker.
 */
export function createIndividualTooltipHtml(incident: Incident): string {
  const prio = incident.operationalPriority || 'Medium';
  const color = PRIORITY_COLORS[prio] || PRIORITY_COLORS.Low;

  return `
    <div class="p-1 min-w-[150px] font-sans select-none text-left">
      <div class="font-extrabold text-xs text-slate-900 tracking-tight flex items-center justify-between gap-1.5">
        <span>${incident.id}</span>
        <span class="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${color.badgeBg} ${color.badgeText}">
          ${incident.operationalPriority}
        </span>
      </div>
      <p class="text-[11px] text-slate-700 font-semibold mt-0.5">${incident.category} Emergency</p>
      <p class="text-[10px] text-slate-500 truncate mt-0.5">${incident.locationName || 'Location resolving...'}</p>
    </div>
  `;
}

/**
 * Formats hover tooltip HTML for a cluster marker.
 */
export function createClusterTooltipHtml(
  count: number,
  highestPriority: PriorityLevel,
  breakdown: Record<PriorityLevel, number>
): string {
  return `
    <div class="p-1.5 min-w-[160px] font-sans select-none text-left">
      <div class="font-extrabold text-xs text-slate-900">
        ${count} Emergencies in this area
      </div>
      <div class="text-[10px] font-bold text-rose-600 mt-0.5">
        Highest Priority: ${highestPriority}
      </div>
      <div class="flex items-center gap-2 text-[9px] font-semibold text-slate-500 mt-1 pt-1 border-t border-slate-100">
        ${breakdown.Critical > 0 ? `<span class="text-rose-600 font-bold">Crit: ${breakdown.Critical}</span>` : ''}
        ${breakdown.High > 0 ? `<span class="text-orange-600 font-bold">High: ${breakdown.High}</span>` : ''}
        ${breakdown.Medium > 0 ? `<span class="text-amber-600 font-bold">Med: ${breakdown.Medium}</span>` : ''}
        ${breakdown.Low > 0 ? `<span class="text-emerald-600 font-bold">Low: ${breakdown.Low}</span>` : ''}
      </div>
    </div>
  `;
}
