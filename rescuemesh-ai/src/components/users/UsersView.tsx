import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { UserAccount, UserRole } from '../../types';
import { formatIncidentDateTime } from '../../utils/dateTime';
import {
  Users2,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit2,
  UserCheck,
  UserX,
  Key,
  Lock,
  AlertTriangle,
  Check,
  Copy,
  X,
  Building2,
  Mail,
  BadgeCheck,
  Radio,
  Eye,
  Info
} from 'lucide-react';

const SYSTEM_ROLES: {
  role: UserRole;
  title: string;
  description: string;
  badgeClass: string;
  permissions: string[];
}[] = [
  {
    role: 'Administrator',
    title: 'Administrator',
    description: 'Full access to RescueMesh, including incidents, response teams, users and system settings.',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    permissions: [
      'Manage all emergency incidents',
      'Manage response teams and readiness',
      'Manage user accounts & access permissions',
      'Adjust incident priorities and review logs',
      'View and export operational reports',
      'Manage system settings'
    ]
  },
  {
    role: 'Emergency Operator',
    title: 'Emergency Operator',
    description: 'Monitors incoming emergencies, reviews priority recommendations, acknowledges incidents and assigns response teams.',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    permissions: [
      'View incoming emergencies',
      'Acknowledge emergencies',
      'Review priority recommendations',
      'Assign response teams',
      'Update incident status'
    ]
  },
  {
    role: 'Response Coordinator',
    title: 'Response Coordinator',
    description: 'Coordinates response teams, tracks availability and manages active emergency assignments.',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
    permissions: [
      'View emergency locations on live map',
      'Manage response-team availability',
      'Assign and coordinate team deployments',
      'Update response progress and status',
      'Monitor active team workloads'
    ]
  },
  {
    role: 'Viewer',
    title: 'Viewer',
    description: 'Can view emergency information and reports but cannot make operational changes.',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    permissions: [
      'View operations dashboard',
      'View live emergency map',
      'View emergency incidents list',
      'View operational reports'
    ]
  }
];

const PERMISSION_MATRIX = [
  { capability: 'View live emergency dashboard & map', admin: true, operator: true, coordinator: true, viewer: true },
  { capability: 'Acknowledge incoming emergency requests', admin: true, operator: true, coordinator: false, viewer: false },
  { capability: 'Review priority assessment recommendations', admin: true, operator: true, coordinator: false, viewer: false },
  { capability: 'Override priority with operational reason', admin: true, operator: true, coordinator: false, viewer: false },
  { capability: 'Assign and dispatch response teams', admin: true, operator: true, coordinator: true, viewer: false },
  { capability: 'Update response team availability & status', admin: true, operator: true, coordinator: true, viewer: false },
  { capability: 'Update emergency incident progress & resolution', admin: true, operator: true, coordinator: true, viewer: false },
  { capability: 'View and export incident reports', admin: true, operator: true, coordinator: true, viewer: true },
  { capability: 'Manage users, roles and access permissions', admin: true, operator: false, coordinator: false, viewer: false },
  { capability: 'Configure emergency system settings', admin: true, operator: false, coordinator: false, viewer: false },
];

