import React, { useState } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { Incident } from '../../types';
import { PriorityBadge, CategoryBadge, RiskZoneBadge } from '../common/Badges';
import { AiOverrideModal } from '../incidents/AiOverrideModal';
import { getCategoryLabel } from '../../utils/operationalLanguage';
import {
  SlidersHorizontal,
  Info,
  ChevronRight,
  GitBranch,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp,
  Cpu
} from 'lucide-react';

interface AiDecisionSupportPanelProps {
  onOpenIncidentDetail: (incident: Incident) => void;
}

export const AiDecisionSupportPanel: React.FC<AiDecisionSupportPanelProps> = ({
  onOpenIncidentDetail
}) => {
  const { incidents, focusedIncidentId } = useEmergency();
  const [overrideModalIncident, setOverrideModalIncident] = useState<Incident | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  // Focus the focused incident or the first active critical/high incident, or the first incident
  const activeIncident =
    incidents.find((i) => i.id === focusedIncidentId) ||
    incidents.find((i) => i.status !== 'Resolved' && i.operationalPriority === 'Critical') ||
    incidents[0];

  if (!activeIncident) return null;

  const factors =
    activeIncident.aiPriorityFactors || activeIncident.decisionTreeFactors;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 sm:p-5">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <GitBranch className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Priority Assessment
            </h3>
            <p className="text-[11px] text-slate-500">
              Priority recommendation based on emergency type, flood risk, and waiting time
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
          className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 font-medium cursor-pointer"
        >
          <Cpu className="w-3.5 h-3.5 text-slate-400" />
          <span>Technical Details</span>
          {showTechnicalDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Expandable Model / Technical Diagnostics */}
      {showTechnicalDetails && (
        <div className="my-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5 animate-in fade-in duration-100">
          <p className="font-semibold text-slate-800">Priority Engine Details:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            <div>• Model: <span className="font-mono text-slate-800">{activeIncident.aiModel || 'Operational AI Model'}</span></div>
            <div>• Prediction Source: <span className="font-mono text-slate-800">{activeIncident.prioritySource?.toUpperCase() || 'AI MODEL'}</span></div>
            <div>• Assessment Criteria: Emergency Type, Flood Risk, Recent Nearby Requests, Elapsed Waiting Time</div>
            <div>• Ingestion: Verified Emergency Communication Network</div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mt-4 items-center">
        {/* Col 1: Active Incident Summary (4 cols) */}
        <div className="lg:col-span-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Selected Emergency
            </span>
            <span className="font-bold font-mono text-sm text-slate-900">
              {activeIncident.id}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Recommended Priority:</span>
            <PriorityBadge priority={activeIncident.aiRecommendedPriority} size="md" />
          </div>

          {activeIncident.isOverridden && (
            <div className="flex items-center justify-between text-xs text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200">
              <span className="font-semibold">Operator Override:</span>
              <span className="font-bold">{activeIncident.operationalPriority}</span>
            </div>
          )}

          <div className="flex items-center gap-1 text-[11px] text-slate-600 pt-1.5 border-t border-slate-200 truncate">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="truncate">{activeIncident.locationName}</span>
          </div>
        </div>

        {/* Col 2: Factors Considered (5 cols) */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Emergency Type
            </p>
            <div className="mt-1 flex items-center gap-1.5 font-bold text-slate-800">
              <CategoryBadge category={activeIncident.category} size="sm" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 truncate">
              {getCategoryLabel(activeIncident.category)}
            </p>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Flood Risk
            </p>
            <div className="mt-1 flex items-center gap-1.5">
              <RiskZoneBadge zone={activeIncident.riskZone} size="sm" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 truncate">
              {activeIncident.riskZone === 'Unknown' ? 'Awaiting GPS Fix' : `${activeIncident.riskZone} Flood Risk Zone`}
            </p>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Nearby Requests
            </p>
            <p className="mt-1 font-bold text-slate-800 text-xs">
              {activeIncident.nearbySosCount} active requests
            </p>
            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5">
              Within 500m area
            </span>
          </div>

          <div className="p-2.5 bg-white border border-slate-200 rounded-lg">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Waiting Time
            </p>
            <p className="mt-1 font-bold text-slate-800 text-xs flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>{factors?.requestAgeMinutes ?? 0} min elapsed</span>
            </p>
            <span className="text-[9px] text-slate-400 block leading-tight mt-0.5">
              Queue response time
            </span>
          </div>
        </div>

        {/* Col 3: Action Buttons (3 cols) */}
        <div className="lg:col-span-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => onOpenIncidentDetail(activeIncident)}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <span>Review Incident</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setOverrideModalIncident(activeIncident)}
            className="w-full py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
            <span>Override Priority</span>
          </button>
        </div>
      </div>

      {/* Advisory Footer */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
          <span>
            Human-in-the-loop triage: AI recommendations support emergency operators. Overrides require logged operational justification.
          </span>
        </div>
      </div>

      {/* Override Modal */}
      {overrideModalIncident && (
        <AiOverrideModal
          incident={overrideModalIncident}
          isOpen={Boolean(overrideModalIncident)}
          onClose={() => setOverrideModalIncident(null)}
        />
      )}
    </div>
  );
};
