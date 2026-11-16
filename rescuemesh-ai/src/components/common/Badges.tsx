import React from 'react';
import { PriorityLevel, EmergencyCategory, IncidentStatus, RiskZone } from '../../types';
import {
  getPriorityBadgeClasses,
  getStatusBadgeClasses,
  getCategoryBadgeClasses,
  getRiskZoneBadgeClasses
} from '../../utils/formatters';
import {
  HeartPulse,
  LifeBuoy,
  UtensilsCrossed,
  Home,
  AlertTriangle,
  Flame,
  CheckCircle2,
  Clock,
  Send,
  Radio
} from 'lucide-react';

export const PriorityBadge: React.FC<{
  priority: PriorityLevel;
  size?: 'sm' | 'md' | 'lg';
  showLabelPrefix?: boolean;
}> = ({ priority, size = 'md', showLabelPrefix = false }) => {
  const styles = getPriorityBadgeClasses(priority);
  const sizeClasses =
    size === 'sm'
      ? 'text-xs px-2 py-0.5'
      : size === 'lg'
      ? 'text-sm px-3 py-1.5 font-semibold'
      : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ring-1 ${styles.badge} ${sizeClasses} whitespace-nowrap shadow-xs`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
      {showLabelPrefix ? `AI Priority: ${priority.toUpperCase()}` : priority.toUpperCase()}
    </span>
  );
};

export const CategoryBadge: React.FC<{
  category: EmergencyCategory;
  size?: 'sm' | 'md';
  showIcon?: boolean;
}> = ({ category, size = 'md', showIcon = true }) => {
  const styles = getCategoryBadgeClasses(category);
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  const getIcon = () => {
    switch (category) {
      case 'Medical':
        return <HeartPulse className={`w-3.5 h-3.5 ${styles.iconColor}`} />;
      case 'Rescue':
        return <LifeBuoy className={`w-3.5 h-3.5 ${styles.iconColor}`} />;
      case 'Food & Water':
        return <UtensilsCrossed className={`w-3.5 h-3.5 ${styles.iconColor}`} />;
      case 'Shelter':
        return <Home className={`w-3.5 h-3.5 ${styles.iconColor}`} />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${styles.badge} ${sizeClasses} whitespace-nowrap`}
    >
      {showIcon && getIcon()}
      <span>{category}</span>
    </span>
  );
};

export const StatusBadge: React.FC<{
  status: IncidentStatus;
  size?: 'sm' | 'md';
}> = ({ status, size = 'md' }) => {
  const styles = getStatusBadgeClasses(status);
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';
  const displayStatus = status === 'In Progress' ? 'Responding' : status;

  const getStatusIcon = () => {
    switch (status) {
      case 'New':
        return <Radio className="w-3 h-3 text-blue-600 animate-pulse" />;
      case 'Acknowledged':
        return <Clock className="w-3 h-3 text-purple-600" />;
      case 'Assigned':
        return <Send className="w-3 h-3 text-indigo-600" />;
      case 'In Progress':
        return <Flame className="w-3 h-3 text-amber-600 animate-pulse" />;
      case 'Resolved':
        return <CheckCircle2 className="w-3 h-3 text-emerald-600" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${styles.badge} ${sizeClasses} whitespace-nowrap`}
    >
      {getStatusIcon()}
      <span>{displayStatus}</span>
    </span>
  );
};

export const RiskZoneBadge: React.FC<{
  zone: RiskZone;
  size?: 'sm' | 'md';
}> = ({ zone, size = 'md' }) => {
  const styles = getRiskZoneBadgeClasses(zone);
  const sizeClasses = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-xs px-2.5 py-1 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border ${styles.badge} ${sizeClasses} whitespace-nowrap`}
    >
      <AlertTriangle className={`w-3 h-3 ${zone === 'High' ? 'text-rose-600' : 'text-amber-600'}`} />
      <span>{zone}</span>
    </span>
  );
};
