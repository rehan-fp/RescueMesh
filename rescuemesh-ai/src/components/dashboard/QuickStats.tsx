import React from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { PriorityLevel } from '../../types';
import { PriorityBadge, StatusBadge } from '../common/Badges';
import { formatTimelineEvent } from '../../utils/operationalLanguage';
import { formatTimelineEventTimestamp } from '../../utils/dateTime';
import {
  Users2,
  Activity,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Radio,
  Send,
  Flame,
  ArrowRight
} from 'lucide-react';

export const QuickStats: React.FC = () => {
  const { incidents, rescueTeams, setActiveTab, setSelectedIncident, currentTime } = useEmergency();

  // Priority calculations
  const total = incidents.length;
  const criticalCount = incidents.filter((i) => i.operationalPriority === 'Critical').length;
  const highCount = incidents.filter((i) => i.operationalPriority === 'High').length;
  const mediumCount = incidents.filter((i) => i.operationalPriority === 'Medium').length;
  const lowCount = incidents.filter((i) => i.operationalPriority === 'Low').length;

  const availableTeams = rescueTeams.filter((t) => t.status === 'Available');
  const deployedTeams = rescueTeams.filter(
    (t) => t.status === 'Assigned' || t.status === 'In Progress'
  );

  // Recent operational timeline entries across all incidents
  const recentEvents = incidents
    .flatMap((inc) =>
      inc.timeline.map((entry) => ({
        ...entry,
        incidentId: inc.id,
        category: inc.category,
        priority: inc.operationalPriority,
        location: inc.locationName
      }))
    )
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* 1. Priority Distribution */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Priority Distribution
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">{total} Total</span>
        </div>

        <div className="space-y-3">
          {/* Critical */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-rose-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                Critical Priority
              </span>
              <span className="font-mono text-slate-800">
                {criticalCount}{' '}
                <span className="text-[11px] text-slate-400 font-normal">
                  ({Math.round((criticalCount / (total || 1)) * 100)}%)
                </span>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-rose-600 rounded-full transition-all duration-300"
                style={{ width: `${(criticalCount / (total || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* High */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-amber-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                High Priority
              </span>
              <span className="font-mono text-slate-800">
                {highCount}{' '}
                <span className="text-[11px] text-slate-400 font-normal">
                  ({Math.round((highCount / (total || 1)) * 100)}%)
                </span>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${(highCount / (total || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Medium */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-yellow-800 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                Medium Priority
              </span>
              <span className="font-mono text-slate-800">
                {mediumCount}{' '}
                <span className="text-[11px] text-slate-400 font-normal">
                  ({Math.round((mediumCount / (total || 1)) * 100)}%)
                </span>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${(mediumCount / (total || 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Low */}
          <div>
            <div className="flex items-center justify-between text-xs font-semibold mb-1">
              <span className="text-emerald-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Low Priority
              </span>
              <span className="font-mono text-slate-800">
                {lowCount}{' '}
                <span className="text-[11px] text-slate-400 font-normal">
                  ({Math.round((lowCount / (total || 1)) * 100)}%)
                </span>
              </span>
            </div>
            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${(lowCount / (total || 1)) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. Rescue Team Availability */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Users2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Response Team Availability
              </h3>
            </div>
            <button
              onClick={() => setActiveTab('teams')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
            >
              Teams View <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="bg-emerald-50 border border-emerald-200/80 rounded-lg p-2.5">
              <span className="text-[11px] font-semibold text-emerald-800 block">Available</span>
              <span className="text-xl font-extrabold text-emerald-700 font-mono">
                {availableTeams.length}
              </span>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Ready for dispatch</span>
            </div>
            <div className="bg-blue-50 border border-blue-200/80 rounded-lg p-2.5">
              <span className="text-[11px] font-semibold text-blue-800 block">Deployed</span>
              <span className="text-xl font-extrabold text-blue-700 font-mono">
                {deployedTeams.length}
              </span>
              <span className="text-[10px] text-blue-600 block mt-0.5">On Active Missions</span>
            </div>
          </div>

          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {rescueTeams.slice(0, 3).map((team) => (
              <div
                key={team.id}
                className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
              >
                <div className="truncate mr-2">
                  <span className="font-semibold text-slate-900 block truncate">{team.name}</span>
                  <span className="text-[10px] text-slate-500 truncate">{team.baseLocation}</span>
                </div>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                    team.status === 'Available'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  {team.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Recent Live Operations Audit Log */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Recent Operations Log
              </h3>
            </div>
            <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
            </span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto divide-y divide-slate-100">
            {recentEvents.map((ev, idx) => {
              const formattedEvt = formatTimelineEvent(ev, {
                category: ev.category,
                operationalPriority: ev.priority
              });

              return (
                <div
                  key={idx}
                  onClick={() => {
                    const inc = incidents.find((i) => i.id === ev.incidentId);
                    if (inc) setSelectedIncident(inc);
                  }}
                  className="pt-2 first:pt-0 cursor-pointer hover:bg-slate-50 p-1.5 rounded transition-colors text-xs"
                >
                  <div className="flex items-center justify-between gap-1 text-[11px]">
                    <span className="font-bold text-slate-900">{ev.incidentId}</span>
                    {(() => {
                      const timeInfo = formatTimelineEventTimestamp(ev.timestamp, currentTime);
                      return (
                        <span className="text-slate-500 font-mono text-[10px]" title={timeInfo.exact}>
                          {timeInfo.display}
                          {timeInfo.relative && <span className="ml-1 text-blue-600 font-medium">({timeInfo.relative})</span>}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="text-slate-600 text-[11px] line-clamp-1 mt-0.5">{formattedEvt.description}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-1">
                    <span>Operator: {formattedEvt.operator}</span>
                    <StatusBadge status={ev.status} size="sm" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
