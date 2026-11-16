import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  label: string;
  value: number | string;
  icon?: LucideIcon;
  subtext?: string;
  badgeText?: string;
  variant?: 'default' | 'critical' | 'warning' | 'success' | 'info';
  onClick?: () => void;
  isActive?: boolean;
}

export const KPICard: React.FC<KPICardProps> = ({
  label,
  value,
  subtext,
  badgeText,
  variant = 'default',
  onClick,
  isActive = false
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'critical':
        return {
          card: 'bg-white p-4 rounded-xl border-l-4 border-l-red-500 border border-slate-200 shadow-sm hover:shadow-md transition-shadow',
          valueColor: 'text-2xl font-bold text-red-600',
          badge: 'text-red-600 text-[10px] font-bold px-2 py-0.5 bg-red-50 rounded-full'
        };
      case 'warning':
        return {
          card: 'bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow',
          valueColor: 'text-2xl font-bold text-amber-600',
          badge: 'text-amber-600 text-[10px] font-bold px-2 py-0.5 bg-amber-50 rounded-full'
        };
      case 'success':
        return {
          card: 'bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow',
          valueColor: 'text-2xl font-bold text-green-600',
          badge: 'text-green-600 text-[10px] font-bold px-2 py-0.5 bg-green-50 rounded-full'
        };
      case 'info':
        return {
          card: 'bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow',
          valueColor: 'text-2xl font-bold text-slate-900',
          badge: 'text-blue-600 text-[10px] font-bold px-2 py-0.5 bg-blue-50 rounded-full'
        };
      default:
        return {
          card: 'bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow',
          valueColor: 'text-2xl font-bold text-slate-900',
          badge: 'text-slate-500 text-[10px] font-medium'
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      onClick={onClick}
      className={`${styles.card} ${onClick ? 'cursor-pointer' : ''} ${
        isActive ? 'ring-2 ring-blue-500' : ''
      }`}
    >
      <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between mt-1">
        <span className={styles.valueColor}>{value}</span>
        {variant === 'warning' && !badgeText ? (
          <div className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse mb-1.5" />
        ) : (
          (badgeText || subtext) && (
            <span className={styles.badge}>{badgeText || subtext}</span>
          )
        )}
      </div>
    </div>
  );
};
