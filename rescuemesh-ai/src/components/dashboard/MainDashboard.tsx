import React, { useState } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { Incident } from '../../types';
import { KPICard } from './KPICard';
import { LeafletGisMap } from '../map/LeafletGisMap';
import { LiveSosFeed } from './LiveSosFeed';
import { QuickStats } from './QuickStats';
import { AiDecisionSupportPanel } from './AiDecisionSupportPanel';
import { IncidentDetailModal } from '../incidents/IncidentDetailModal';
import { AssignTeamModal } from '../incidents/AssignTeamModal';
import {
  Radio,
  Wifi,
  Server,
  Database,
  Clock
} from 'lucide-react';

export const MainDashboard: React.FC = () => {
  const {
    incidents,
    rescueTeams,
    selectedIncident,
    setSelectedIncident,
    lastSyncTime,
    systemHealth,
    filters,
    setFilters
  } = useEmergency();

  const statusLabel = (value?: string) => {
    if (!value) return 'STANDBY';
    if (value === 'online' || value === 'connected') return 'CONNECTED';
    if (value === 'standby') return 'STANDBY';
    return value.toUpperCase();
  };

  const statusColor = (value?: string) => {
    if (value === 'online' || value === 'connected') return 'bg-emerald-500';
    if (value === 'standby') return 'bg-amber-400';
    return 'bg-rose-500';
  };

  const [assignModalIncident, setAssignModalIncident] = useState<Incident | null>(null);

  // Dynamic KPI Calculations from real database
  const activeIncidents = incidents.filter((i) => i.status !== 'Resolved');
  const criticalCount = incidents.filter(
    (i) => i.status !== 'Resolved' && i.operationalPriority === 'Critical'
  ).length;
  const deployedTeamsCount = rescueTeams.filter(
    (t) => t.status === 'Assigned' || t.status === 'In Progress'
  ).length;
  const availableTeamsCount = rescueTeams.filter((t) => t.status === 'Available').length;
  const awaitingAssignmentCount = incidents.filter(
    (i) => i.status === 'New' || (i.status === 'Acknowledged' && !i.assignedTeamId)
  ).length;
  const resolvedCount = incidents.filter((i) => i.status === 'Resolved').length;

  return (
    <div className="space-y-6">
      {/* 5 Consistent Operational KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          label="Active Incidents"
          value={activeIncidents.length < 10 ? `0${activeIncidents.length}` : activeIncidents.length}
          badgeText={`${activeIncidents.length} In Queue`}
          variant="info"
          onClick={() => setFilters((prev) => ({ ...prev, status: 'All' }))}
        />

        <KPICard
          label="Critical Priority"
          value={criticalCount < 10 ? `0${criticalCount}` : criticalCount}
          badgeText={criticalCount > 0 ? "Immediate Action" : "None Critical"}
          variant="critical"
          onClick={() => setFilters((prev) => ({ ...prev, priority: 'Critical' }))}
          isActive={filters.priority === 'Critical'}
        />

        <KPICard
          label="Teams Deployed"
          value={deployedTeamsCount < 10 ? `0${deployedTeamsCount}` : deployedTeamsCount}
          badgeText={`${availableTeamsCount} Available`}
          variant="default"
        />

        <KPICard
          label="Awaiting Assignment"
          value={awaitingAssignmentCount < 10 ? `0${awaitingAssignmentCount}` : awaitingAssignmentCount}
          badgeText={awaitingAssignmentCount > 0 ? "Dispatch Required" : "All Dispatched"}
          variant="warning"
          onClick={() => setFilters((prev) => ({ ...prev, status: 'New' }))}
          isActive={filters.status === 'New'}
        />

        <KPICard
          label="Resolved Incidents"
          value={resolvedCount < 10 ? `0${resolvedCount}` : resolvedCount}
          badgeText="Verified Total"
          variant="success"
          onClick={() => setFilters((prev) => ({ ...prev, status: 'Resolved' }))}
          isActive={filters.status === 'Resolved'}
        />
      </div>

      {/* Main Command Workspace: 70% Live Emergency Map / 30% Active Incidents Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* 70% Column: Live Emergency Map */}
        <div className="lg:col-span-8 w-full">
          <LeafletGisMap
            heightClass="h-[530px]"
            onOpenAssignModal={(inc) => setAssignModalIncident(inc)}
          />
        </div>

        {/* 30% Column: Active Incidents Queue */}
        <div className="lg:col-span-4 w-full">
          <LiveSosFeed onOpenAssignModal={(inc) => setAssignModalIncident(inc)} />
        </div>
      </div>

      {/* AI Decision Support Panel */}
      <AiDecisionSupportPanel
        onOpenIncidentDetail={(inc) => setSelectedIncident(inc)}
      />

      {/* Operational System Infrastructure Strip */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-4 text-xs">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 items-center">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${statusColor(systemHealth?.gateway)}`} />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Communication Gateway
              </span>
              <span className="font-bold text-slate-900">{statusLabel(systemHealth?.gateway)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
            <Radio className="w-4 h-4 text-blue-600" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Emergency Network
              </span>
              <span className="font-bold text-slate-900">ONLINE</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
            <Clock className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Last Contact
              </span>
              <span className="font-bold text-slate-900">
                {systemHealth?.last_packet_at
                  ? new Date(systemHealth.last_packet_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : lastSyncTime || 'Active'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
            <Server className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                System Status
              </span>
              <span className="font-bold text-slate-900">OPERATIONAL</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
            <Wifi className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Priority Assessment
              </span>
              <span className="font-bold text-slate-900">ACTIVE</span>
            </div>
          </div>

          <div className="flex items-center gap-2 border-l border-slate-100 pl-4">
            <Database className="w-4 h-4 text-emerald-600" />
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Incident Records
              </span>
              <span className="font-bold text-slate-900">SYNCED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics & Fleet Summary */}
      <QuickStats />

      {/* Global Modals */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={Boolean(selectedIncident)}
        onClose={() => setSelectedIncident(null)}
      />

      {assignModalIncident && (
        <AssignTeamModal
          incident={assignModalIncident}
          isOpen={Boolean(assignModalIncident)}
          onClose={() => setAssignModalIncident(null)}
        />
      )}
    </div>
  );
};
