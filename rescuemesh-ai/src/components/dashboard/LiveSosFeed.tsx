import React from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { Incident } from '../../types';
import { PriorityBadge, CategoryBadge, StatusBadge } from '../common/Badges';
import { getCategoryLabel, getStatusLabel } from '../../utils/operationalLanguage';
import { formatIncidentDateTime } from '../../utils/dateTime';
import {
  Clock,
  MapPin,
  ShieldAlert,
  ChevronRight,
  Radio,
  CheckCircle2,
  Users2
} from 'lucide-react';

interface LiveSosFeedProps {
  onOpenAssignModal?: (incident: Incident) => void;
}

export const LiveSosFeed: React.FC<LiveSosFeedProps> = ({ onOpenAssignModal }) => {
  const {
    incidents,
    focusedIncidentId,
    setFocusedIncidentId,
    setSelectedIncident,
    acknowledgeIncident,
    setActiveTab,
    filters,
    currentTime
  } = useEmergency();

  // Filter incidents according to dashboard filters
  const filteredIncidents = incidents.filter((inc) => {
    if (filters.priority !== 'All' && inc.operationalPriority !== filters.priority) return false;
    if (filters.category !== 'All' && inc.category !== filters.category) return false;
    if (filters.riskZone !== 'All' && inc.riskZone !== filters.riskZone) return false;
    if (filters.status !== 'All' && inc.status !== filters.status) return false;
    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      const matches =
        inc.id.toLowerCase().includes(q) ||
        inc.deviceId.toLowerCase().includes(q) ||
        inc.locationName.toLowerCase().includes(q);
      if (!matches) return false;
    }
    return true;
  });

  const activeCount = filteredIncidents.filter((i) => i.status !== 'Resolved').length;
  const newCount = filteredIncidents.filter((i) => i.status === 'New').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex flex-col h-[530px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Active Incidents Queue
          </h3>
        </div>
        <div className="flex items-center gap-1.5">
          {newCount > 0 ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              {newCount} New Emergencies
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700">
              {activeCount} Active
            </span>
          )}
        </div>
      </div>

      {/* Incident List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {filteredIncidents.length === 0 ? (
          <div className="py-20 text-center text-xs text-slate-500 flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
              <CheckCircle2 className="w-5 h-5 text-slate-400" />
            </div>
            <p className="font-bold text-slate-700 text-sm">No active incidents</p>
            <p className="text-slate-400 mt-1 max-w-[200px]">
              No emergency requests require immediate attention or match active filters.
            </p>
          </div>
        ) : (
          filteredIncidents.map((incident) => {
            const isFocused = focusedIncidentId === incident.id;
            const isCritical = incident.operationalPriority === 'Critical';

            return (
              <div
                key={incident.id}
                onClick={() => {
                  setFocusedIncidentId(incident.id);
                  setSelectedIncident(incident);
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isFocused
                    ? 'border-blue-500 bg-blue-50/30 shadow-xs ring-1 ring-blue-500'
                    : isCritical
                    ? 'border-rose-200 bg-rose-50/20 hover:border-rose-300'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs'
                }`}
              >
                {/* Top Row: ID, Time, Priority */}
                {(() => {
                  const dt = formatIncidentDateTime(incident.receivedTimestamp, currentTime);
                  return (
                    <div className="flex justify-between items-start mb-1.5 gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold font-mono text-slate-900">
                          {incident.id}
                        </span>
                        <PriorityBadge priority={incident.operationalPriority} size="sm" />
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-semibold text-blue-700 block">
                          {dt.relative}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium block mt-0.5" title={dt.exactWithZone || `${dt.exact} (+05:30)`}>
                          {dt.exact}
                        </span>
                      </div>
                    </div>
                  );
                })()}

                {/* Emergency Title & Category */}
                <div className="flex items-center justify-between gap-2 mt-1">
                  <h4 className="text-xs font-bold text-slate-800 truncate">
                    {getCategoryLabel(incident.category)}
                  </h4>
                  <StatusBadge status={incident.status} size="sm" />
                </div>

                {/* Location */}
                <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{incident.locationName}</span>
                </div>

                {/* Card Footer Actions */}
                <div
                  className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="text-[11px] text-slate-500 truncate">
                    {incident.assignedTeamName ? (
                      <span className="text-blue-700 font-semibold truncate">
                        {incident.assignedTeamName}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">Awaiting Team Dispatch</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {incident.status === 'New' && (
                      <button
                        type="button"
                        onClick={() => acknowledgeIncident(incident.id)}
                        className="px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold rounded-md border border-purple-200 transition-colors cursor-pointer"
                      >
                        Acknowledge
                      </button>
                    )}

                    {incident.status !== 'Resolved' && !incident.assignedTeamId && onOpenAssignModal && (
                      <button
                        type="button"
                        onClick={() => onOpenAssignModal(incident)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold rounded-md shadow-2xs transition-colors cursor-pointer"
                      >
                        Assign Team
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setFocusedIncidentId(incident.id);
                        setSelectedIncident(incident);
                      }}
                      className="px-2 py-1 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-[10px] font-semibold rounded-md transition-colors cursor-pointer flex items-center gap-0.5"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer link to full incidents table */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('incidents')}
          className="w-full py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer text-center"
        >
          View All Emergency Incidents
        </button>
      </div>
    </div>
  );
};
