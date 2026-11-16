import React, { useState, useMemo } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import {
  ReportTimeRange,
  filterIncidentsByTimeRange,
  computeSummaryMetrics,
  computeCategoryDistribution,
  computePriorityDistribution,
  computeAreaDistribution,
  computeActivityOverTime,
  computeTeamActivity,
  computePriorityReview,
  generateCsvReport
} from '../../utils/analytics';
import { formatExactDateTime } from '../../utils/dateTime';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  Download,
  Calendar,
  Clock,
  Printer,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Users2,
  ShieldAlert,
  Info,
  TrendingUp,
  FileSpreadsheet
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { incidents, rescueTeams, currentTime } = useEmergency();
  const [timeRange, setTimeRange] = useState<ReportTimeRange>('7d');

  // Filter incidents strictly based on the selected time window
  const filteredIncidents = useMemo(() => {
    return filterIncidentsByTimeRange(incidents, timeRange, currentTime);
  }, [incidents, timeRange, currentTime]);

  // Derived operational metrics
  const summary = useMemo(() => computeSummaryMetrics(filteredIncidents), [filteredIncidents]);
  const categoryData = useMemo(() => computeCategoryDistribution(filteredIncidents), [filteredIncidents]);
  const priorityData = useMemo(() => computePriorityDistribution(filteredIncidents), [filteredIncidents]);
  const areaData = useMemo(() => computeAreaDistribution(filteredIncidents), [filteredIncidents]);
  const activityData = useMemo(
    () => computeActivityOverTime(filteredIncidents, timeRange, currentTime),
    [filteredIncidents, timeRange, currentTime]
  );
  const teamActivityData = useMemo(
    () => computeTeamActivity(filteredIncidents, rescueTeams),
    [filteredIncidents, rescueTeams]
  );
  const priorityReview = useMemo(() => computePriorityReview(filteredIncidents), [filteredIncidents]);

  const getTimeRangeLabel = (range: ReportTimeRange): string => {
    switch (range) {
      case 'today':
        return 'Today';
      case '7d':
        return 'Last 7 Days';
      case '30d':
        return 'Last 30 Days';
      case 'all':
        return 'All Recorded';
    }
  };

  // CSV Export Handler
  const handleExportCsv = () => {
    const csvContent = generateCsvReport(filteredIncidents, getTimeRangeLabel(timeRange), currentTime);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = currentTime.toISOString().split('T')[0];
    link.setAttribute('href', url);
    link.setAttribute('download', `rescuemesh-report-${timeRange}-${dateStamp}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Print / PDF Handler
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Printable Report Header (visible only on print) */}
      <div className="hidden print:block mb-6 border-b border-slate-300 pb-4">
        <h1 className="text-2xl font-bold text-slate-900">RescueMesh AI — Operational Emergency Report</h1>
        <div className="flex justify-between items-center text-xs text-slate-600 mt-2">
          <span>Reporting Period: {getTimeRangeLabel(timeRange)}</span>
          <span>Generated: {formatExactDateTime(currentTime.toISOString())}</span>
        </div>
      </div>

      {/* Screen Header & Filter Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Reports & Analytics
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Review emergency activity, response performance and operational trends.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs" role="tablist">
            <button
              type="button"
              onClick={() => setTimeRange('today')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                timeRange === 'today'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Today
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                timeRange === '7d'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                timeRange === '30d'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                timeRange === 'all'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All Recorded
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
              title="Download CSV report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
              title="Print report or save as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export Report (PDF)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5 Top Summary Operational Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* 1. Total Emergencies */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Total Emergencies
          </span>
          <span className="text-3xl font-black text-slate-900 font-mono mt-1 block">
            {summary.totalEmergencies}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            {getTimeRangeLabel(timeRange)}
          </span>
        </div>

        {/* 2. Critical Emergencies */}
        <div className="bg-white p-4.5 rounded-xl border border-red-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-red-700 uppercase tracking-wider block">
            Critical Emergencies
          </span>
          <span className="text-3xl font-black text-red-600 font-mono mt-1 block">
            {summary.criticalEmergencies}
          </span>
          <span className="text-[11px] text-red-600 font-medium mt-1 block">
            Requires immediate attention
          </span>
        </div>

        {/* 3. Resolved Emergencies */}
        <div className="bg-white p-4.5 rounded-xl border border-emerald-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            Resolved Emergencies
          </span>
          <span className="text-3xl font-black text-emerald-700 font-mono mt-1 block">
            {summary.resolvedEmergencies}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            {summary.resolutionRateFormatted}
          </span>
        </div>

        {/* 4. Active Emergencies */}
        <div className="bg-white p-4.5 rounded-xl border border-amber-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            Active Emergencies
          </span>
          <span className="text-3xl font-black text-amber-600 font-mono mt-1 block">
            {summary.activeEmergencies}
          </span>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">
            Awaiting or receiving response
          </span>
        </div>

        {/* 5. Average Response Time */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            Average Response Time
          </span>
          <span className="text-3xl font-black text-blue-700 font-mono mt-1 block">
            {summary.averageResponseTimeFormatted}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            {summary.hasResponseTimeData ? 'From intake to first action' : 'Not enough data yet'}
          </span>
        </div>
      </div>

      {/* Charts Grid Row 1: Emergencies by Type & Emergencies by Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 1: Emergencies by Type */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Emergencies by Type
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Distribution across emergency categories
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {summary.totalEmergencies} Total
            </span>
          </div>

          {summary.totalEmergencies === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4">
              <Info className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No emergencies recorded for this period.</p>
              <p className="text-[11px] text-slate-400 mt-1">Adjust the date range above to review past activity.</p>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: any, _name: any, item: any) => [
                      `${value} emergencies (${item.payload.percentage}%)`,
                      `${item.payload.name} Emergencies`
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {categoryData.map((entry, index) => (
                      <Cell key={`cat-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Chart 2: Emergencies by Priority */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Emergencies by Priority
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Severity breakdown for selected period
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              4 Severity Tiers
            </span>
          </div>

          {summary.totalEmergencies === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4">
              <Info className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No emergencies recorded for this period.</p>
              <p className="text-[11px] text-slate-400 mt-1">Adjust the date range above to review past activity.</p>
            </div>
          ) : (
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="name"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`prio-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value} emergencies (${item.payload.percentage}%)`,
                      `${name} Priority`
                    ]}
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend
                    formatter={(value, entry: any) => (
                      <span className="text-xs font-semibold text-slate-700">
                        {value} ({entry.payload?.count || 0})
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Chart 3: Emergency Activity Over Time (Received vs Resolved) */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div>
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Emergency Activity Over Time
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Emergencies received and resolved during the selected period.
            </p>
          </div>
          <span className="text-xs font-medium text-slate-500">
            {getTimeRangeLabel(timeRange)}
          </span>
        </div>

        {activityData.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-4">
            <TrendingUp className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-xs font-semibold text-slate-700">No emergency activity recorded during this time period.</p>
            <p className="text-[11px] text-slate-400 mt-1">Activity curves will automatically appear as emergencies arrive.</p>
          </div>
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={activityData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    `${value} emergencies`,
                    name === 'received' ? 'Emergencies Received' : 'Emergencies Resolved'
                  ]}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px'
                  }}
                />
                <Legend
                  formatter={(value) => (
                    <span className="text-xs font-semibold text-slate-700">
                      {value === 'received' ? 'Emergencies Received' : 'Emergencies Resolved'}
                    </span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="received"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorReceived)"
                  name="received"
                />
                <Area
                  type="monotone"
                  dataKey="resolved"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorResolved)"
                  name="resolved"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Row 2: Emergencies by Area & Response Team Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Chart 4: Emergencies by Area */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Emergencies by Area</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Geographic concentration from verified incident reports
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {areaData.length} {areaData.length === 1 ? 'Location' : 'Locations'}
            </span>
          </div>

          {areaData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-4">
              <MapPin className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-700">No emergency locations recorded for this period.</p>
              <p className="text-[11px] text-slate-400 mt-1">Locations will be displayed as emergencies are mapped.</p>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              {areaData.slice(0, 6).map((area, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-bold text-slate-900">{area.name}</span>
                    <span className="font-semibold text-slate-600">
                      {area.count} {area.count === 1 ? 'emergency' : 'emergencies'} ({area.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${area.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Chart 5: Response Team Activity */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Response Team Activity</span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Field response teams and mission workloads
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {teamActivityData.length} {teamActivityData.length === 1 ? 'Active Unit' : 'Active Units'}
            </span>
          </div>

          {teamActivityData.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-center p-6 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
              <Users2 className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-800">No response-team activity for this period.</p>
              <p className="text-[11px] text-slate-500 max-w-sm mt-1 leading-relaxed">
                Once response teams are assigned to emergencies, their operational workload and response activity will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3 py-1">
              {teamActivityData.map((team, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="font-bold text-slate-900">{team.teamName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      {team.assignedCount} Assigned
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-500">
                    <span>Active: {team.activeCount}</span>
                    <span>Resolved: {team.resolvedCount}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Priority Recommendations Review (Only shown if emergencies exist) */}
      {summary.totalEmergencies > 0 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <ShieldAlert className="w-4 h-4 text-blue-600" />
            <div>
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Priority Recommendations Review
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Comparison of initial system priority recommendations vs manual operator adjustments
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Recommendations Maintained
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {priorityReview.acceptedCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({priorityReview.acceptedPercentage}% of emergencies)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Initial system priority assessment confirmed by operational personnel.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                Operator Priority Overrides
              </span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {priorityReview.overriddenCount}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  ({priorityReview.overriddenPercentage}% of emergencies)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Adjusted by command staff based on field observations and manual triage.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
