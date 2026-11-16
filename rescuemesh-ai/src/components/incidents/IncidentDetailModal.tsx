import React, { useState } from 'react';
import { Incident } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { PriorityBadge, CategoryBadge, StatusBadge, RiskZoneBadge } from '../common/Badges';
import { WorkflowStepper } from './WorkflowStepper';
import { AiOverrideModal } from './AiOverrideModal';
import { AssignTeamModal } from './AssignTeamModal';
import {
  getCategoryLabel,
  getPriorityLabel,
  getStatusLabel,
  getSignalQuality,
  getBatteryStatus,
  formatTimelineEvent
} from '../../utils/operationalLanguage';
import {
  formatIncidentDateTime,
  formatTimelineEventTimestamp
} from '../../utils/dateTime';
import {
  X,
  MapPin,
  Clock,
  Radio,
  Users2,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  ArrowRight,
  GitBranch,
  Lock,
  Battery,
  AlertTriangle,
  Play,
  Cpu,
  History
} from 'lucide-react';

interface IncidentDetailModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  isOpen,
  onClose
}) => {
  const {
    updateIncidentStatus,
    rescueTeams,
    setActiveTab,
    setFocusedIncidentId,
    currentUser,
    currentTime
  } = useEmergency();

  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  if (!isOpen || !incident) return null;

  const isViewer = currentUser?.role === 'Viewer';
  const assignedTeam = incident.assignedTeamId
    ? rescueTeams.find((t) => t.id === incident.assignedTeamId)
    : null;

  const handleAdvanceStatus = (nextStatus: Incident['status'], note?: string) => {
    if (isViewer) return;
    updateIncidentStatus(incident.id, nextStatus, note);
  };

  const handleOpenOnLiveMap = () => {
    setFocusedIncidentId(incident.id);
    setActiveTab('live-map');
    onClose();
  };

  const signal = getSignalQuality(incident.rssiDbm, incident.snrDb);
  const battery = getBatteryStatus(incident.battery);
  const factors = incident.aiPriorityFactors || incident.decisionTreeFactors;
  const dt = formatIncidentDateTime(incident.receivedTimestamp, currentTime);

  return (
    <>
      <div
        className="fixed inset-0 z-[2000] flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="incident-modal-title"
      >
        <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150">
          {/* Header Bar */}
          <div className="p-4 sm:p-5 bg-[#0F172A] text-white flex items-center justify-between gap-3 shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 id="incident-modal-title" className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Incident {incident.id}
                  </h2>
                  <CategoryBadge category={incident.category} size="sm" />
                  <PriorityBadge priority={incident.operationalPriority} size="sm" />
                  <StatusBadge status={incident.status} size="sm" />
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                  <span>Reported: <strong className="text-white font-mono">{dt.exact}</strong></span>
                  <span className="text-slate-500">·</span>
                  <span className="text-blue-300 font-semibold bg-blue-950/80 border border-blue-800/60 px-2 py-0.5 rounded text-[11px]">
                    {dt.relative}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
              aria-label="Close emergency details"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {/* Viewer Notice if applicable */}
            {isViewer && (
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 text-xs flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>
                  <strong>Read-Only Mode:</strong> Priority overrides and team dispatches are restricted to authorized Emergency Operators and Incident Commanders.
                </span>
              </div>
            )}

            {/* Workflow Progress Stepper */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Emergency Response Workflow
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  Current Status: <strong className="text-blue-700">{getStatusLabel(incident.status)}</strong>
                </span>
              </div>
              <WorkflowStepper
                currentStatus={incident.status}
                timeline={incident.timeline}
                onStatusChange={(newSt) => !isViewer && updateIncidentStatus(incident.id, newSt)}
              />
            </div>

            {/* Emergency Overview & Location Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Emergency Overview Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                    <AlertOctagon className="w-4 h-4 text-blue-600" />
                    Emergency Details
                  </h3>

                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Incident ID:</span>
                      <span className="font-bold font-mono text-slate-900">{incident.id}</span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Emergency Type:</span>
                      <CategoryBadge category={incident.category} size="sm" />
                    </div>
                    <div className="flex justify-between items-start py-1.5 border-b border-slate-50">
                      <span className="text-slate-500 font-medium pt-0.5">Reported:</span>
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block font-mono text-xs">{dt.exact}</span>
                        <span className="text-[11px] font-semibold text-blue-700 block mt-0.5">{dt.relative}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-slate-50">
                      <span className="text-slate-500 font-medium">Status:</span>
                      <StatusBadge status={incident.status} size="sm" />
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-500 font-medium">Flood Risk:</span>
                      <RiskZoneBadge zone={incident.riskZone} size="sm" />
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Nearby Emergencies:</span>
                  <span className="font-bold text-slate-800">
                    {incident.nearbySosCount > 0
                      ? `${incident.nearbySosCount} nearby ${incident.nearbySosCount === 1 ? 'emergency' : 'emergencies'} reported recently`
                      : 'No nearby emergencies reported recently'}
                  </span>
                </div>
              </div>

              {/* Emergency Location Card */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-rose-600" />
                      Location
                    </h3>
                    <button
                      onClick={handleOpenOnLiveMap}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>View on Map</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 space-y-2.5 text-xs">
                    <div>
                      <span className="text-slate-500 block text-[11px] font-medium">Location:</span>
                      <span className="font-bold text-slate-900 text-sm block mt-0.5">
                        {incident.locationName || 'Location pending resolution'}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-slate-200/60">
                      <span className="text-slate-500 block text-[11px] font-medium mb-1">GPS Coordinates:</span>
                      {incident.latitude != null && incident.longitude != null ? (
                        <div className="grid grid-cols-2 gap-2 mt-0.5">
                          <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-medium">Latitude</span>
                            <span className="font-mono text-slate-900 font-bold text-xs">
                              {Number(incident.latitude).toFixed(6)}
                            </span>
                          </div>
                          <div className="bg-white px-2.5 py-1.5 rounded border border-slate-200">
                            <span className="text-[10px] text-slate-400 block font-medium">Longitude</span>
                            <span className="font-mono text-slate-900 font-bold text-xs">
                              {Number(incident.longitude).toFixed(6)}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-slate-200 rounded px-2.5 py-2 text-[11px] text-slate-700 font-medium">
                          {incident.locationSource === 'CONFIGURED_VENUE'
                            ? 'GPS Satellite Lock: None (Actual GPS null)'
                            : 'Waiting for device to obtain GPS satellite fix'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                  <span>Location Source:</span>
                  <span className="font-medium text-slate-700 font-mono text-xs">
                    {incident.locationSource || (incident.latitude != null && incident.longitude != null ? 'GPS_FIXED' : 'Waiting for Location')}
                  </span>
                </div>
              </div>
            </div>

            {/* Priority Assessment & Recommendation Card */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs shrink-0">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Priority Assessment
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-600 font-medium">Current Priority:</span>
                      <PriorityBadge priority={incident.operationalPriority} size="sm" />
                      {!incident.isOverridden && (
                        <span className="text-[11px] text-slate-400 font-medium">
                          (matches recommendation)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!isViewer && (
                    <button
                      onClick={() => setShowOverrideModal(true)}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 shadow-2xs transition-colors cursor-pointer"
                    >
                      Override Priority
                    </button>
                  )}
                </div>
              </div>

              {/* Overridden Banner if active */}
              {incident.isOverridden ? (
                <div className="mt-3 p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-xs text-amber-950 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span className="flex items-center gap-1.5 text-amber-900">
                      <ShieldCheck className="w-4 h-4 text-amber-700" />
                      Priority Adjusted by {incident.overrideOperator || 'Authorized Operator'}
                    </span>
                    <span className="font-mono text-[10px] text-amber-800">
                      {incident.overrideTimestamp}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                    <div>
                      <span className="text-amber-800 font-medium block">Current Priority:</span>
                      <span className="font-bold text-amber-950">{incident.operationalPriority}</span>
                    </div>
                    <div>
                      <span className="text-amber-800 font-medium block">Recommended Priority:</span>
                      <span className="font-bold text-amber-950">{incident.aiRecommendedPriority}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-amber-900 pt-1 border-t border-amber-200/60">
                    <span className="font-semibold">Reason:</span> "{incident.overrideReason}"
                  </p>
                </div>
              ) : (
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs text-slate-600">
                  <span>Recommended Priority: <strong className="text-slate-900">{incident.aiRecommendedPriority}</strong></span>
                  <span className="text-[11px] text-emerald-700 font-medium">Active operational recommendation</span>
                </div>
              )}

              {/* Factors Considered */}
              <div className="mt-3 bg-white p-3.5 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-2.5">
                  Factors Considered
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-500 block font-medium">Emergency Type</span>
                    <span className="font-bold text-slate-900 block mt-0.5">{incident.category}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-500 block font-medium">Flood Risk</span>
                    <span className="font-bold text-slate-900 block mt-0.5">{incident.riskZone}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-500 block font-medium">Nearby Emergencies</span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {incident.nearbySosCount}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[11px] text-slate-500 block font-medium">Waiting Time</span>
                    <span className="font-bold text-slate-900 block mt-0.5">
                      {factors?.requestAgeMinutes != null ? `${factors.requestAgeMinutes} min` : dt.relative}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Response Team Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Users2 className="w-4 h-4 text-blue-600" />
                  Response Team
                </h3>
                {!isViewer && (
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(true)}
                    className="px-3 py-1 rounded-lg text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <span>{incident.assignedTeamId ? 'Reassign Team' : 'Assign Team'}</span>
                  </button>
                )}
              </div>

              {incident.assignedTeamName ? (
                <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-950 text-sm">
                      {incident.assignedTeamName}
                    </span>
                    <span className="font-bold text-[10px] px-2 py-0.5 rounded bg-blue-200 text-blue-900">
                      Dispatched
                    </span>
                  </div>
                  <p className="text-blue-700 text-[11px] mt-1">
                    Dispatched: {incident.assignedTimestamp}
                  </p>
                  {assignedTeam && (
                    <div className="mt-2 pt-2 border-t border-blue-200/60 flex items-center justify-between text-[11px] text-blue-900">
                      <span>Lead: <strong>{assignedTeam.teamLead}</strong></span>
                      <span className="font-mono">{assignedTeam.contactPhone}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
                  <p className="font-bold text-slate-800">Not assigned</p>
                  <p className="text-[11px] text-slate-500 mt-1">
                    No response team is currently assigned. Select an available team to dispatch assistance.
                  </p>
                </div>
              )}
            </div>

            {/* Activity History */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                Activity History
              </h3>

              <div className="space-y-2.5">
                {incident.timeline && incident.timeline.length > 0 ? (
                  incident.timeline.map((entry, idx) => {
                    const evt = formatTimelineEvent(entry, incident);
                    const timeInfo = formatTimelineEventTimestamp(entry.timestamp, currentTime);
                    return (
                      <div key={idx} className="flex items-start gap-3 text-xs">
                        <div className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" />
                        <div className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-slate-900">
                              {evt.title}
                            </span>
                            <span
                              className="font-mono text-[10px] text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200 shrink-0 font-medium"
                              title={timeInfo.exact ? `${timeInfo.exact} (${timeInfo.relative})` : ''}
                            >
                              {timeInfo.display}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{evt.description}</p>
                          <span className="text-[10px] text-slate-400 font-medium block mt-1">
                            Operator: {evt.operator}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-500 italic py-2">No activity recorded yet.</p>
                )}
              </div>
            </div>

            {/* Technical Details [collapsed by default] */}
            <details className="border border-slate-200 rounded-xl bg-slate-50/60 overflow-hidden group">
              <summary className="px-4 py-3 cursor-pointer text-xs font-bold text-slate-700 flex items-center justify-between hover:bg-slate-100 transition-colors select-none">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-slate-500" />
                  <span>Technical Details</span>
                </div>
                <span className="text-[11px] text-slate-400 font-normal">Click to expand diagnostics</span>
              </summary>
              <div className="p-4 border-t border-slate-200 bg-white text-xs text-slate-600 space-y-2.5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Device Identifier</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">{incident.deviceId}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Gateway Identifier</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">{incident.gatewayId || 'GATEWAY_001'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Communication Quality</span>
                    <span className="font-bold text-emerald-700 text-xs flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      {signal.label} ({signal.description})
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Device Battery</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">{battery.label}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Signal Strength (RSSI)</span>
                    <span className="font-mono text-slate-900 text-xs">{incident.rssiDbm != null ? `${incident.rssiDbm} dBm` : 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Signal-to-Noise Ratio (SNR)</span>
                    <span className="font-mono text-slate-900 text-xs">{incident.snrDb != null ? `+${incident.snrDb} dB` : 'N/A'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Communication Frequency</span>
                    <span className="font-mono text-slate-900 text-xs">433.0 MHz LoRa</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Packet Sequence Number</span>
                    <span className="font-mono text-slate-900 text-xs">#{incident.sequenceNumber}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Model Framework</span>
                    <span className="font-mono text-slate-900 text-xs">{incident.aiModel || 'TabPFNClassifier'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Location Source</span>
                    <span className="font-mono font-bold text-slate-900 text-xs">
                      {incident.locationSource || (incident.latitude != null ? 'GPS_FIXED' : 'NO_FIX')}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Actual GPS (Hardware)</span>
                    <span className="font-mono text-slate-900 text-xs">
                      {incident.latitude != null && incident.longitude != null
                        ? `${Number(incident.latitude).toFixed(6)}, ${Number(incident.longitude).toFixed(6)}`
                        : 'null (no fix)'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Map Display Coords</span>
                    <span className="font-mono text-slate-900 text-xs">
                      {incident.displayLatitude != null && incident.displayLongitude != null
                        ? `${Number(incident.displayLatitude).toFixed(6)}, ${Number(incident.displayLongitude).toFixed(6)}`
                        : incident.latitude != null && incident.longitude != null
                        ? `${Number(incident.latitude).toFixed(6)}, ${Number(incident.longitude).toFixed(6)}`
                        : 'None'}
                    </span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Priority Source</span>
                    <span className="font-mono text-slate-900 text-xs">{incident.prioritySource?.toUpperCase() || 'AI MODEL'}</span>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 col-span-2">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Intake Timestamp (Asia/Colombo UTC+05:30)</span>
                    <span className="font-mono text-slate-900 text-xs">{dt.exactWithZone || dt.exact} <span className="text-slate-400 font-normal">({dt.iso || incident.receivedTimestamp})</span></span>
                  </div>
                </div>
              </div>
            </details>
          </div>

          {/* Modal Footer Controls */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2 flex-wrap">
              {!isViewer && incident.status === 'New' && (
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus('Acknowledged', 'Emergency acknowledged by command center operator')}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Acknowledge</span>
                </button>
              )}

              {!isViewer && incident.status !== 'Resolved' && (
                <button
                  type="button"
                  onClick={() => setShowAssignModal(true)}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Users2 className="w-3.5 h-3.5" />
                  <span>{incident.assignedTeamId ? 'Reassign Team' : 'Assign Team'}</span>
                </button>
              )}

              {!isViewer && (incident.status === 'Assigned' || incident.status === 'Acknowledged') && (
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus('In Progress', 'Response team deployed and en route')}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-amber-600 text-white hover:bg-amber-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Start Response</span>
                </button>
              )}

              {!isViewer && incident.status === 'In Progress' && (
                <button
                  type="button"
                  onClick={() => handleAdvanceStatus('Resolved', 'Emergency assistance completed and incident resolved')}
                  className="px-3.5 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Resolved</span>
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Nested Modals */}
      <AiOverrideModal
        incident={incident}
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
      />

      <AssignTeamModal
        incident={incident}
        isOpen={showAssignModal}
        onClose={() => setShowAssignModal(false)}
      />
    </>
  );
};
