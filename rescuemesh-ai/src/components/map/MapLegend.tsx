import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface MapLegendProps {
  initialCollapsed?: boolean;
}

export const MapLegend: React.FC<MapLegendProps> = ({ initialCollapsed }) => {
  // Default to collapsed on smaller mobile/tablet screens (< 768px)
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (initialCollapsed !== undefined) return initialCollapsed;
    return typeof window !== 'undefined' && window.innerWidth < 768;
  });

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="bg-white/95 backdrop-blur-sm rounded-lg border border-slate-200 shadow-md text-xs select-none transition-all duration-150 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between gap-3 px-3 py-1.5 text-left hover:bg-slate-50 cursor-pointer"
        aria-expanded={!isCollapsed}
        aria-label="Toggle map priority legend"
      >
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
          Priority Legend
        </span>
        {isCollapsed ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {!isCollapsed && (
        <div className="p-3 pt-1 border-t border-slate-100 min-w-[190px]">
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#e11d48]" />
              <span className="text-[10px] font-medium text-slate-700">Critical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ea580c]" />
              <span className="text-[10px] font-medium text-slate-700">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]" />
              <span className="text-[10px] font-medium text-slate-700">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
              <span className="text-[10px] font-medium text-slate-700">Low</span>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 space-y-1.5 text-[10px] text-slate-600">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-xs bg-blue-600 inline-block" />
              <span className="font-medium">Response Team</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full border border-slate-300 bg-slate-100 text-slate-700 font-bold text-[9px] flex items-center justify-center">#</span>
              <span className="font-medium">Cluster (Count)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

