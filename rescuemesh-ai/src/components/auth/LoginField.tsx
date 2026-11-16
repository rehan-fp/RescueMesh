import React from 'react';
import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { staggerItem } from './loginMotion';

interface LoginFieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  trailing?: React.ReactNode;
}

export const LoginField: React.FC<LoginFieldProps> = ({
  id,
  label,
  icon: Icon,
  error,
  trailing,
  className = '',
  ...inputProps
}) => (
  <motion.div variants={staggerItem} className="w-full">
    <label htmlFor={id} className="mb-1.5 block text-xs font-medium tracking-wide text-slate-300 sm:text-[13px]">
      {label}
    </label>
    <div className="group relative">
      <Icon
        aria-hidden="true"
        className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 transition-colors duration-200 sm:h-[18px] sm:w-[18px] ${
          error ? 'text-rose-400' : 'text-slate-400 group-focus-within:text-blue-400'
        }`}
      />
      <input
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
        className={`h-11 w-full rounded-xl border bg-[#081220] pl-10 text-sm text-slate-100 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)] transition-[border-color,box-shadow,background-color] duration-200 ease-out placeholder:text-slate-500 hover:border-slate-600/70 focus:bg-[#0B1729] focus:outline-none motion-reduce:transition-none sm:h-12 sm:pl-11 sm:text-[15px] ${
          trailing ? 'pr-11' : 'pr-4'
        } ${
          error
            ? 'border-rose-500/70 focus:border-rose-500 focus:ring-4 focus:ring-rose-500/15'
            : 'border-slate-700/60 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15'
        } ${className}`}
        {...inputProps}
      />
      {trailing && <div className="absolute inset-y-0 right-1 flex items-center">{trailing}</div>}
    </div>
    {error && (
      <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs font-medium text-rose-400">
        {error}
      </p>
    )}
  </motion.div>
);
