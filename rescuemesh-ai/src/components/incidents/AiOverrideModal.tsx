import React, { useState } from 'react';
import { Incident, PriorityLevel } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { PriorityBadge } from '../common/Badges';

interface AiOverrideModalProps {
  incident: Incident;
  isOpen: boolean;
  onClose: () => void;
}

export const AiOverrideModal: React.FC<AiOverrideModalProps> = ({
  incident,
  isOpen,
  onClose
}) => {
  const { overridePriority, currentUser } = useEmergency();
  const [newPriority, setNewPriority] = useState<PriorityLevel>(
    incident.operationalPriority === 'Critical' ? 'High' : 'Critical'
  );
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide an operational justification for the priority override.');
      return;
    }

    overridePriority(incident.id, newPriority, reason.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Adjust Operational Priority
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Incident ID:</span>
              <span className="font-bold font-mono text-slate-900">{incident.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Recommended Priority:</span>
              <PriorityBadge priority={incident.aiRecommendedPriority} size="sm" />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Current Priority:</span>
              <PriorityBadge priority={incident.operationalPriority} size="sm" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select New Operational Priority <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {(['Critical', 'High', 'Medium', 'Low'] as PriorityLevel[]).map((level) => (
                <button
                  type="button"
                  key={level}
                  onClick={() => setNewPriority(level)}
                  className={`py-1.5 px-2 text-xs font-bold rounded-lg border transition-all ${
                    newPriority === level
                      ? level === 'Critical'
                        ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500'
                        : level === 'High'
                        ? 'bg-orange-50 border-orange-500 text-orange-700 ring-1 ring-orange-500'
                        : level === 'Medium'
                        ? 'bg-amber-50 border-amber-500 text-amber-700 ring-1 ring-amber-500'
                        : 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-1 ring-emerald-500'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Operational Justification / Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Ground reports indicate victim has pre-existing critical condition, escalating to Critical."
              rows={3}
              className="w-full text-xs p-2.5 rounded-lg border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-900"
            />
            {error && <p className="text-[11px] text-red-600 mt-1 font-medium">{error}</p>}
          </div>

          <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-lg flex items-start gap-2 text-[11px] text-blue-800">
            <ShieldCheck className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
            <span>
              This override action will be permanently recorded in the incident audit trail under operator{' '}
              <strong>{currentUser?.name || 'Authorized Operator'}</strong>.
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-xs"
            >
              Confirm Override
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
