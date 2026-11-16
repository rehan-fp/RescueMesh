import { Incident, RescueTeam } from '../types';
import { parseTimestamp, formatExactDateTime } from './dateTime';

export type ReportTimeRange = 'today' | '7d' | '30d' | 'all';

export interface SummaryMetrics {
  totalEmergencies: number;
  criticalEmergencies: number;
  resolvedEmergencies: number;
  activeEmergencies: number;
  resolutionRateFormatted: string;
  hasResponseTimeData: boolean;
  averageResponseTimeSeconds: number | null;
  averageResponseTimeFormatted: string;
}

export interface CategoryMetric {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface PriorityMetric {
  name: 'Critical' | 'High' | 'Medium' | 'Low';
  count: number;
  percentage: number;
  color: string;
}

export interface AreaMetric {
  name: string;
  count: number;
  percentage: number;
}

export interface TimeActivityPoint {
  time: string;
  received: number;
  resolved: number;
}

export interface TeamActivityMetric {
  teamId: string;
  teamName: string;
  assignedCount: number;
  activeCount: number;
  resolvedCount: number;
}

export interface PriorityReviewMetric {
  total: number;
  acceptedCount: number;
  acceptedPercentage: number;
  overriddenCount: number;
  overriddenPercentage: number;
}

/**
 * Filters incidents by the selected operational time window.
 */
export function filterIncidentsByTimeRange(
  incidents: Incident[],
  range: ReportTimeRange,
  referenceDate: Date = new Date()
): Incident[] {
  if (range === 'all') return incidents;

  const nowMs = referenceDate.getTime();

  if (range === 'today') {
    const startOfToday = new Date(
      referenceDate.getFullYear(),
      referenceDate.getMonth(),
      referenceDate.getDate(),
      0,
      0,
      0,
      0
    ).getTime();
    return incidents.filter((inc) => {
      const t = new Date(inc.receivedTimestamp || inc.receivedAt || 0).getTime();
      return t >= startOfToday && t <= nowMs + 60000;
    });
  }

  if (range === '7d') {
    const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000;
    return incidents.filter((inc) => {
      const t = new Date(inc.receivedTimestamp || inc.receivedAt || 0).getTime();
      return t >= sevenDaysAgo && t <= nowMs + 60000;
    });
  }

  if (range === '30d') {
    const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000;
    return incidents.filter((inc) => {
      const t = new Date(inc.receivedTimestamp || inc.receivedAt || 0).getTime();
      return t >= thirtyDaysAgo && t <= nowMs + 60000;
    });
  }

  return incidents;
}

/**
 * Computes high-level summary operational KPIs from real incident records.
 */
export function computeSummaryMetrics(incidents: Incident[]): SummaryMetrics {
  const totalEmergencies = incidents.length;
  const criticalEmergencies = incidents.filter(
    (i) => i.operationalPriority === 'Critical'
  ).length;
  const resolvedEmergencies = incidents.filter((i) => i.status === 'Resolved').length;
  const activeEmergencies = totalEmergencies - resolvedEmergencies;

  const resolutionRateFormatted =
    totalEmergencies > 0
      ? `${Math.round((resolvedEmergencies / totalEmergencies) * 100)}% resolution rate`
      : '0% resolution rate';

  // Calculate actual response time: earliest action timestamp minus received timestamp
  const responseDeltasMs: number[] = [];

  for (const inc of incidents) {
    const recMs = new Date(inc.receivedTimestamp || inc.receivedAt || 0).getTime();
    if (!recMs || isNaN(recMs)) continue;

    const actionTimestamps: number[] = [];
    if (inc.acknowledgedTimestamp) {
      const ms = new Date(inc.acknowledgedTimestamp).getTime();
      if (!isNaN(ms) && ms >= recMs) actionTimestamps.push(ms);
    }
    if (inc.assignedTimestamp) {
      const ms = new Date(inc.assignedTimestamp).getTime();
      if (!isNaN(ms) && ms >= recMs) actionTimestamps.push(ms);
    }
    if (inc.inProgressTimestamp) {
      const ms = new Date(inc.inProgressTimestamp).getTime();
      if (!isNaN(ms) && ms >= recMs) actionTimestamps.push(ms);
    }
    if (inc.resolvedTimestamp) {
      const ms = new Date(inc.resolvedTimestamp).getTime();
      if (!isNaN(ms) && ms >= recMs) actionTimestamps.push(ms);
    }

    if (actionTimestamps.length > 0) {
      const earliestActionMs = Math.min(...actionTimestamps);
      const delta = earliestActionMs - recMs;
      if (delta >= 0 && delta <= 7 * 86400 * 1000) {
        responseDeltasMs.push(delta);
      }
    }
  }

  let averageResponseTimeSeconds: number | null = null;
  let averageResponseTimeFormatted = '—';
  const hasResponseTimeData = responseDeltasMs.length > 0;

  if (hasResponseTimeData) {
    const sum = responseDeltasMs.reduce((acc, curr) => acc + curr, 0);
    averageResponseTimeSeconds = Math.round(sum / responseDeltasMs.length / 1000);

    if (averageResponseTimeSeconds < 60) {
      averageResponseTimeFormatted = `${averageResponseTimeSeconds}s`;
    } else if (averageResponseTimeSeconds < 3600) {
      const mins = (averageResponseTimeSeconds / 60).toFixed(1);
      averageResponseTimeFormatted = `${mins.endsWith('.0') ? mins.slice(0, -2) : mins} mins`;
    } else {
      const hrs = (averageResponseTimeSeconds / 3600).toFixed(1);
      averageResponseTimeFormatted = `${hrs.endsWith('.0') ? hrs.slice(0, -2) : hrs} hrs`;
    }
  }

  return {
    totalEmergencies,
    criticalEmergencies,
    resolvedEmergencies,
    activeEmergencies,
    resolutionRateFormatted,
    hasResponseTimeData,
    averageResponseTimeSeconds,
    averageResponseTimeFormatted,
  };
}

/**
 * Computes category breakdown for Medical, Rescue, Food & Water, Shelter.
 */
export function computeCategoryDistribution(incidents: Incident[]): CategoryMetric[] {
  const total = incidents.length;
  const categories: Array<{ name: string; color: string }> = [
    { name: 'Medical', color: '#ef4444' },
    { name: 'Rescue', color: '#3b82f6' },
    { name: 'Food & Water', color: '#06b6d4' },
    { name: 'Shelter', color: '#8b5cf6' },
  ];

  return categories.map((cat) => {
    const count = incidents.filter((i) => i.category === cat.name).length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      name: cat.name,
      count,
      percentage,
      color: cat.color,
    };
  });
}

