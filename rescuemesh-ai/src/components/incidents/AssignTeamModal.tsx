import React, { useState } from 'react';
import { Incident } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { calculateDistanceKm } from '../../utils/formatters';
import {
  Users2,
  Send,
  X,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { CategoryBadge, RiskZoneBadge, PriorityBadge } from '../common/Badges';

interface AssignTeamModalProps {
  incident: Incident;
  isOpen: boolean;
  onClose: () => void;
}

export const AssignTeamModal: React.FC<AssignTeamModalProps> = ({
  incident,
  isOpen,
  onClose
}) => {
  const { rescueTeams, assignTeamToIncident, currentUser, setActiveTab } = useEmergency();
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [assignmentNotes, setAssignmentNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Calculate distance for all teams to this incident
  const teamsWithDistance = rescueTeams.map((team) => {
    const distanceKm = calculateDistanceKm(
      incident.latitude,
      incident.longitude,
      team.latitude,
      team.longitude
    );
    return { ...team, distanceKm };
  });

  // Sort: Available first, then by distance
  teamsWithDistance.sort((a, b) => {
    if (a.status === 'Available' && b.status !== 'Available') return -1;
    if (a.status !== 'Available' && b.status === 'Available') return 1;
    return a.distanceKm - b.distanceKm;
  });

  const availableTeams = teamsWithDistance.filter((t) => t.status === 'Available');

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamId) {
      setError('Please select an available response team to assign.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await assignTeamToIncident(incident.id, selectedTeamId, assignmentNotes.trim());
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete team assignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white rounded-xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <Users2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Assign Response Team</h3>
              <p className="text-xs text-slate-300">
                Incident {incident.id} • {incident.category} ({incident.locationName})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleAssign} className="p-5 space-y-4">
          {/* Incident Context Banner */}
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Priority:</span>
              <PriorityBadge priority={incident.operationalPriority} size="sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Emergency Type:</span>
              <CategoryBadge category={incident.category} size="sm" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-semibold">Flood Risk:</span>
              <RiskZoneBadge zone={incident.riskZone} size="sm" />
            </div>
            <div>
              <span className="text-slate-500 font-semibold">Nearby Requests:</span>{' '}
              <span className="font-bold text-slate-900">{incident.nearbySosCount} {incident.nearbySosCount === 1 ? 'request' : 'requests'}</span>
            </div>
          </div>

          {/* Teams Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-900">
                Select Available Response Team
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {availableTeams.length} available
              </span>
            </div>

            {teamsWithDistance.length === 0 ? (
              <div className="p-6 text-center border border-dashed border-slate-300 rounded-lg bg-slate-50 text-xs text-slate-500 space-y-2">
                <Users2 className="w-6 h-6 text-slate-400 mx-auto" />
                <p className="font-semibold text-slate-700">No response teams registered</p>
                <p className="text-[11px] text-slate-500">
                  An administrator can register response teams on the Response Teams page.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('rescue-teams');
                    onClose();
                  }}
                  className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition-colors cursor-pointer"
                >
                  Manage Response Teams
                </button>
              </div>
            ) : availableTeams.length === 0 ? (
              <div className="p-4 border border-amber-200 rounded-lg bg-amber-50 text-xs text-amber-800 space-y-2">
                <div className="flex items-center gap-1.5 font-bold">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>No Response Teams Currently Available</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  All registered teams are currently responding or unavailable. Manage team availability on the Response Teams page.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('rescue-teams');
                    onClose();
                  }}
                  className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded-md font-semibold text-xs transition-colors cursor-pointer inline-block"
                >
                  Manage Response Teams
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {teamsWithDistance.map((team) => {
                  const isAvailable = team.status === 'Available';
                  const isSelected = selectedTeamId === team.id;
                  const isResponding = team.status === 'Assigned' || team.status === 'In Progress';

                  return (
                    <label
                      key={team.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 cursor-pointer'
                          : isAvailable
                          ? 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                          : 'border-slate-200 bg-slate-50/70 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      <input
                        type="radio"
                        name="responseTeamSelection"
                        value={team.id}
                        disabled={!isAvailable && !isSelected}
                        checked={isSelected}
                        onChange={() => {
                          setSelectedTeamId(team.id);
                          if (error) setError(null);
                        }}
                        className="mt-1 accent-blue-600 cursor-pointer disabled:cursor-not-allowed"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-slate-900 truncate">
                            {team.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isAvailable
                                ? 'bg-emerald-100 text-emerald-800'
                                : isResponding
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isAvailable
                              ? 'Available'
                              : isResponding
                              ? `Responding (${team.currentIncidentCode || 'Active'})`
                              : 'Unavailable'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                          <span>Lead: {team.teamLead || 'Not specified'}</span>
                          <span>•</span>
                          <span>Capability: {team.type}</span>
                          <span>•</span>
                          <span className="font-mono text-blue-600 font-semibold">
                            {team.distanceKm} km away
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                          Base: {team.baseLocation} • Phone: {team.contactPhone || 'Not provided'}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}

            {error && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="font-medium">{error}</span>
              </div>
            )}
          </div>

          {/* Assignment Notes */}
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-1">
              Assignment Notes (Optional)
            </label>
            <textarea
              value={assignmentNotes}
              onChange={(e) => setAssignmentNotes(e.target.value)}
              placeholder="e.g., Team should carry medical emergency kit and approach via North Causeway..."
              rows={2}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Operator: {currentUser?.name || 'Emergency Operator'}</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || availableTeams.length === 0}
                className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Assigning…' : 'Confirm Assignment'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
