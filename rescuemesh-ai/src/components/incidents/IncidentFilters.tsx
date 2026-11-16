import React from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { PriorityLevel, EmergencyCategory, IncidentStatus, RiskZone } from '../../types';
import {
  Search,
  Filter,
  RotateCcw,
  Download,
  AlertCircle,
  SlidersHorizontal,
  ChevronDown
} from 'lucide-react';

interface IncidentFiltersProps {
  onExportCsv?: () => void;
  compact?: boolean;
}

export const IncidentFilters: React.FC<IncidentFiltersProps> = ({
  onExportCsv,
  compact = false
}) => {
  const { filters, setFilters, resetFilters, rescueTeams } = useEmergency();

  const isFilterActive =
    filters.searchQuery !== '' ||
    filters.priority !== 'All' ||
    filters.category !== 'All' ||
    filters.riskZone !== 'All' ||
    filters.status !== 'All' ||
    filters.assignedTeam !== 'All' ||
    filters.timeRange !== 'all';

  return (
    <div className="bg-white rounded-xl border border-slate-200/90 p-3 sm:p-4 shadow-xs">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
            placeholder="Search by incident ID or location..."
            className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
          {filters.searchQuery && (
            <button
              onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 font-bold"
            >
              ×
            </button>
          )}
        </div>

        {/* Filter Dropdowns */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Priority */}
          <div className="relative">
            <select
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value }))}
              className={`text-xs font-medium py-1.5 pl-3 pr-7 bg-white border rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                filters.priority !== 'All'
                  ? 'border-blue-500 bg-blue-50/40 text-blue-800 font-semibold'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Priority: All</option>
              <option value="Critical">Critical</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Emergency Type */}
          <div className="relative">
            <select
              value={filters.category}
              onChange={(e) => setFilters((prev) => ({ ...prev, category: e.target.value }))}
              className={`text-xs font-medium py-1.5 pl-3 pr-7 bg-white border rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                filters.category !== 'All'
                  ? 'border-blue-500 bg-blue-50/40 text-blue-800 font-semibold'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Emergency Type: All</option>
              <option value="Medical">Medical</option>
              <option value="Rescue">Rescue</option>
              <option value="Food & Water">Food & Water</option>
              <option value="Shelter">Shelter</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Flood Risk */}
          <div className="relative">
            <select
              value={filters.riskZone}
              onChange={(e) => setFilters((prev) => ({ ...prev, riskZone: e.target.value }))}
              className={`text-xs font-medium py-1.5 pl-3 pr-7 bg-white border rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                filters.riskZone !== 'All'
                  ? 'border-blue-500 bg-blue-50/40 text-blue-800 font-semibold'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Flood Risk: All</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
              <option value="Unknown">Unknown (No GPS)</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Status */}
          <div className="relative">
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
              className={`text-xs font-medium py-1.5 pl-3 pr-7 bg-white border rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 ${
                filters.status !== 'All'
                  ? 'border-blue-500 bg-blue-50/40 text-blue-800 font-semibold'
                  : 'border-slate-200 text-slate-700'
              }`}
            >
              <option value="All">Status: All</option>
              <option value="New">New</option>
              <option value="Acknowledged">Acknowledged</option>
              <option value="Assigned">Assigned</option>
              <option value="In Progress">Responding</option>
              <option value="Resolved">Resolved</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Reset Filters */}
          {isFilterActive && (
            <button
              onClick={resetFilters}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              title="Clear all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear</span>
            </button>
          )}

          {/* Export CSV button if requested */}
          {onExportCsv && (
            <button
              onClick={onExportCsv}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
