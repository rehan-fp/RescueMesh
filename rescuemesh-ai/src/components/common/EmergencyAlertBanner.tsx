import React from 'react';
import { Incident } from '../../types';
import { formatRelativeTime } from '../../utils/dateTime';
import { getSavedPreferences } from '../../utils/preferences';
import {
  AlertOctagon,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  ExternalLink,
  CheckCircle2,
  MapPin,
  Clock,
  Layers
} from 'lucide-react';

interface EmergencyAlertBannerProps {
  alerts: Incident[];
  currentTime: Date;
  onDismiss: (incidentId: string) => void;
  onDismissAll: () => void;
  onViewIncident: (incident: Incident) => void;
  onAcknowledge: (incidentId: string) => void;
}

export const EmergencyAlertBanner: React.FC<EmergencyAlertBannerProps> = ({
  alerts,
  currentTime,
  onDismiss,
  onDismissAll,
  onViewIncident,
  onAcknowledge,
}) => {
  const prefs = getSavedPreferences();
  if (!prefs.bannerAlertsEnabled || !alerts || alerts.length === 0) return null;

  // Priority ranking for sorting: Critical (1), High (2), Medium (3), Low (4)
  const priorityRank = { Critical: 1, High: 2, Medium: 3, Low: 4 };

  const sortedAlerts = [...alerts].sort((a, b) => {
    const rankA = priorityRank[a.operationalPriority] || 5;
    const rankB = priorityRank[b.operationalPriority] || 5;
    if (rankA !== rankB) return rankA - rankB;
    return (
      (new Date(a.receivedTimestamp || 0).getTime()) -
      (new Date(b.receivedTimestamp || 0).getTime())
    );
  });

  const primaryAlert = sortedAlerts[0];
  const totalCount = sortedAlerts.length;
  const isCritical = primaryAlert.operationalPriority === 'Critical';
  const isHigh = primaryAlert.operationalPriority === 'High';

  const relativeAge = formatRelativeTime(primaryAlert.receivedTimestamp, currentTime);

  return (
    <div
      className="fixed top-20 right-4 sm:right-6 z-[9999] max-w-sm sm:max-w-md w-full pointer-events-none transition-all duration-200"
      role="alert"
      aria-live="assertive"
    >
      <div className="pointer-events-auto bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-700/80 overflow-hidden ring-1 ring-black/40 animate-in slide-in-from-top-4 duration-200">
        {/* Urgent Alert Banner Bar */}
        <div
          className={`px-4 py-2.5 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-white ${
            isCritical
              ? 'bg-red-600 animate-pulse'
              : isHigh
              ? 'bg-amber-600'
              : 'bg-blue-600'
          }`}
        >
          <div className="flex items-center gap-2">
            {isCritical ? (
              <AlertOctagon className="w-4 h-4 shrink-0" />
            ) : isHigh ? (
              <AlertTriangle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>
              {totalCount > 1 ? `${totalCount} New Emergencies Reported` : 'New Emergency Reported'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            {totalCount > 1 && (
              <button
                type="button"
                onClick={onDismissAll}
                className="text-[10px] uppercase font-bold text-white/80 hover:text-white px-1.5 py-0.5 rounded hover:bg-black/20 transition-colors cursor-pointer mr-1"
                title="Dismiss all alerts"
              >
                Dismiss All
              </button>
            )}
            <button
              type="button"
              onClick={() => onDismiss(primaryAlert.id)}
              className="p-1 text-white/80 hover:text-white rounded hover:bg-black/20 transition-colors cursor-pointer"
              aria-label="Dismiss alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 bg-[#0B132B] space-y-3">
          {/* Priority & Category Badge */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span
                className={`px-2.5 py-0.5 rounded-md text-xs font-black tracking-wide ${
                  isCritical
                    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : isHigh
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                }`}
              >
                {primaryAlert.operationalPriority.toUpperCase()}
              </span>
              <span className="text-sm font-bold text-white">
                {primaryAlert.category} Emergency
              </span>
            </div>

            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Reported {relativeAge}</span>
            </span>
          </div>

          {/* Location info */}
          <div className="flex items-start gap-2 text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-bold text-white block truncate">
                {primaryAlert.locationName}
              </span>
              {primaryAlert.district && (
                <span className="text-[11px] text-slate-400 block">
                  {primaryAlert.district}
                </span>
              )}
            </div>
          </div>

          {/* Operational Message */}
          <p className="text-xs text-slate-300 leading-relaxed">
            A new emergency request has been reported and requires command center attention.
          </p>

          {/* Multiple Incident Queue summary if more than 1 */}
          {totalCount > 1 && (
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <Layers className="w-3.5 h-3.5" />
                <span>+{totalCount - 1} more emergency pending review</span>
              </span>
              <span className="text-slate-500 font-mono">
                {sortedAlerts.slice(1).map(a => a.operationalPriority[0]).join(', ')}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onViewIncident(primaryAlert);
                onDismiss(primaryAlert.id);
              }}
              className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Emergency</span>
            </button>

            {primaryAlert.status === 'New' && (
              <button
                type="button"
                onClick={() => {
                  onAcknowledge(primaryAlert.id);
                  onDismiss(primaryAlert.id);
                }}
                className="py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Acknowledge</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
