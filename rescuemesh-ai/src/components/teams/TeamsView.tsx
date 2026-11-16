import React, { useState, useMemo } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { RescueTeam, Incident } from '../../types';
import {
  Users2,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Activity,
  AlertCircle,
  MapPin,
  Phone,
  User,
  Shield,
  ExternalLink,
  Edit2,
  X,
  Trash2,
  Check,
  AlertTriangle,
  History,
  Info
} from 'lucide-react';
import { CategoryBadge, PriorityBadge } from '../common/Badges';
import { formatExactDateTime, formatRelativeTime } from '../../utils/dateTime';

const CAPABILITY_OPTIONS = [
  'Rescue',
  'Medical',
  'Food & Water',
  'Shelter',
  'Multi-Purpose'
];

const SRI_LANKA_BASES = [
  'Colombo',
  'Gampaha',
  'Kalutara',
  'Kelaniya',
  'Kaduwela',
  'Malabe',
  'Negombo',
  'Ratnapura',
  'Kandy',
  'Galle'
];

export const TeamsView: React.FC = () => {
  const {
    rescueTeams,
    incidents,
    currentUser,
    setSelectedIncident,
    setFocusedIncidentId,
    createTeam,
    updateTeam,
    deleteTeam
  } = useEmergency();

  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<RescueTeam | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  // Add Team Form state
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('Rescue');
  const [newBase, setNewBase] = useState('Colombo');
  const [newLead, setNewLead] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newStatus, setNewStatus] = useState('Available');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Team state
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState('Rescue');
  const [editBase, setEditBase] = useState('Colombo');
  const [editLead, setEditLead] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editStatus, setEditStatus] = useState('Available');
  const [actionError, setActionError] = useState<string | null>(null);

  // Role permissions
  const canManageTeams =
    currentUser?.role === 'Administrator' ||
    currentUser?.role === 'Response Coordinator' ||
    currentUser?.role === 'Rescue Coordinator';
  const isAdmin = currentUser?.role === 'Administrator';

  // Metrics from real records
  const totalTeams = rescueTeams.length;
  const availableCount = rescueTeams.filter((t) => t.status === 'Available').length;
  const respondingCount = rescueTeams.filter(
    (t) => t.status === 'In Progress' || t.status === 'Assigned'
  ).length;
  const unavailableCount = rescueTeams.filter(
    (t) => t.status === 'Unavailable' || t.status === 'Offline'
  ).length;

  // Specific counts for filter tabs
  const assignedCount = rescueTeams.filter((t) => t.status === 'Assigned').length;
  const inProgressCount = rescueTeams.filter((t) => t.status === 'In Progress').length;

  // Filtered list
  const filteredTeams = useMemo(() => {
    return rescueTeams.filter((team) => {
      // Status filter
      if (statusFilter === 'Available' && team.status !== 'Available') return false;
      if (statusFilter === 'Assigned' && team.status !== 'Assigned') return false;
      if (statusFilter === 'Responding' && team.status !== 'In Progress') return false;
      if (
        statusFilter === 'Unavailable' &&
        team.status !== 'Unavailable' &&
        team.status !== 'Offline'
      ) {
        return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = team.name.toLowerCase().includes(q);
        const matchesType = team.type.toLowerCase().includes(q);
        const matchesBase = (team.baseLocation || '').toLowerCase().includes(q);
        const matchesLead = (team.teamLead || '').toLowerCase().includes(q);
        const matchesPhone = (team.contactPhone || '').toLowerCase().includes(q);
        const matchesIncident = (team.currentIncidentCode || team.currentIncidentId || '')
          .toLowerCase()
          .includes(q);
        return (
          matchesName ||
          matchesType ||
          matchesBase ||
          matchesLead ||
          matchesPhone ||
          matchesIncident
        );
      }
      return true;
    });
  }, [rescueTeams, statusFilter, searchQuery]);

  // Open Add Modal
  const handleOpenAddModal = () => {
    setNewName('');
    setNewType('Rescue');
    setNewBase('Colombo');
    setNewLead('');
    setNewPhone('');
    setNewStatus('Available');
    setFormError(null);
    setIsAddModalOpen(true);
  };

  // Submit Add Team
  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError('Please provide a response team name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await createTeam({
        name: newName.trim(),
        type: newType,
        baseLocation: newBase,
        teamLead: newLead.trim(),
        contactPhone: newPhone.trim(),
        status: newStatus
      });
      setIsAddModalOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Unable to create response team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open Details Modal
  const handleOpenTeamDetails = (team: RescueTeam) => {
    setSelectedTeam(team);
    setIsEditMode(false);
    setEditName(team.name);
    setEditType(team.type);
    setEditBase(team.baseLocation || 'Colombo');
    setEditLead(team.teamLead || '');
    setEditPhone(team.contactPhone || '');
    setEditStatus(team.status === 'In Progress' ? 'In Progress' : team.status);
    setActionError(null);
  };

  // Save Edit Team
  const handleSaveEditTeam = async () => {
    if (!selectedTeam) return;
    if (!editName.trim()) {
      setActionError('Team name cannot be empty.');
      return;
    }

    try {
      setIsSubmitting(true);
      setActionError(null);
      const updated = await updateTeam(selectedTeam.id, {
        name: editName.trim(),
        type: editType,
        baseLocation: editBase,
        teamLead: editLead.trim(),
        contactPhone: editPhone.trim(),
        status: editStatus
      });
      setSelectedTeam(updated);
      setIsEditMode(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update response team.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Quick Toggle Availability
  const handleToggleAvailability = async (team: RescueTeam) => {
    const nextStatus = team.status === 'Available' ? 'Unavailable' : 'Available';
    try {
      setActionError(null);
      const updated = await updateTeam(team.id, { status: nextStatus });
      if (selectedTeam && selectedTeam.id === team.id) {
        setSelectedTeam(updated);
        setEditStatus(updated.status);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to update team availability.');
    }
  };

  // Deactivate Team
  const handleDeactivateTeam = async (team: RescueTeam) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate or remove response team "${team.name}"?`
    );
    if (!confirmed) return;

    try {
      setActionError(null);
      await deleteTeam(team.id);
      setSelectedTeam(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to deactivate team.');
    }
  };

  // Open linked incident
  const handleOpenIncident = (incidentId: string) => {
    const inc = incidents.find((i) => i.id === incidentId);
    if (inc) {
      setFocusedIncidentId(inc.id);
      setSelectedIncident(inc);
    }
  };

  // Helper for Status Badge styling
  const renderStatusBadge = (status: string) => {
    if (status === 'Available') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          Available
        </span>
      );
    }
    if (status === 'Assigned') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <Clock className="w-3 h-3 text-blue-600" />
          Assigned
        </span>
      );
    }
    if (status === 'In Progress' || status === 'Responding') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Responding
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        Unavailable
      </span>
    );
  };

  // Helper for Capability Badge
  const renderCapabilityBadge = (type: string) => {
    let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
    if (type.includes('Rescue')) {
      colorClasses = 'bg-red-50 text-red-800 border-red-200';
    } else if (type.includes('Medical')) {
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    } else if (type.includes('Food') || type.includes('Water')) {
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
    } else if (type.includes('Shelter')) {
      colorClasses = 'bg-purple-50 text-purple-800 border-purple-200';
    } else if (type.includes('Multi')) {
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
    }

    return (
      <span
        className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${colorClasses}`}
      >
        {type}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Response Teams</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">
            Manage emergency response teams, availability and assignments.
          </p>
        </div>

        {canManageTeams && (
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Response Team</span>
          </button>
        )}
      </div>

      {/* 2. Operational Summary KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL TEAMS
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono mt-1 block">
            {totalTeams}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">Registered response teams</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            AVAILABLE
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-emerald-700 font-mono mt-1 block">
            {availableCount}
          </span>
          <span className="text-xs text-emerald-600 mt-1 block">Ready for assignment</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-blue-200 shadow-xs">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
            RESPONDING
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-blue-700 font-mono mt-1 block">
            {respondingCount}
          </span>
          <span className="text-xs text-blue-600 mt-1 block">Currently handling an emergency</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            UNAVAILABLE
          </span>
          <span className="text-2xl sm:text-3xl font-extrabold text-slate-700 font-mono mt-1 block">
            {unavailableCount}
          </span>
          <span className="text-xs text-slate-500 mt-1 block">Not currently available</span>
        </div>
      </div>

      {/* 3. Search and Status Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search response teams..."
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
          {[
            { id: 'All', label: 'All', count: totalTeams },
            { id: 'Available', label: 'Available', count: availableCount },
            { id: 'Assigned', label: 'Assigned', count: assignedCount },
            { id: 'Responding', label: 'Responding', count: inProgressCount },
            { id: 'Unavailable', label: 'Unavailable', count: unavailableCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  statusFilter === tab.id
                    ? 'bg-slate-100 text-slate-700'
                    : 'bg-slate-200/70 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. Team List / Empty State */}
      {totalTeams === 0 ? (
        /* Zero registered teams empty state */
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-3">
            <Users2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-900">No response teams registered</h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Add response teams to begin assigning them to emergencies.
          </p>
          {canManageTeams && (
            <button
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Response Team</span>
            </button>
          )}
        </div>
      ) : filteredTeams.length === 0 ? (
        /* Filter returns nothing empty state */
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mx-auto mb-3">
            <Info className="w-6 h-6" />
          </div>
          {statusFilter === 'Assigned' || statusFilter === 'Responding' ? (
            <>
              <h3 className="text-base font-bold text-slate-900">
                No teams are currently assigned to an emergency.
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                All available response teams are currently standing by ready for assignment.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-base font-bold text-slate-900">
                No response teams match this filter.
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                Try selecting a different status filter or clearing your search query.
              </p>
              <button
                onClick={() => {
                  setStatusFilter('All');
                  setSearchQuery('');
                }}
                className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </>
          )}
        </div>
      ) : (
        /* Teams Table (Desktop) & Cards (Mobile) */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">TEAM</th>
                  <th className="py-3 px-4">CAPABILITY</th>
                  <th className="py-3 px-4">STATUS</th>
                  <th className="py-3 px-4">BASE LOCATION</th>
                  <th className="py-3 px-4">CURRENT ASSIGNMENT</th>
                  <th className="py-3 px-4">CONTACT</th>
                  <th className="py-3 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTeams.map((team) => {
                  const activeIncident = team.currentIncidentId
                    ? incidents.find((i) => i.id === team.currentIncidentId)
                    : null;
                  const incidentCode =
                    team.currentIncidentCode || team.currentIncidentId;

                  return (
                    <tr
                      key={team.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      {/* Team Name & ID */}
                      <td className="py-3.5 px-4">
                        <div>
                          <p className="font-bold text-slate-900 text-sm">{team.name}</p>
                          <span className="font-mono text-[10px] text-slate-400">
                            {team.id}
                          </span>
                        </div>
                      </td>

                      {/* Capability */}
                      <td className="py-3.5 px-4">
                        {renderCapabilityBadge(team.type)}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {renderStatusBadge(team.status)}
                      </td>

                      {/* Base Location */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{team.baseLocation || 'Not provided'}</span>
                        </div>
                      </td>

                      {/* Current Assignment */}
                      <td className="py-3.5 px-4">
                        {incidentCode ? (
                          <button
                            onClick={() => handleOpenIncident(incidentCode)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-semibold transition-colors cursor-pointer"
                            title="Click to view emergency details"
                          >
                            <span>{incidentCode}</span>
                            {activeIncident && (
                              <span className="text-[10px] text-blue-600 font-normal">
                                • {activeIncident.category}
                              </span>
                            )}
                            <ExternalLink className="w-3 h-3 text-blue-600" />
                          </button>
                        ) : (
                          <span className="text-slate-400">No active assignment</span>
                        )}
                      </td>

                      {/* Contact */}
                      <td className="py-3.5 px-4 text-slate-700">
                        <div>
                          <p className="font-semibold text-slate-800">
                            {team.teamLead || 'Not specified'}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {team.contactPhone || '—'}
                          </p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenTeamDetails(team)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md transition-colors cursor-pointer text-xs"
                          >
                            View
                          </button>
                          {canManageTeams && (
                            <button
                              onClick={() => handleToggleAvailability(team)}
                              title={
                                team.status === 'Available'
                                  ? 'Mark as Unavailable'
                                  : 'Mark as Available'
                              }
                              className={`p-1 rounded-md transition-colors cursor-pointer border ${
                                team.status === 'Available'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                              }`}
                            >
                              {team.status === 'Available' ? (
                                <Clock className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredTeams.map((team) => {
              const incidentCode = team.currentIncidentCode || team.currentIncidentId;
              const activeIncident = incidentCode
                ? incidents.find((i) => i.id === incidentCode)
                : null;

              return (
                <div key={team.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{team.name}</p>
                      <span className="font-mono text-[10px] text-slate-400">
                        {team.id}
                      </span>
                    </div>
                    {renderStatusBadge(team.status)}
                  </div>

                  <div className="flex flex-wrap gap-2 items-center text-xs text-slate-600">
                    <div>{renderCapabilityBadge(team.type)}</div>
                    <div className="flex items-center gap-1 text-slate-500">
                      <MapPin className="w-3 h-3" />
                      <span>{team.baseLocation || 'Not provided'}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Contact:</span>
                      <span className="font-medium text-slate-800">
                        {team.teamLead || 'Not specified'}{' '}
                        {team.contactPhone ? `(${team.contactPhone})` : ''}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Assignment:</span>
                      {incidentCode ? (
                        <button
                          onClick={() => handleOpenIncident(incidentCode)}
                          className="font-bold text-blue-700 flex items-center gap-1 hover:underline cursor-pointer"
                        >
                          <span>{incidentCode}</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-slate-400">No active assignment</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => handleOpenTeamDetails(team)}
                      className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-md text-xs transition-colors cursor-pointer"
                    >
                      View Details
                    </button>
                    {canManageTeams && (
                      <button
                        onClick={() => handleToggleAvailability(team)}
                        className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border ${
                          team.status === 'Available'
                            ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        {team.status === 'Available' ? 'Set Unavailable' : 'Set Available'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Add Response Team Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
                  <Users2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Add Response Team</h3>
                  <p className="text-xs text-slate-300">
                    Register a new emergency response team into the district
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Team Name */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Team Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Colombo Medical Team 01"
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              {/* Team Type & Base Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">
                    Capability / Team Type *
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {CAPABILITY_OPTIONS.map((cap) => (
                      <option key={cap} value={cap}>
                        {cap} Team
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">
                    Base Location *
                  </label>
                  <select
                    value={newBase}
                    onChange={(e) => setNewBase(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                  >
                    {SRI_LANKA_BASES.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Lead & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">
                    Contact Person (Team Lead)
                  </label>
                  <input
                    type="text"
                    value={newLead}
                    onChange={(e) => setNewLead(e.target.value)}
                    placeholder="e.g., N. Perera"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-900 block mb-1">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="e.g., 077 123 4567"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Initial Status */}
              <div>
                <label className="text-xs font-bold text-slate-900 block mb-1">
                  Initial Status
                </label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="initialStatus"
                      value="Available"
                      checked={newStatus === 'Available'}
                      onChange={() => setNewStatus('Available')}
                      className="accent-blue-600"
                    />
                    <span className="font-medium text-slate-800">Available (Ready for assignment)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="initialStatus"
                      value="Unavailable"
                      checked={newStatus === 'Unavailable'}
                      onChange={() => setNewStatus('Unavailable')}
                      className="accent-blue-600"
                    />
                    <span className="font-medium text-slate-800">Unavailable</span>
                  </label>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isSubmitting ? 'Adding…' : 'Add Team'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Team Details / Edit Modal */}
      {selectedTeam && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-100">
          <div className="bg-white rounded-xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
                  <Users2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">{selectedTeam.name}</h3>
                  <p className="text-xs text-slate-300">
                    {selectedTeam.id} • {selectedTeam.type} Team
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTeam(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content Canvas */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {actionError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{actionError}</span>
                </div>
              )}

              {isEditMode ? (
                /* Edit Form */
                <div className="space-y-3.5">
                  <div>
                    <label className="text-xs font-bold text-slate-900 block mb-1">
                      Team Name *
                    </label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-900 block mb-1">
                        Capability / Team Type
                      </label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      >
                        {CAPABILITY_OPTIONS.map((cap) => (
                          <option key={cap} value={cap}>
                            {cap} Team
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-900 block mb-1">
                        Base Location
                      </label>
                      <select
                        value={editBase}
                        onChange={(e) => setEditBase(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                      >
                        {SRI_LANKA_BASES.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-900 block mb-1">
                        Contact Person
                      </label>
                      <input
                        type="text"
                        value={editLead}
                        onChange={(e) => setEditLead(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-900 block mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-900 block mb-1">
                      Operational Status
                    </label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Available">Available (Ready for assignment)</option>
                      <option value="Assigned">Assigned</option>
                      <option value="In Progress">Responding</option>
                      <option value="Unavailable">Unavailable</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditTeam}
                      disabled={isSubmitting}
                      className="px-4 py-1.5 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer"
                    >
                      {isSubmitting ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Details Readout */
                <div className="space-y-4">
                  {/* Status Banner */}
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-400 block">CURRENT STATUS</span>
                      <div className="mt-0.5">{renderStatusBadge(selectedTeam.status)}</div>
                    </div>

                    {canManageTeams && (
                      <button
                        onClick={() => handleToggleAvailability(selectedTeam)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                          selectedTeam.status === 'Available'
                            ? 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
                            : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                        }`}
                      >
                        {selectedTeam.status === 'Available'
                          ? 'Mark Unavailable'
                          : 'Mark Available'}
                      </button>
                    )}
                  </div>

                  {/* Operational Details Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-white p-3.5 rounded-lg border border-slate-200">
                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold">
                        CAPABILITY
                      </span>
                      <div className="mt-1">{renderCapabilityBadge(selectedTeam.type)}</div>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold">
                        BASE LOCATION
                      </span>
                      <span className="font-semibold text-slate-800 mt-1 block">
                        {selectedTeam.baseLocation || 'Not provided'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold">
                        CONTACT PERSON
                      </span>
                      <span className="font-semibold text-slate-800 mt-1 block">
                        {selectedTeam.teamLead || 'Not specified'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] text-slate-400 block font-semibold">
                        CONTACT PHONE
                      </span>
                      <span className="font-mono font-semibold text-blue-700 mt-1 block">
                        {selectedTeam.contactPhone || '—'}
                      </span>
                    </div>
                  </div>

                  {/* Current Active Assignment */}
                  <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/60">
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-2">
                      CURRENT ASSIGNMENT
                    </span>

                    {selectedTeam.currentIncidentCode || selectedTeam.currentIncidentId ? (
                      (() => {
                        const code =
                          selectedTeam.currentIncidentCode ||
                          selectedTeam.currentIncidentId ||
                          '';
                        const incidentObj = incidents.find((i) => i.id === code);

                        return (
                          <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-2xs flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-blue-900 text-sm">
                                  {code}
                                </span>
                                {incidentObj && (
                                  <PriorityBadge
                                    priority={incidentObj.operationalPriority}
                                    size="sm"
                                  />
                                )}
                              </div>
                              <p className="text-xs text-slate-600 mt-1">
                                {incidentObj
                                  ? `${incidentObj.category} emergency in ${incidentObj.locationName}`
                                  : 'Active response assignment'}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                handleOpenIncident(code);
                                setSelectedTeam(null);
                              }}
                              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <span>View Incident</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })()
                    ) : (
                      <p className="text-slate-500 text-xs">
                        No active assignment. Team is ready to respond.
                      </p>
                    )}
                  </div>

                  {/* Recent Assignments from real history */}
                  <div>
                    <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider block mb-2">
                      RECENT ASSIGNMENTS
                    </span>

                    {(() => {
                      const teamHistory = incidents.filter(
                        (i) => i.assignedTeamId === selectedTeam.id
                      );

                      if (teamHistory.length === 0) {
                        return (
                          <p className="text-slate-400 text-xs italic">
                            No recorded emergency assignments for this team yet.
                          </p>
                        );
                      }

                      return (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {teamHistory.slice(0, 5).map((h) => (
                            <div
                              key={h.id}
                              className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                            >
                              <div>
                                <span className="font-bold text-slate-900">{h.id}</span>
                                <span className="text-slate-500 ml-2">
                                  {h.category} • {h.locationName}
                                </span>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {formatRelativeTime(h.receivedTimestamp)}
                                </p>
                              </div>

                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                  h.status === 'Resolved'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}
                              >
                                {h.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions Bar */}
                  {canManageTeams && (
                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeactivateTeam(selectedTeam)}
                          className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Deactivate Team</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => setIsEditMode(true)}
                        className="ml-auto px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit Team</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
