import React, { useState, useRef } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { LeafletGisMap } from './LeafletGisMap';
import { IncidentDetailModal } from '../incidents/IncidentDetailModal';
import { AssignTeamModal } from '../incidents/AssignTeamModal';
import { Incident } from '../../types';
import { PriorityBadge, StatusBadge } from '../common/Badges';
import { getCategoryLabel } from '../../utils/operationalLanguage';
import { parseTimestamp, formatIncidentDateTime } from '../../utils/dateTime';
import {
  Compass,
  MapPin,
  Clock,
  ArrowRight,
  AlertOctagon
} from 'lucide-react';

export const LiveMapView: React.FC = () => {
  const {
    incidents,
    focusedIncidentId,
    setFocusedIncidentId,
    selectedIncident,
    setSelectedIncident,
    setActiveTab,
    filters,
    setFilters,
    currentTime
  } = useEmergency();

  const [assignIncident, setAssignIncident] = useState<Incident | null>(null);
  const mapSectionRef = useRef<HTMLDivElement>(null);

  const priorityRank: Record<string, number> = {
    Critical: 1,
    High: 2,
    Medium: 3,
    Low: 4
  };

  const currentPriority = filters.priority || 'All';

  // 1. Filter incidents according to active priority filter
  const filteredIncidents = incidents.filter((inc) => {
    if (currentPriority !== 'All' && inc.operationalPriority !== currentPriority) return false;
    return true;
  });

  // 2. Sort active unresolved incidents: highest priority first, then oldest received
  const sortedActiveIncidents = [...filteredIncidents]
    .filter((inc) => inc.status !== 'Resolved')
    .sort((a, b) => {
      const rankA = priorityRank[a.operationalPriority] || 5;
      const rankB = priorityRank[b.operationalPriority] || 5;
      if (rankA !== rankB) return rankA - rankB;
      const timeA = parseTimestamp(a.receivedTimestamp)?.getTime() || 0;
      const timeB = parseTimestamp(b.receivedTimestamp)?.getTime() || 0;
      if (timeA !== timeB) return timeA - timeB;
      return (a.sequenceNumber || 0) - (b.sequenceNumber || 0);
    });

  // Top 4 to 6 highest priority active incidents displayed below the map
  const displayedIncidents = sortedActiveIncidents.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* 1. Header & Priority Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-200 flex items-center justify-center shadow-2xs shrink-0">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Emergency Map
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              View active emergencies, locations and response activity in real time.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Priority Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs border border-slate-200/60">
            {['All', 'Critical', 'High', 'Medium', 'Low'].map((p) => {
              const isActive = currentPriority === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, priority: p }))}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-white text-slate-900 shadow-2xs border border-slate-200 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span>
              {filteredIncidents.length} {filteredIncidents.length === 1 ? 'Emergency' : 'Active Incidents'}
            </span>
          </span>
        </div>
      </div>

      {/* 2. Full Map Container (Zero Obstruction, 560px-650px responsive height) */}
      <div
        ref={mapSectionRef}
        className="w-full rounded-2xl overflow-hidden border border-slate-200 shadow-xs bg-slate-100"
      >
        <LeafletGisMap
          heightClass="h-[560px] sm:h-[600px] lg:h-[640px]"
          isFullView={true}
          onOpenAssignModal={(inc) => setAssignIncident(inc)}
        />
      </div>

      {/* 3. Active Incidents Section Below the Map */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-4">
        {/* Section Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
            <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">
              Active Incidents
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {sortedActiveIncidents.length} in queue
            </span>
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('incidents')}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 hover:underline cursor-pointer"
          >
            <span>View All Incidents</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Responsive Cards Grid */}
        {displayedIncidents.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {displayedIncidents.map((incident) => {
              const isFocused = focusedIncidentId === incident.id;
              return (
                <div
                  key={incident.id}
                  onClick={() => {
                    setSelectedIncident(incident);
                    setFocusedIncidentId(incident.id);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between hover:shadow-md ${
                    isFocused
                      ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Header: ID, Priority, Status */}
                    <div className="flex items-center justify-between gap-1.5 mb-2">
                      <span className="font-extrabold text-xs font-mono text-slate-900">
                        {incident.id}
                      </span>
                      <div className="flex items-center gap-1">
                        <PriorityBadge priority={incident.operationalPriority} size="sm" />
                        <StatusBadge status={incident.status} size="sm" />
                      </div>
                    </div>

                    {/* Category Title */}
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1">
                      <AlertOctagon className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate">{getCategoryLabel(incident.category)}</span>
                    </div>

                    {/* Location */}
                    <div className="text-[11px] text-slate-600 flex items-start gap-1 mb-2 font-medium">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">{incident.locationName}</span>
                    </div>
                  </div>

                  {/* Card Footer: Time & Show on Map Action */}
                  {(() => {
                    const dt = formatIncidentDateTime(incident.receivedTimestamp, currentTime);
                    return (
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs mt-2">
                        <div className="min-w-0 pr-1">
                          <span className="text-[11px] font-bold text-blue-900 block truncate">
                            Received {dt.relative}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono block mt-0.5 truncate" title={dt.exact}>
                            {dt.exact}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFocusedIncidentId(incident.id);
                            mapSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          }}
                          className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                          title="Focus map on this incident"
                        >
                          <MapPin className="w-3 h-3 text-blue-600" />
                          <span>Show on Map</span>
                        </button>
                      </div>
                    );
                  })()}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80">
            <p className="text-xs font-semibold text-slate-700">No active emergencies found</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              There are currently no active incidents matching the selected priority filter.
            </p>
          </div>
        )}
      </div>

      {/* Global Modals */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={Boolean(selectedIncident)}
        onClose={() => setSelectedIncident(null)}
      />

      {assignIncident && (
        <AssignTeamModal
          incident={assignIncident}
          isOpen={Boolean(assignIncident)}
          onClose={() => setAssignIncident(null)}
        />
      )}
    </div>
  );
};

