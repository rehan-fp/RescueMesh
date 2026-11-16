import React from 'react';

interface RescueMeshLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  textColor?: 'light' | 'dark';
  className?: string;
}

export const RescueMeshLogo: React.FC<RescueMeshLogoProps> = ({
  size = 'md',
  showText = false,
  textColor = 'dark',
  className = ''
}) => {
  const pixelSizes = {
    xs: 20,
    sm: 28,
    md: 36,
    lg: 48,
    xl: 60
  };

  const dim = pixelSizes[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* SVG Logomark */}
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 drop-shadow-xs"
        aria-label="RescueMesh AI Logo"
      >
        <defs>
          <linearGradient id="rm-gradient-shield" x1="8" y1="4" x2="56" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="60%" stopColor="#0F172A" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>

          <linearGradient id="rm-gradient-accent" x1="16" y1="12" x2="48" y2="52" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#2563EB" />
            <stop offset="100%" stopColor="#1D4ED8" />
          </linearGradient>

          <linearGradient id="rm-pulse-gradient" x1="24" y1="20" x2="40" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#E11D48" />
          </linearGradient>
        </defs>

        {/* Shield Outer Silhouette - Resilience */}
        <path
          d="M32 4L54 12V28C54 42.5 44.5 54.5 32 60C19.5 54.5 10 42.5 10 28V12L32 4Z"
          fill="url(#rm-gradient-shield)"
          stroke="#3B82F6"
          strokeWidth="1.5"
          strokeOpacity="0.4"
        />

        {/* Outer Wireless Mesh Arcs - Communication */}
        <path
          d="M19 23C22.5 19.5 27 17.5 32 17.5C37 17.5 41.5 19.5 45 23"
          stroke="#38BDF8"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.75"
        />

        <path
          d="M23.5 28C25.8 25.8 28.8 24.5 32 24.5C35.2 24.5 38.2 25.8 40.5 28"
          stroke="#60A5FA"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />

        {/* Emergency Location Pin & Central Symbol */}
        <path
          d="M32 30C28.5 30 25.7 32.8 25.7 36.3C25.7 41.2 32 49 32 49C32 49 38.3 41.2 38.3 36.3C38.3 32.8 35.5 30 32 30Z"
          fill="url(#rm-gradient-accent)"
        />

        {/* Heartbeat Emergency Center Dot */}
        <circle cx="32" cy="36" r="3" fill="#FFFFFF" />

        {/* Mesh Interconnect Points */}
        <circle cx="19" cy="23" r="2" fill="#38BDF8" />
        <circle cx="45" cy="23" r="2" fill="#38BDF8" />
        <circle cx="32" cy="17.5" r="2" fill="#38BDF8" />
      </svg>

      {/* Brand Text */}
      {showText && (
        <div className="leading-tight">
          <div className="flex items-center">
            <span
              className={`font-bold tracking-tight ${
                size === 'lg' || size === 'xl' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm'
              } ${textColor === 'light' ? 'text-white' : 'text-slate-900'}`}
            >
              RescueMesh <span className="text-blue-500 font-extrabold">AI</span>
            </span>
          </div>
          <span
            className={`block text-[10px] uppercase tracking-widest font-semibold ${
              textColor === 'light' ? 'text-slate-400' : 'text-slate-500'
            }`}
          >
            Emergency Response
          </span>
        </div>
      )}
    </div>
  );
};
