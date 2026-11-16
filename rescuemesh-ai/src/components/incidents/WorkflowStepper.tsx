import React from 'react';
import { IncidentStatus } from '../../types';
import { Check, Clock, AlertOctagon, Users2, Play, CheckCircle2 } from 'lucide-react';

interface WorkflowStepperProps {
  currentStatus: IncidentStatus;
  timeline: Array<{ status: IncidentStatus; timestamp: string; operator: string; note?: string }>;
  onStatusChange?: (newStatus: IncidentStatus) => void;
  disabled?: boolean;
}

const STEPS: { status: IncidentStatus; label: string; icon: React.FC<{ className?: string }> }[] = [
  { status: 'New', label: 'New', icon: AlertOctagon },
  { status: 'Acknowledged', label: 'Acknowledged', icon: Clock },
  { status: 'Assigned', label: 'Assigned', icon: Users2 },
  { status: 'In Progress', label: 'Responding', icon: Play },
  { status: 'Resolved', label: 'Resolved', icon: CheckCircle2 }
];

export const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  currentStatus,
  timeline,
  onStatusChange,
  disabled = false
}) => {
  const getStepIndex = (status: IncidentStatus) => {
    switch (status) {
      case 'New':
        return 0;
      case 'Acknowledged':
        return 1;
      case 'Assigned':
        return 2;
      case 'In Progress':
        return 3;
      case 'Resolved':
        return 4;
    }
  };

  const currentIndex = getStepIndex(currentStatus);

  const getStepTimestamp = (status: IncidentStatus) => {
    const entry = timeline.find((t) => t.status === status);
    return entry ? `${entry.timestamp} (${entry.operator})` : null;
  };

  return (
    <div className="w-full select-none py-2">
      <div className="flex items-center justify-between relative">
        {/* Horizontal connecting background line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-slate-200 -z-0" />
        <div
          className="absolute top-4 left-6 h-0.5 bg-blue-600 transition-all duration-300 -z-0"
          style={{ width: `${(currentIndex / (STEPS.length - 1)) * 90}%` }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentIndex;
          const isCurrent = idx === currentIndex;
          const isPending = idx > currentIndex;
          const StepIcon = step.icon;
          const stepMeta = getStepTimestamp(step.status);

          return (
            <div key={step.status} className="flex flex-col items-center relative z-10">
              <button
                disabled={disabled || (!isCurrent && idx > currentIndex + 1)}
                onClick={() => onStatusChange && onStatusChange(step.status)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                  isCompleted
                    ? 'bg-blue-600 text-white ring-4 ring-blue-50'
                    : isCurrent
                    ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                    : 'bg-white border-2 border-slate-300 text-slate-400'
                } ${!disabled && idx === currentIndex + 1 ? 'hover:border-blue-500 cursor-pointer' : ''}`}
                title={`Status: ${step.label}`}
              >
                {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-3.5 h-3.5" />}
              </button>

              <div className="mt-2 text-center">
                <span
                  className={`text-[11px] font-bold block leading-tight ${
                    isCurrent
                      ? 'text-blue-700'
                      : isCompleted
                      ? 'text-slate-800'
                      : 'text-slate-400 font-medium'
                  }`}
                >
                  {step.label}
                </span>
                {stepMeta && (
                  <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                    {stepMeta.split(' ')[0]}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