export const UsersView: React.FC = () => {
  const {
    currentUser,
    allUsers,
    currentTime,
    createUser,
    updateUserRole,
    updateUserStatus,
    resetUserPassword,
    updateUserProfile
  } = useEmergency();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Menu and Modals state
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserAccount | null>(null);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [roleChangeUser, setRoleChangeUser] = useState<UserAccount | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<UserRole>('Emergency Operator');
  const [statusToggleUser, setStatusToggleUser] = useState<UserAccount | null>(null);
  const [passwordResetUser, setPasswordResetUser] = useState<UserAccount | null>(null);
  const [customPassword, setCustomPassword] = useState('');

  // Generated temporary credential modal
  const [generatedCreds, setGeneratedCreds] = useState<{
    userName: string;
    email: string;
    password?: string;
    action: 'created' | 'reset';
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Form states
  const [addForm, setAddForm] = useState({
    name: '',
    email: '',
    role: 'Emergency Operator' as UserRole,
    station: 'Western Emergency Command Center',
    useAutoPassword: true,
    manualPassword: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    station: ''
  });

  // Action status / errors
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const isAdmin = currentUser?.role === 'Administrator';

  // Auto-dismiss success toast
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => setSuccessToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  // Click outside to close row actions menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenuUserId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    return allUsers.filter((u) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.badgeNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.station && u.station.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (u.assignedDistrict && u.assignedDistrict.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesRole = roleFilter === 'All' || u.role === roleFilter;

      const isActive = u.status !== 'Disabled';
      const matchesStatus =
        statusFilter === 'All' ||
        (statusFilter === 'Active' && isActive) ||
        (statusFilter === 'Disabled' && !isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [allUsers, searchQuery, roleFilter, statusFilter]);

  // Handle Add User submission
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setIsSubmitting(true);
    try {
      const password = addForm.useAutoPassword ? undefined : addForm.manualPassword;
      const result = await createUser({
        name: addForm.name.trim(),
        email: addForm.email.trim(),
        role: addForm.role,
        station: addForm.station.trim(),
        password
      });

      setIsAddModalOpen(false);
      setAddForm({
        name: '',
        email: '',
        role: 'Emergency Operator',
        station: 'Western Emergency Command Center',
        useAutoPassword: true,
        manualPassword: ''
      });

      setGeneratedCreds({
        userName: result.user.name,
        email: result.user.email,
        password: result.generatedPassword || password || 'rescuemesh123',
        action: 'created'
      });
      setSuccessToast(`Account created successfully for ${result.user.name}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to create user account');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit User submission
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await updateUserProfile(editingUser.id, {
        name: editForm.name.trim(),
        station: editForm.station.trim()
      });
      setEditingUser(null);
      setSuccessToast(`Updated account details for ${editForm.name}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update user profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Change Role submission
  const handleConfirmRoleChange = async () => {
    if (!roleChangeUser) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      await updateUserRole(roleChangeUser.id, selectedNewRole);
      setSuccessToast(`Role updated to ${selectedNewRole} for ${roleChangeUser.name}`);
      setRoleChangeUser(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to change user role');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Status (Deactivate / Activate)
  const handleConfirmStatusToggle = async () => {
    if (!statusToggleUser) return;
    setActionError(null);
    setIsSubmitting(true);
    const newStatus = statusToggleUser.status === 'Disabled' ? 'Active' : 'Disabled';
    try {
      await updateUserStatus(statusToggleUser.id, newStatus);
      const actionName = newStatus === 'Active' ? 'reactivated' : 'deactivated';
      setSuccessToast(`Account ${actionName} for ${statusToggleUser.name}`);
      setStatusToggleUser(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to update account status');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Password Reset submission
  const handleConfirmPasswordReset = async () => {
    if (!passwordResetUser) return;
    setActionError(null);
    setIsSubmitting(true);
    try {
      const pwd = customPassword.trim() ? customPassword.trim() : undefined;
      const temporaryPassword = await resetUserPassword(passwordResetUser.id, pwd);
      setPasswordResetUser(null);
      setCustomPassword('');
      setGeneratedCreds({
        userName: passwordResetUser.name,
        email: passwordResetUser.email,
        password: temporaryPassword || pwd || 'rescuemesh123',
        action: 'reset'
      });
      setSuccessToast(`Password reset successfully for ${passwordResetUser.name}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to reset user password');
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-semibold rounded-xl shadow-lg animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Users & Access
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 font-semibold border border-slate-200">
              {allUsers.length} Accounts
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage user accounts, roles and access permissions.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[11px] text-slate-400 block font-medium">Signed in as</span>
            <span className="text-xs font-bold text-slate-800 flex items-center justify-end gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {currentUser?.name || 'RescueMesh Administrator'}
              <span className="text-[10px] px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 font-semibold">
                {currentUser?.role || 'Administrator'}
              </span>
            </span>
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                setActionError(null);
                setIsAddModalOpen(true);
              }}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Section: Users Directory */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Search & Filter Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email or center..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role and Status Filters */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Roles</option>
                <option value="Administrator">Administrator</option>
                <option value="Emergency Operator">Emergency Operator</option>
                <option value="Response Coordinator">Response Coordinator</option>
                <option value="Viewer">Viewer</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="All">All Statuses</option>
                <option value="Active">Active</option>
                <option value="Disabled">Deactivated</option>
              </select>
            </div>
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">User</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned Center</th>
                <th className="py-3 px-4">Last Sign In</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <Users2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No matching user accounts found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Try clearing search filters or add a new personnel account.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = SYSTEM_ROLES.find((r) => r.role === user.role) || SYSTEM_ROLES[3];
                  const isActive = user.status !== 'Disabled';
                  const timeInfo = user.lastLogin ? formatIncidentDateTime(user.lastLogin, currentTime) : null;
                  const isCurrent = user.id === currentUser?.id;

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        !isActive ? 'opacity-60 bg-slate-50/30' : ''
                      }`}
                    >
                      {/* User Column */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900">{user.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              Badge: {user.badgeNumber}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Email Column */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        {user.email}
                      </td>

                      {/* Role Column */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold border ${roleConfig.badgeClass}`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{user.role}</span>
                        </span>
                      </td>

                      {/* Status Column */}
                      <td className="py-3.5 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>

                      {/* Assigned Center Column */}
                      <td className="py-3.5 px-4 text-slate-600 font-medium">
                        <span className="truncate max-w-[220px] block" title={user.station || user.assignedDistrict}>
                          {user.station || user.assignedDistrict || 'Command Center HQ'}
                        </span>
                      </td>

                      {/* Last Sign In Column */}
                      <td className="py-3.5 px-4 text-slate-600">
                        {timeInfo ? (
                          <div title={timeInfo.exact}>
                            <span className="font-medium text-slate-800 block text-[11px]">
                              {timeInfo.dateOnly} · {timeInfo.timeOnly}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {timeInfo.relative}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px] italic">Never signed in</span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="py-3.5 px-4 text-right relative">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setViewingUser(user)}
                            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                            title="View user details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {isAdmin && (
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() =>
                                  setActiveMenuUserId(activeMenuUserId === user.id ? null : user.id)
                                }
                                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                                title="Manage user options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeMenuUserId === user.id && (
                                <div
                                  ref={menuRef}
                                  className="absolute right-0 mt-1 w-48 rounded-xl bg-white border border-slate-200 shadow-xl z-30 py-1.5 text-left text-xs divide-y divide-slate-100"
                                >
                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuUserId(null);
                                        setViewingUser(user);
                                      }}
                                      className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                                      <span>View User</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuUserId(null);
                                        setEditingUser(user);
                                        setEditForm({
                                          name: user.name,
                                          station: user.station || user.assignedDistrict || ''
                                        });
                                      }}
                                      className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Edit2 className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Edit User</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuUserId(null);
                                        setRoleChangeUser(user);
                                        setSelectedNewRole(user.role);
                                        setActionError(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Shield className="w-3.5 h-3.5 text-blue-500" />
                                      <span>Change Role</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuUserId(null);
                                        setPasswordResetUser(user);
                                        setCustomPassword('');
                                        setActionError(null);
                                      }}
                                      className="w-full px-3 py-1.5 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <Key className="w-3.5 h-3.5 text-amber-500" />
                                      <span>Reset Password</span>
                                    </button>
                                  </div>

                                  <div className="py-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveMenuUserId(null);
                                        setStatusToggleUser(user);
                                        setActionError(null);
                                      }}
                                      className={`w-full px-3 py-1.5 flex items-center gap-2 cursor-pointer ${
                                        isActive
                                          ? 'text-rose-600 hover:bg-rose-50'
                                          : 'text-emerald-700 hover:bg-emerald-50'
                                      }`}
                                    >
                                      {isActive ? (
                                        <>
                                          <UserX className="w-3.5 h-3.5 text-rose-500" />
                                          <span>Deactivate User</span>
                                        </>
                                      ) : (
                                        <>
                                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                                          <span>Reactivate User</span>
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Roles & Permissions Section (Compact matrix & descriptions) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-5">
        <div>
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Roles & Permissions
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Roles determine what each user can view and manage in RescueMesh.
          </p>
        </div>

        {/* Compact Role Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {SYSTEM_ROLES.map((role) => (
            <div
              key={role.role}
              className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${role.badgeClass}`}>
                  {role.title}
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {role.description}
              </p>
            </div>
          ))}
        </div>

        {/* Operational Permissions Matrix Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="bg-slate-50 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Access Matrix
            </span>
            <span className="text-[11px] text-slate-500">
              Enforced by backend authorization
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-white text-[11px] font-bold text-slate-500">
                  <th className="py-2.5 px-4 font-bold text-slate-700">Operational Capability</th>
                  <th className="py-2.5 px-3 text-center">Administrator</th>
                  <th className="py-2.5 px-3 text-center">Emergency Operator</th>
                  <th className="py-2.5 px-3 text-center">Response Coordinator</th>
                  <th className="py-2.5 px-3 text-center">Viewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {PERMISSION_MATRIX.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 text-slate-700 font-medium">
                      {row.capability}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.admin ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.operator ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.coordinator ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.viewer ? (
                        <Check className="w-4 h-4 text-emerald-600 mx-auto" />
                      ) : (
                        <span className="text-slate-300 font-bold">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD USER                                        */}
      {/* ======================================================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add User Account</h3>
                  <p className="text-[11px] text-slate-500">Create login credentials for emergency personnel</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleAddUser} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addForm.name}
                  onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                  placeholder="e.g. Ruwan Jayawardena"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  placeholder="e.g. ruwan.j@rescuemesh.gov.lk"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={addForm.role}
                    onChange={(e) => setAddForm({ ...addForm, role: e.target.value as UserRole })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  >
                    <option value="Administrator">Administrator</option>
                    <option value="Emergency Operator">Emergency Operator</option>
                    <option value="Response Coordinator">Response Coordinator</option>
                    <option value="Viewer">Viewer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Assigned Center
                  </label>
                  <input
                    type="text"
                    value={addForm.station}
                    onChange={(e) => setAddForm({ ...addForm, station: e.target.value })}
                    placeholder="e.g. Western Emergency Command"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Password configuration */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={addForm.useAutoPassword}
                    onChange={(e) => setAddForm({ ...addForm, useAutoPassword: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Generate secure temporary password automatically</span>
                </label>

                {!addForm.useAutoPassword && (
                  <div className="pt-2">
                    <input
                      type="password"
                      placeholder="Enter initial password (minimum 6 characters)"
                      value={addForm.manualPassword}
                      onChange={(e) => setAddForm({ ...addForm, manualPassword: e.target.value })}
                      required={!addForm.useAutoPassword}
                      minLength={6}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: VIEW USER DETAILS                               */}
      {/* ======================================================== */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">User Profile Details</h3>
              <button
                type="button"
                onClick={() => setViewingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="pt-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-bold text-base flex items-center justify-center shrink-0">
                  {viewingUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-bold text-base text-slate-900">{viewingUser.name}</h4>
                  <p className="text-xs text-slate-500">{viewingUser.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Role</span>
                  <span className="font-bold text-slate-900">{viewingUser.role}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Status</span>
                  <span className="font-bold text-slate-900">
                    {viewingUser.status !== 'Disabled' ? 'Active' : 'Deactivated'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Badge Number</span>
                  <span className="font-mono font-semibold text-slate-800">{viewingUser.badgeNumber}</span>
                </div>
                <div>
                  <span className="text-[11px] text-slate-400 block font-medium">Assigned Center</span>
                  <span className="font-medium text-slate-800 truncate block">
                    {viewingUser.station || viewingUser.assignedDistrict || 'Command Center HQ'}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-[11px] text-slate-400 block font-medium">Last Sign In</span>
                  <span className="font-medium text-slate-800">
                    {viewingUser.lastLogin
                      ? `${formatIncidentDateTime(viewingUser.lastLogin, currentTime).exact} (${formatIncidentDateTime(viewingUser.lastLogin, currentTime).relative})`
                      : 'Never signed in'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide block">
                  Permissions Granted
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {(SYSTEM_ROLES.find((r) => r.role === viewingUser.role)?.permissions || []).map((perm, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{perm}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setViewingUser(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: EDIT USER PROFILE                               */}
      {/* ======================================================== */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">Edit User Profile</h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleEditUser} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  disabled
                  value={editingUser.email}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-slate-50 text-slate-500 cursor-not-allowed"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Email address cannot be modified once provisioned.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Center</label>
                <input
                  type="text"
                  value={editForm.station}
                  onChange={(e) => setEditForm({ ...editForm, station: e.target.value })}
                  placeholder="e.g. Western Emergency Command Center"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: CHANGE ROLE CONFIRMATION                        */}
      {/* ======================================================== */}
      {roleChangeUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Change User Role</h3>
              </div>
              <button
                type="button"
                onClick={() => setRoleChangeUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="pt-4 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Change role for <strong className="text-slate-900">{roleChangeUser.name}</strong>? This will immediately alter what they can view and manage in RescueMesh.
              </p>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Role</span>
                  <span className="font-bold text-slate-800 text-xs">{roleChangeUser.role}</span>
                </div>
                <span className="text-slate-400 font-bold">→</span>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">New Role</span>
                  <span className="font-bold text-blue-600 text-xs">{selectedNewRole}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select New Role
                </label>
                <select
                  value={selectedNewRole}
                  onChange={(e) => setSelectedNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                >
                  <option value="Administrator">Administrator</option>
                  <option value="Emergency Operator">Emergency Operator</option>
                  <option value="Response Coordinator">Response Coordinator</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>

              {roleChangeUser.role === 'Administrator' && selectedNewRole !== 'Administrator' && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-[11px] flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                  <span>
                    Demoting an Administrator requires at least one other active Administrator account to remain in the system.
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRoleChangeUser(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting || selectedNewRole === roleChangeUser.role}
                  onClick={handleConfirmRoleChange}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Changing...' : 'Change Role'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: DEACTIVATE / ACTIVATE USER                      */}
      {/* ======================================================== */}
      {statusToggleUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                {statusToggleUser.status !== 'Disabled' ? (
                  <UserX className="w-4 h-4 text-rose-600" />
                ) : (
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                )}
                <h3 className="text-sm font-bold text-slate-900">
                  {statusToggleUser.status !== 'Disabled' ? 'Deactivate Account' : 'Reactivate Account'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusToggleUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="pt-4 space-y-4 text-xs">
              {statusToggleUser.status !== 'Disabled' ? (
                <div className="space-y-2 text-slate-600 leading-relaxed">
                  <p>
                    Are you sure you want to deactivate <strong className="text-slate-900">{statusToggleUser.name}</strong>?
                  </p>
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    Deactivating this account will prevent the user from signing in. All existing incident dispatch records, priority notes, and audit logs are securely preserved.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 text-slate-600 leading-relaxed">
                  <p>
                    Reactivate user account for <strong className="text-slate-900">{statusToggleUser.name}</strong>?
                  </p>
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    This user will immediately regain access as <strong className="text-slate-800">{statusToggleUser.role}</strong>.
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatusToggleUser(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmStatusToggle}
                  className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 ${
                    statusToggleUser.status !== 'Disabled'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  {isSubmitting
                    ? 'Updating...'
                    : statusToggleUser.status !== 'Disabled'
                    ? 'Deactivate Account'
                    : 'Reactivate Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: RESET PASSWORD                                 */}
      {/* ======================================================== */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-500" />
                <h3 className="text-sm font-bold text-slate-900">Reset User Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {actionError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{actionError}</span>
              </div>
            )}

            <div className="pt-4 space-y-4 text-xs">
              <p className="text-slate-600">
                Reset password for <strong className="text-slate-900">{passwordResetUser.name}</strong> ({passwordResetUser.email}).
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password (Optional)
                </label>
                <input
                  type="password"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="Leave blank to generate temporary password automatically"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  If left empty, a secure 12-character temporary password will be generated.
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleConfirmPasswordReset}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 7: TEMPORARY CREDENTIALS DISPLAY                   */}
      {/* ======================================================== */}
      {generatedCreds && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100 text-emerald-700">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">
                {generatedCreds.action === 'created' ? 'Account Created Successfully' : 'Password Reset Successfully'}
              </h3>
            </div>

            <div className="pt-4 space-y-4 text-xs">
              <p className="text-slate-600">
                Share these initial credentials securely with <strong className="text-slate-900">{generatedCreds.userName}</strong>.
              </p>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold uppercase block">Email Login</span>
                  <span className="font-mono text-slate-800 font-semibold">{generatedCreds.email}</span>
                </div>

                {generatedCreds.password && (
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Temporary Password</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono text-sm text-blue-700 font-bold bg-white px-2.5 py-1 rounded border border-slate-200">
                        {generatedCreds.password}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedCreds.password || '')}
                        className="px-2.5 py-1 text-xs font-semibold rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        {copiedPassword ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setGeneratedCreds(null)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
