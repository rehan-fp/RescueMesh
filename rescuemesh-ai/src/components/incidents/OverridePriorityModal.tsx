import React, { useState } from 'react';
import { Incident, PriorityLevel } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { PriorityBadge } from '../common/Badges';
import {
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  X,
  CheckCircle2,
  HelpCircle,
  ArrowRight
} from 'lucide-react';

interface OverridePriorityModalProps {
  incident: Incident;
  isOpen: boolean;
  onClose: () => void;
}

export const OverridePriorityModal: React.FC<OverridePriorityModalProps> = ({
  incident,
  isOpen,
  onClose
}) => {
  const { overridePriority, currentUser } = useEmergency();

  const [selectedPriority, setSelectedPriority] = useState<PriorityLevel>(
    incident.operationalPriority
  );
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a specific operational justification for overriding the AI priority.');
      return;
    }
    if (reason.trim().length < 8) {
      setError('Justification is too brief. Please enter at least 8 characters.');
      return;
    }

    overridePriority(incident.id, selectedPriority, reason.trim());
    onClose();
  };

  const priorityOptions: { level: PriorityLevel; desc: string }[] = [
    { level: 'Critical', desc: 'Imminent life danger, active rooftop submersion, severe trauma' },
    { level: 'High', desc: 'Rapid water accumulation, trapped seniors/children, time-sensitive' },
    { level: 'Medium', desc: 'Essential water/food exhaustion, isolated but secure elevation' },
    { level: 'Low', desc: 'General shelter/supplies, non-urgent staging request' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-100">
      <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Operator Priority Override</h3>
              <p className="text-xs text-slate-300">Incident {incident.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* AI Decision Support Disclaimer Notice */}
          <div className="p-3 rounded-lg bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Human-in-the-Loop Priority Recommendation</p>
              <p className="text-blue-800 mt-0.5 text-[11px] leading-relaxed">
                The automated priority recommendation assists operators based on emergency type, flood risk, and waiting duration. Authorized operators hold final command authority to adjust priority.
              </p>
            </div>
          </div>

          {/* Current AI vs New Selection */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                AI Recommended Priority
              </span>
              <PriorityBadge priority={incident.aiRecommendedPriority} size="md" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block mb-1">
                New Operational Priority
              </span>
              <PriorityBadge priority={selectedPriority} size="md" />
            </div>
          </div>

          {/* Priority Radios */}
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-1.5">
              Select New Operational Priority Level
            </label>
            <div className="space-y-2">
              {priorityOptions.map((opt) => (
                <label
                  key={opt.level}
                  className={`flex items-start gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    selectedPriority === opt.level
                      ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="overridePriority"
                    value={opt.level}
                    checked={selectedPriority === opt.level}
                    onChange={() => setSelectedPriority(opt.level)}
                    className="mt-1 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{opt.level}</span>
                      <PriorityBadge priority={opt.level} size="sm" />
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Required Justification Field */}
          <div>
            <label className="text-xs font-bold text-slate-900 block mb-1">
              Operational Override Justification <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              rows={3}
              placeholder="e.g. Verified by direct voice report from field team: victim has severe chronic condition requiring immediate ICU transport."
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 placeholder:text-slate-400"
            />
            {error && <p className="text-xs text-rose-600 font-medium mt-1">{error}</p>}
            <p className="text-[10px] text-slate-500 mt-1">
              Operator: <span className="font-semibold">{currentUser?.name}</span> (ID:{' '}
              {currentUser?.badgeNumber}) • Override will be recorded in the incident audit trail.
            </p>
          </div>

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirm Priority Override</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
