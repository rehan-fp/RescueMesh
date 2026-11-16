import React from 'react';
import { Incident } from '../../types';
import { CategoryBadge, PriorityBadge, RiskZoneBadge } from '../common/Badges';
import { getStatusLabel } from '../../utils/operationalLanguage';
import { formatRelativeTime } from '../../utils/dateTime';
import { MapPin, Clock, X, ShieldAlert, ArrowRight, UserPlus } from 'lucide-react';

interface IncidentMapDetailCardProps {
  incident: Incident;
  onClose: () => void;
  onViewDetails: (incident: Incident) => void;
  onAssignTeam?: (incident: Incident) => void;
  onAcknowledge?: (incidentId: string) => void;
}

export const IncidentMapDetailCard: React.FC<IncidentMapDetailCardProps> = ({
  incident,
  onClose,
  onViewDetails,
  onAssignTeam,
  onAcknowledge
}) => {
  const isNew = incident.status === 'New';
  const isResolved = incident.status === 'Resolved';
  const hasAssignedTeam = Boolean(incident.assignedTeamName);

  return (
    <>
      {/* Desktop / Tablet Floating Side Card */}
      <div
        className="hidden sm:block absolute top-14 right-3 z-[450] w-80 max-w-[calc(100%-1.5rem)] animate-in fade-in slide-in-from-right-3 duration-150"
        role="dialog"
        aria-label={`Details for incident ${incident.id}`}
      >
        <div className="bg-white/95 backdrop-blur-md rounded-xl border border-slate-200 shadow-xl overflow-hidden text-xs select-none">
          {/* Card Header Bar */}
          <div className="p-3 pb-2.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
            <div className="flex items-center gap-1.5 flex-wrap">
              <CategoryBadge category={incident.category} size="sm" />
              <PriorityBadge priority={incident.operationalPriority} size="sm" />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-md transition-colors cursor-pointer"
              title="Close incident card"
              aria-label="Close card"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3.5 space-y-3">
            {/* Incident ID & Location */}
            <div>
              <div className="flex items-center justify-between">
                <span className="font-extrabold text-sm text-slate-900 tracking-tight font-mono">
                  {incident.id}
                </span>
                <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Operational Urgency
                </span>
              </div>
              <p className="text-xs text-slate-700 font-semibold mt-1 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span className="line-clamp-2">{incident.locationName || 'Location resolving...'}</span>
              </p>
              <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                <span>Reported {formatRelativeTime(incident.receivedTimestamp || incident.receivedAt)}</span>
              </p>
            </div>

            {/* Matrix Chips */}
            <div className="grid grid-cols-2 gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-500 block text-[10px] font-medium uppercase tracking-wider">
                  Flood Risk
                </span>
                <div className="mt-0.5">
                  <RiskZoneBadge zone={incident.riskZone} size="sm" />
                </div>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-medium uppercase tracking-wider">
                  Status
                </span>
                <span className="font-semibold text-slate-800 block mt-0.5">
                  {getStatusLabel(incident.status)}
                </span>
              </div>
              <div className="col-span-2 pt-1.5 border-t border-slate-200/60">
                <span className="text-slate-500 block text-[10px] font-medium uppercase tracking-wider">
                  Response Team
                </span>
                <span className="font-semibold text-slate-800 block mt-0.5 truncate">
                  {incident.assignedTeamName
                    ? incident.assignedTeamName
                    : incident.status === 'In Progress'
                    ? 'Responding (Field deployment)'
                    : 'Not assigned'}
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => onViewDetails(incident)}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <span>View Details</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              {isNew && onAcknowledge && (
                <button
                  type="button"
                  onClick={() => onAcknowledge(incident.id)}
                  className="py-1.5 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 font-semibold text-xs transition-colors cursor-pointer"
                >
                  Acknowledge
                </button>
              )}

              {!isResolved && !hasAssignedTeam && onAssignTeam && (
                <button
                  type="button"
                  onClick={() => onAssignTeam(incident)}
                  className="py-1.5 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Assign Team</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Sheet (Compact <= 40% height) */}
      <div
        className="sm:hidden absolute bottom-0 inset-x-0 z-[450] max-h-[42%] overflow-y-auto bg-white rounded-t-2xl border-t border-slate-200 shadow-2xl p-4 animate-in slide-in-from-bottom-6 duration-200"
        role="dialog"
        aria-label={`Details for incident ${incident.id}`}
      >
        <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3" />

        <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
          <div className="flex items-center gap-1.5">
            <CategoryBadge category={incident.category} size="sm" />
            <PriorityBadge priority={incident.operationalPriority} size="sm" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
            aria-label="Close bottom sheet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-2.5 space-y-2 text-xs">
          <div className="flex items-baseline justify-between">
            <span className="font-extrabold text-sm text-slate-900 font-mono">{incident.id}</span>
            <span className="text-[11px] text-slate-500">
              Reported {formatRelativeTime(incident.receivedTimestamp || incident.receivedAt)}
            </span>
          </div>

          <p className="text-xs text-slate-700 font-medium truncate flex items-center gap-1">
            <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
            <span>{incident.locationName || 'Location resolving...'}</span>
          </p>

          <div className="flex items-center gap-2 pt-1 text-[11px]">
            <RiskZoneBadge zone={incident.riskZone} size="sm" />
            <span className="text-slate-600 font-medium">Status: {getStatusLabel(incident.status)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => onViewDetails(incident)}
            className="flex-1 py-2 px-3 rounded-lg bg-slate-900 text-white font-semibold text-xs text-center"
          >
            View Details
          </button>
          {!isResolved && !hasAssignedTeam && onAssignTeam && (
            <button
              type="button"
              onClick={() => onAssignTeam(incident)}
              className="py-2 px-3 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-xs"
            >
              Assign Team
            </button>
          )}
        </div>
      </div>
    </>
  );
};
