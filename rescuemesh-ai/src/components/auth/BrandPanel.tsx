import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BrainCircuit, MapPin, Radio } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { EASE_OUT } from './loginMotion';
import { RescueMeshLogo } from '../common/RescueMeshLogo';

interface CapabilityItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const CAPABILITIES: CapabilityItem[] = [
  {
    icon: Radio,
    title: 'Real-Time Emergency Monitoring',
    description: 'Instant capture and rapid verification of emergency distress requests',
  },
  {
    icon: MapPin,
    title: 'Location-Based Response',
    description: 'Precise geographic positioning and coordinated rescue dispatch',
  },
  {
    icon: BrainCircuit,
    title: 'AI-Assisted Prioritization',
    description: 'Intelligent triage evaluating urgency, density, and local hazard level',
  },
];

const NETWORK_NODES: [number, number][] = [
  [190, 210],
  [420, 180],
  [470, 360],
  [240, 440],
  [370, 480],
  [120, 330],
];

const NetworkVisual: React.FC = () => {
  const reduceMotion = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="login-fade-mask pointer-events-none absolute -left-28 -top-36 hidden h-[580px] w-[580px] text-slate-400 opacity-60 lg:block xl:-left-20"
    >
      <svg viewBox="0 0 600 600" className="h-full w-full" fill="none">
        {[90, 160, 230, 300].map((r) => (
          <circle key={r} cx="300" cy="300" r={r} stroke="currentColor" strokeOpacity="0.06" />
        ))}
        <path d="M0 300H600M300 0V600" stroke="currentColor" strokeOpacity="0.04" />
        {NETWORK_NODES.map(([x, y]) => (
          <g key={`${x}-${y}`}>
            <line x1="300" y1="300" x2={x} y2={y} stroke="#3B82F6" strokeOpacity="0.15" strokeDasharray="3 6" />
            <circle cx={x} cy={y} r="2.5" fill="#60A5FA" fillOpacity="0.35" />
          </g>
        ))}
        <circle cx="300" cy="300" r="4" fill="#3B82F6" fillOpacity="0.5" />
        {!reduceMotion && (
          <motion.circle
            cx="300"
            cy="300"
            stroke="#60A5FA"
            initial={{ r: 20, strokeOpacity: 0.25 }}
            animate={{ r: 280, strokeOpacity: 0 }}
            transition={{ duration: 8, ease: 'easeOut', repeat: Infinity, repeatDelay: 2 }}
          />
        )}
        <g className="font-mono" fill="currentColor" fillOpacity="0.25" fontSize="10">
          <text x="308" y="76">06°55′N</text>
          <text x="512" y="292">79°51′E</text>
        </g>
      </svg>
    </div>
  );
};

export const BrandPanel: React.FC<{ className?: string }> = ({ className = '' }) => (
  <motion.section
    aria-labelledby="brand-title"
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.55, ease: EASE_OUT }}
    className={`relative ${className}`}
  >
    <NetworkVisual />

    <div className="relative">
      <div className="flex items-center gap-4">
        <RescueMeshLogo size="xl" showText={false} />
        <div>
          <h1
            id="brand-title"
            className="text-2xl font-bold tracking-tight text-white sm:text-3xl xl:text-[2rem]"
          >
            RescueMesh AI
          </h1>
          <p className="mt-0.5 text-xs font-semibold tracking-wider text-blue-400 sm:text-[13px]">
            Flood Emergency Response &amp; Coordination
          </p>
        </div>
      </div>

      <p className="mt-6 max-w-lg text-balance text-sm leading-relaxed text-slate-300 sm:text-[15px]">
        &ldquo;Connecting emergency requests with response teams when communication matters most.&rdquo;
      </p>

      {/* 3 Simple Capability Indicators */}
      <div className="mt-8 space-y-3 sm:max-w-lg">
        {CAPABILITIES.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="flex items-start gap-3.5 rounded-xl border border-slate-700/40 bg-[#0B1526]/60 p-3.5 transition-colors duration-200 hover:border-slate-600/60 hover:bg-[#0B1526]/80 sm:p-4"
          >
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-500/10 text-blue-400 ring-1 ring-blue-400/20">
              <Icon aria-hidden="true" className="h-[18px] w-[18px]" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
              <p className="mt-0.5 text-xs text-slate-400 leading-normal">{description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </motion.section>
);
