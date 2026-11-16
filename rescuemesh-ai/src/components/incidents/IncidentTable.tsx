import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { Incident, PriorityLevel, IncidentStatus, RiskZone } from '../../types';
import { IncidentFilters } from './IncidentFilters';
import { PriorityBadge, CategoryBadge, StatusBadge, RiskZoneBadge } from '../common/Badges';
import {
  parseTimestamp,
  formatIncidentDateTime,
  formatIsoDateOnly,
  formatTime24Only
} from '../../utils/dateTime';
import {
  AlertCircle,
  Eye,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Users2,
  CheckCircle2,
  Clock,
  Play,
  MapPin,
  ExternalLink
} from 'lucide-react';

interface IncidentTableProps {
  onOpenAssignModal: (incident: Incident) => void;
}

type SortField = 'id' | 'priority' | 'category' | 'riskZone' | 'reported' | 'status';
type SortOrder = 'asc' | 'desc';

export const IncidentTable: React.FC<IncidentTableProps> = ({ onOpenAssignModal }) => {
  const {
    incidents,
    filters,
    setSelectedIncident,
    setFocusedIncidentId,
    focusedIncidentId,
    acknowledgeIncident,
    updateIncidentStatus,
    setActiveTab,
    currentUser,
    currentTime
  } = useEmergency();

  const [activeTabTab, setActiveTabTab] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('priority');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  // Real-time new incident visual attention highlight (soft highlight for 6 seconds)
  const [recentlyAddedIds, setRecentlyAddedIds] = useState<Set<string>>(new Set());
  const prevIncidentsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    if (isFirstLoadRef.current) {
      if (incidents.length > 0) {
        prevIncidentsRef.current = new Set(incidents.map((i) => i.id));
        isFirstLoadRef.current = false;
      }
      return;
    }

    const currentIds = new Set<string>(incidents.map((i) => i.id));
    const newIds: string[] = [];
    currentIds.forEach((id: string) => {
      if (!prevIncidentsRef.current.has(id)) {
        newIds.push(id);
      }
    });

    if (newIds.length > 0) {
      setRecentlyAddedIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });

      // Clear the soft highlight after 6 seconds
      const timer = setTimeout(() => {
        setRecentlyAddedIds((prev) => {
          const next = new Set(prev);
          newIds.forEach((id) => next.delete(id));
          return next;
        });
      }, 6000);

      prevIncidentsRef.current = currentIds;
      return () => clearTimeout(timer);
    }

    prevIncidentsRef.current = currentIds;
  }, [incidents]);

  const isViewer = currentUser?.role === 'Viewer';

  // Filter incidents based on both tab and filter state
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Tab filter
      if (activeTabTab === 'new' && inc.status !== 'New') return false;
      if (activeTabTab === 'critical' && inc.operationalPriority !== 'Critical') return false;
      if (activeTabTab === 'assigned' && inc.status !== 'Assigned') return false;
      if (activeTabTab === 'responding' && inc.status !== 'In Progress') return false;
      if (activeTabTab === 'resolved' && inc.status !== 'Resolved') return false;

      // Filter Toolbar
      if (filters.priority !== 'All' && inc.operationalPriority !== filters.priority) return false;
      if (filters.category !== 'All' && inc.category !== filters.category) return false;
      if (filters.riskZone !== 'All' && inc.riskZone !== filters.riskZone) return false;
      if (filters.status !== 'All' && inc.status !== filters.status) return false;

      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase().trim();
        const matches =
          inc.id.toLowerCase().includes(q) ||
          inc.category.toLowerCase().includes(q) ||
          inc.locationName.toLowerCase().includes(q) ||
          (inc.assignedTeamName && inc.assignedTeamName.toLowerCase().includes(q));
        if (!matches) return false;
      }

      return true;
    });
  }, [incidents, activeTabTab, filters]);

  // Operational sorting: unresolved before resolved, Critical -> High -> Medium -> Low, oldest waiting first
  const sortedIncidents = useMemo(() => {
    return [...filteredIncidents].sort((a, b) => {
      // Always put resolved incidents at the end unless explicitly sorting by status
      if (sortField !== 'status') {
        if (a.status === 'Resolved' && b.status !== 'Resolved') return 1;
        if (a.status !== 'Resolved' && b.status === 'Resolved') return -1;
      }

      let comparison = 0;
      if (sortField === 'id') {
        comparison = a.id.localeCompare(b.id);
      } else if (sortField === 'priority') {
        const priorityWeight: Record<PriorityLevel, number> = {
          Critical: 4,
          High: 3,
          Medium: 2,
          Low: 1
        };
        comparison = priorityWeight[a.operationalPriority] - priorityWeight[b.operationalPriority];
        // If equal priority, oldest waiting emergency comes first (requires faster attention)
        if (comparison === 0) {
          const timeA = parseTimestamp(a.receivedTimestamp)?.getTime() || 0;
          const timeB = parseTimestamp(b.receivedTimestamp)?.getTime() || 0;
          comparison = timeB - timeA; // Inverted for descending priority
        }
      } else if (sortField === 'category') {
        comparison = a.category.localeCompare(b.category);
      } else if (sortField === 'riskZone') {
        const riskWeight: Record<RiskZone, number> = { High: 3, Medium: 2, Low: 1, Unknown: 0 };
        comparison = (riskWeight[a.riskZone] ?? 0) - (riskWeight[b.riskZone] ?? 0);
      } else if (sortField === 'reported') {
        const timeA = parseTimestamp(a.receivedTimestamp)?.getTime() || 0;
        const timeB = parseTimestamp(b.receivedTimestamp)?.getTime() || 0;
        comparison = timeA - timeB;
      } else if (sortField === 'status') {
        const statusOrder: Record<IncidentStatus, number> = {
          New: 1,
          Acknowledged: 2,
          Assigned: 3,
          'In Progress': 4,
          Resolved: 5
        };
        comparison = statusOrder[a.status] - statusOrder[b.status];
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredIncidents, sortField, sortOrder]);

  // Pagination
  const totalPages = Math.ceil(sortedIncidents.length / itemsPerPage) || 1;
  const paginatedIncidents = sortedIncidents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Incident ID',
      'Emergency Type',
      'Priority',
      'Flood Risk',
      'Location',
      'Latitude',
      'Longitude',
      'Reported Date',
      'Reported Time',
      'Status',
      'Response Team'
    ];

    const rows = filteredIncidents.map((inc) => {
      const parsed = parseTimestamp(inc.receivedTimestamp);
      const datePart = parsed ? formatIsoDateOnly(parsed) : '—';
      const timePart = parsed ? formatTime24Only(parsed) : '—';
      const displayStatus = inc.status === 'In Progress' ? 'Responding' : inc.status;

      return [
        inc.id,
        inc.category,
        inc.operationalPriority,
        inc.riskZone,
        `"${inc.locationName.replace(/"/g, '""')}"`,
        inc.latitude != null ? inc.latitude.toFixed(6) : '',
        inc.longitude != null ? inc.longitude.toFixed(6) : '',
        `"${datePart}"`,
        `"${timePart}"`,
        displayStatus,
        `"${(inc.assignedTeamName || 'Not assigned').replace(/"/g, '""')}"`
      ];
    });

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `rescuemesh_incidents_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const tabs = [
    { id: 'all', label: 'All', count: incidents.length },
    { id: 'new', label: 'New', count: incidents.filter((i) => i.status === 'New').length },
    {
      id: 'critical',
      label: 'Critical',
      count: incidents.filter((i) => i.operationalPriority === 'Critical').length
    },
    {
      id: 'assigned',
      label: 'Assigned',
      count: incidents.filter((i) => i.status === 'Assigned').length
    },
    {
      id: 'responding',
      label: 'Responding',
      count: incidents.filter((i) => i.status === 'In Progress').length
    },
    {
      id: 'resolved',
      label: 'Resolved',
      count: incidents.filter((i) => i.status === 'Resolved').length
    }
  ];

  const handleOpenIncident = (incident: Incident) => {
    setFocusedIncidentId(incident.id);
    setSelectedIncident(incident);
  };

  const handleViewOnMap = (incident: Incident, e: React.MouseEvent) => {
    e.stopPropagation();
    setFocusedIncidentId(incident.id);
    setActiveTab('live-map');
  };

  return (
    <div className="space-y-4">
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Emergency Incidents</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            View and manage reported emergencies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Simplified Operational Summary Tabs */}
      <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200 overflow-x-auto shadow-2xs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTabTab(tab.id);
              setCurrentPage(1);
            }}
            className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTabTab === tab.id
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                activeTabTab === tab.id ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* 3. Filter Toolbar */}
      <IncidentFilters onExportCsv={handleExportCsv} />

      {/* 4. Incident Data Table & Mobile Cards */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop View */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 uppercase font-bold text-[11px] select-none">
              <tr>
                {/* INCIDENT */}
                <th
                  onClick={() => handleSort('id')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>INCIDENT</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* EMERGENCY TYPE */}
                <th
                  onClick={() => handleSort('category')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>EMERGENCY TYPE</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* PRIORITY */}
                <th
                  onClick={() => handleSort('priority')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>PRIORITY</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* FLOOD RISK */}
                <th
                  onClick={() => handleSort('riskZone')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>FLOOD RISK</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* LOCATION */}
                <th className="px-4 py-3">LOCATION</th>

                {/* REPORTED */}
                <th
                  onClick={() => handleSort('reported')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>REPORTED</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* STATUS */}
                <th
                  onClick={() => handleSort('status')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-1">
                    <span>STATUS</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* RESPONSE TEAM */}
                <th className="px-4 py-3">RESPONSE TEAM</th>

                {/* ACTIONS */}
                <th className="px-4 py-3 text-right">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-slate-700">
              {paginatedIncidents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500">
                    <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800 text-sm">No emergencies reported</p>
                    <p className="text-slate-400 text-xs mt-1">
                      New emergency reports will appear here automatically.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedIncidents.map((incident) => {
                  const isNew = incident.status === 'New';
                  const isFocused = focusedIncidentId === incident.id;
                  const isRecentlyAdded = recentlyAddedIds.has(incident.id);
                  const dt = formatIncidentDateTime(incident.receivedTimestamp, currentTime);

                  return (
                    <tr
                      key={incident.id}
                      onClick={() => handleOpenIncident(incident)}
                      className={`hover:bg-slate-50/90 transition-all duration-300 cursor-pointer ${
                        isRecentlyAdded
                          ? 'bg-amber-100/70 border-l-4 border-l-amber-500 ring-1 ring-amber-300'
                          : isFocused
                          ? 'bg-blue-50/80 ring-1 ring-blue-500/30'
                          : isNew
                          ? 'bg-blue-50/20'
                          : ''
                      }`}
                    >
                      {/* INCIDENT */}
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          {isNew && (
                            <span
                              className="w-2 h-2 rounded-full bg-blue-600 animate-pulse shrink-0"
                              title="New unacknowledged emergency"
                            />
                          )}
                          <span className="text-sm tracking-tight">{incident.id}</span>
                        </div>
                      </td>

                      {/* EMERGENCY TYPE */}
                      <td className="px-4 py-3">
                        <CategoryBadge category={incident.category} size="sm" />
                      </td>

                      {/* PRIORITY */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <PriorityBadge priority={incident.operationalPriority} size="sm" />
                          {incident.isOverridden && (
                            <span
                              className="text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-1.5 py-0.2 rounded"
                              title={`Adjusted by operator from recommended ${incident.aiRecommendedPriority}`}
                            >
                              Adjusted
                            </span>
                          )}
                        </div>
                      </td>

                      {/* FLOOD RISK */}
                      <td className="px-4 py-3">
                        <RiskZoneBadge zone={incident.riskZone} size="sm" />
                      </td>

                      {/* LOCATION */}
                      <td className="px-4 py-3 max-w-[200px]">
                        <div className="flex items-center gap-1.5 text-slate-900 font-semibold truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate" title={incident.locationName}>
                            {incident.locationName || 'Pending resolution'}
                          </span>
                        </div>
                      </td>

                      {/* REPORTED */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-slate-900 block text-xs">
                            {dt.relative}
                          </span>
                          <span
                            className="text-[11px] text-slate-500 font-mono block mt-0.5"
                            title={dt.exactWithZone || `${dt.exact} (+05:30)`}
                          >
                            {dt.exact}
                          </span>
                        </div>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3">
                        <StatusBadge status={incident.status} size="sm" />
                      </td>

                      {/* RESPONSE TEAM */}
                      <td className="px-4 py-3 max-w-[170px]">
                        {incident.assignedTeamName ? (
                          <span className="text-xs font-semibold text-blue-800 truncate block">
                            {incident.assignedTeamName}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not assigned</span>
                        )}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* NEW Status: Acknowledge + Assign Team */}
                          {incident.status === 'New' && !isViewer && (
                            <>
                              <button
                                onClick={() =>
                                  acknowledgeIncident(incident.id)
                                }
                                className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                              >
                                Acknowledge
                              </button>
                              <button
                                onClick={() => onOpenAssignModal(incident)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                              >
                                Assign Team
                              </button>
                            </>
                          )}

                          {/* ACKNOWLEDGED Status: Assign Team */}
                          {incident.status === 'Acknowledged' && !isViewer && (
                            <button
                              onClick={() => onOpenAssignModal(incident)}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                            >
                              Assign Team
                            </button>
                          )}

                          {/* ASSIGNED Status: Start Response */}
                          {incident.status === 'Assigned' && !isViewer && (
                            <button
                              onClick={() =>
                                updateIncidentStatus(
                                  incident.id,
                                  'In Progress',
                                  'Response started on site'
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <Play className="w-3 h-3 text-amber-600" />
                              <span>Start Response</span>
                            </button>
                          )}

                          {/* RESPONDING Status: Mark Resolved */}
                          {incident.status === 'In Progress' && !isViewer && (
                            <button
                              onClick={() =>
                                updateIncidentStatus(
                                  incident.id,
                                  'Resolved',
                                  'Emergency response completed and situation resolved'
                                )
                              }
                              className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors cursor-pointer flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>Resolve</span>
                            </button>
                          )}

                          {/* View Button */}
                          <button
                            onClick={() => handleOpenIncident(incident)}
                            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
                            title="View emergency details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Cards View */}
        <div className="lg:hidden divide-y divide-slate-100">
          {paginatedIncidents.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-bold text-slate-800 text-sm">No emergencies reported</p>
              <p className="text-slate-400 text-xs mt-1">
                New emergency reports will appear here automatically.
              </p>
            </div>
          ) : (
            paginatedIncidents.map((incident) => {
              const dt = formatIncidentDateTime(incident.receivedTimestamp, currentTime);
              const isNew = incident.status === 'New';
              const isRecentlyAdded = recentlyAddedIds.has(incident.id);

              return (
                <div
                  key={incident.id}
                  onClick={() => handleOpenIncident(incident)}
                  className={`p-4 space-y-3 cursor-pointer hover:bg-slate-50 transition-all duration-300 ${
                    isRecentlyAdded
                      ? 'bg-amber-100/70 border-l-4 border-l-amber-500'
                      : isNew
                      ? 'bg-blue-50/20'
                      : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {isNew && <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />}
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {incident.id}
                      </span>
                      <PriorityBadge priority={incident.operationalPriority} size="sm" />
                    </div>
                    <StatusBadge status={incident.status} size="sm" />
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <CategoryBadge category={incident.category} size="sm" />
                    <RiskZoneBadge zone={incident.riskZone} size="sm" />
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-900 font-semibold truncate">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{incident.locationName}</span>
                    </div>

                    <div className="flex items-center justify-between text-slate-500 text-[11px] pt-1">
                      <span>Reported: {dt.relative}</span>
                      <span className="font-mono" title={dt.exactWithZone || `${dt.exact} (+05:30)`}>{dt.exact}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-0.5">
                      <span className="text-slate-400">Response Team:</span>
                      <span className="font-medium text-slate-800">
                        {incident.assignedTeamName || 'Not assigned'}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Mobile */}
                  <div
                    className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {incident.status === 'New' && !isViewer && (
                      <button
                        onClick={() => acknowledgeIncident(incident.id)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    )}

                    {!incident.assignedTeamId && incident.status !== 'Resolved' && !isViewer && (
                      <button
                        onClick={() => onOpenAssignModal(incident)}
                        className="px-3 py-1.5 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                      >
                        Assign Team
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenIncident(incident)}
                      className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 5. Pagination Bar */}
        <div className="p-3 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-900">
              {sortedIncidents.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-900">
              {Math.min(currentPage * itemsPerPage, sortedIncidents.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-900">{sortedIncidents.length}</span>{' '}
            incidents
          </div>

          <div className="flex items-center gap-1 self-end sm:self-auto">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="px-3 font-semibold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>

            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