/**
 * Computes priority breakdown across Critical, High, Medium, Low.
 */
export function computePriorityDistribution(incidents: Incident[]): PriorityMetric[] {
  const total = incidents.length;
  const tiers: Array<{ name: PriorityMetric['name']; color: string }> = [
    { name: 'Critical', color: '#dc2626' },
    { name: 'High', color: '#ea580c' },
    { name: 'Medium', color: '#eab308' },
    { name: 'Low', color: '#10b981' },
  ];

  return tiers.map((tier) => {
    const count = incidents.filter((i) => i.operationalPriority === tier.name).length;
    const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
    return {
      name: tier.name,
      count,
      percentage,
      color: tier.color,
    };
  });
}

/**
 * Computes geographic area distribution from incident localities or location names.
 */
export function computeAreaDistribution(incidents: Incident[]): AreaMetric[] {
  const total = incidents.length;
  if (total === 0) return [];

  const areaMap: Record<string, number> = {};

  for (const inc of incidents) {
    const rawLoc = inc.locality || inc.locationName || inc.district || 'Unspecified Area';
    // Clean up long descriptors, extract concise primary area
    let cleanArea = rawLoc.split(',')[0].trim();
    if (cleanArea.endsWith(' District')) {
      cleanArea = cleanArea.replace(' District', '');
    }
    areaMap[cleanArea] = (areaMap[cleanArea] || 0) + 1;
  }

  return Object.entries(areaMap)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Computes chronological activity (received vs resolved) grouped by hour (for today) or date (for 7d/30d/all).
 */
export function computeActivityOverTime(
  incidents: Incident[],
  range: ReportTimeRange,
  referenceDate: Date = new Date()
): TimeActivityPoint[] {
  if (incidents.length === 0) return [];

  const activityMap: Record<string, { time: string; received: number; resolved: number }> = {};

  // Sort incidents chronologically
  const sorted = [...incidents].sort((a, b) => {
    const tA = new Date(a.receivedTimestamp || a.receivedAt || 0).getTime();
    const tB = new Date(b.receivedTimestamp || b.receivedAt || 0).getTime();
    return tA - tB;
  });

  if (range === 'today') {
    // Group by hour (00:00 - 23:00)
    for (const inc of sorted) {
      const dt = parseTimestamp(inc.receivedTimestamp || inc.receivedAt);
      const hourStr = dt
        ? `${String(dt.getHours()).padStart(2, '0')}:00`
        : 'Recent';

      if (!activityMap[hourStr]) {
        activityMap[hourStr] = { time: hourStr, received: 0, resolved: 0 };
      }
      activityMap[hourStr].received += 1;

      if (inc.status === 'Resolved') {
        activityMap[hourStr].resolved += 1;
      }
    }
  } else {
    // Group by day (e.g. "17 Oct", "18 Oct", "19 Oct")
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (const inc of sorted) {
      const dt = parseTimestamp(inc.receivedTimestamp || inc.receivedAt);
      const dateStr = dt
        ? `${dt.getDate()} ${months[dt.getMonth()]}`
        : 'Recent';

      if (!activityMap[dateStr]) {
        activityMap[dateStr] = { time: dateStr, received: 0, resolved: 0 };
      }
      activityMap[dateStr].received += 1;

      if (inc.status === 'Resolved') {
        activityMap[dateStr].resolved += 1;
      }
    }
  }

  return Object.values(activityMap);
}

/**
 * Computes response team workload based on actual assigned incident records.
 */
export function computeTeamActivity(
  incidents: Incident[],
  rescueTeams: RescueTeam[]
): TeamActivityMetric[] {
  const teamMetrics: Record<string, TeamActivityMetric> = {};

  // Initialize from teams
  for (const team of rescueTeams) {
    teamMetrics[team.id] = {
      teamId: team.id,
      teamName: team.name,
      assignedCount: 0,
      activeCount: 0,
      resolvedCount: 0,
    };
  }

  for (const inc of incidents) {
    const teamId = inc.assignedTeamId;
    if (teamId && teamMetrics[teamId]) {
      teamMetrics[teamId].assignedCount += 1;
      if (inc.status === 'Resolved') {
        teamMetrics[teamId].resolvedCount += 1;
      } else if (inc.status === 'Assigned' || inc.status === 'In Progress') {
        teamMetrics[teamId].activeCount += 1;
      }
    }
  }

  return Object.values(teamMetrics).filter((m) => m.assignedCount > 0);
}

/**
 * Computes priority recommendations vs operator override audit data.
 */
export function computePriorityReview(incidents: Incident[]): PriorityReviewMetric {
  const total = incidents.length;
  const overriddenCount = incidents.filter((i) => i.isOverridden).length;
  const acceptedCount = total - overriddenCount;

  return {
    total,
    acceptedCount,
    acceptedPercentage: total > 0 ? Math.round((acceptedCount / total) * 100) : 100,
    overriddenCount,
    overriddenPercentage: total > 0 ? Math.round((overriddenCount / total) * 100) : 0,
  };
}

/**
 * Generates an executive CSV export for operational reporting.
 */
export function generateCsvReport(
  incidents: Incident[],
  rangeLabel: string,
  referenceDate: Date = new Date()
): string {
  const headers = [
    'Emergency ID',
    'Received Date & Time',
    'Category',
    'Operational Priority',
    'Recommended Priority',
    'Status',
    'Location Name',
    'District',
    'Latitude',
    'Longitude',
    'Assigned Team',
    'Priority Overridden',
  ];

  const rows = incidents.map((inc) => [
    `"${inc.id}"`,
    `"${inc.receivedTimestamp || inc.receivedAt || ''}"`,
    `"${inc.category}"`,
    `"${inc.operationalPriority}"`,
    `"${inc.aiRecommendedPriority || inc.operationalPriority}"`,
    `"${inc.status}"`,
    `"${(inc.locationName || '').replace(/"/g, '""')}"`,
    `"${(inc.district || '').replace(/"/g, '""')}"`,
    inc.latitude ?? '',
    inc.longitude ?? '',
    `"${(inc.assignedTeamName || 'Unassigned').replace(/"/g, '""')}"`,
    inc.isOverridden ? 'Yes' : 'No',
  ]);

  return [
    `# RescueMesh AI — Operational Emergency Report`,
    `# Reporting Range: ${rangeLabel}`,
    `# Generated At: ${referenceDate.toISOString()}`,
    headers.join(','),
    ...rows.map((r) => r.join(',')),
  ].join('\n');
}
