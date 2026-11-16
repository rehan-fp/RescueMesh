import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  Incident,
  RescueTeam,
  IoTDevice,
  UserAccount,
  FilterState,
  SystemNotification,
  PriorityLevel,
  IncidentStatus,
  EmergencyCategory,
  RiskZone
} from '../types';
import { api, ApiError, getAccessToken, setAccessToken, SystemHealth } from '../utils/api';
import {
  playEmergencyAlert,
  getSavedAudioPreference,
  saveAudioPreference,
  markIncidentAnnounced,
  isIncidentAnnounced,
  initAudio
} from '../utils/audio';
import {
  realtimeEvents,
  RealtimeConnectionState,
  IncidentCreatedEvent,
  IncidentUpdatedEvent
} from '../utils/realtimeEvents';

interface EmergencyContextType {
  incidents: Incident[];
  rescueTeams: RescueTeam[];
  iotDevices: IoTDevice[];
  allUsers: UserAccount[];
  currentUser: UserAccount | null;
  selectedIncident: Incident | null;
  focusedIncidentId: string | null;
  activeTab: string;
  filters: FilterState;
  notifications: SystemNotification[];
  unreadAlertCount: number;
  audioEnabled: boolean;
  isSimulating: boolean;
  systemStatus: 'ONLINE' | 'STANDBY' | 'DEGRADED';
  lastSyncTime: string;
  systemHealth: SystemHealth | null;
  isLoading: boolean;
  apiError: string | null;
  isAuthenticated: boolean;
  currentTime: Date;
  realtimeStatus: RealtimeConnectionState;
  activeAlerts: Incident[];

  // Actions
  setActiveTab: (tab: string) => void;
  setSelectedIncident: (incident: Incident | null) => void;
  setFocusedIncidentId: (id: string | null) => void;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  setAudioEnabled: (enabled: boolean) => void;
  dismissAlert: (incidentId: string) => void;
  dismissAllAlerts: () => void;
  setIsSimulating: (simulating: boolean) => void;
  refreshData: () => Promise<void>;

  acknowledgeIncident: (incidentId: string) => Promise<void>;
  assignTeamToIncident: (incidentId: string, teamId: string, notes?: string) => Promise<void>;
  updateIncidentStatus: (incidentId: string, newStatus: IncidentStatus, notes?: string) => Promise<void>;
  overridePriority: (incidentId: string, newPriority: PriorityLevel, reason: string) => Promise<void>;
  triggerMockSos: (customCategory?: EmergencyCategory, customRisk?: RiskZone) => Promise<Incident | null>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  login: (credentials: {
    email: string;
    password: string;
    station_id?: string;
  }) => Promise<void>;
  logout: () => void;
  createUser: (payload: {
    name: string;
    email: string;
    role: string;
    station?: string;
    password?: string;
    badgeNumber?: string;
  }) => Promise<{ user: UserAccount; generatedPassword?: string }>;
  updateUserRole: (id: string, role: string) => Promise<void>;
  updateUserStatus: (id: string, status: 'Active' | 'Disabled') => Promise<void>;
  resetUserPassword: (id: string, password?: string) => Promise<string | undefined>;
  updateUserProfile: (id: string, payload: { name?: string; station?: string }) => Promise<void>;

  createTeam: (payload: {
    name: string;
    type: string;
    contactPhone?: string;
    teamLead?: string;
    baseLocation: string;
    status?: string;
    latitude?: number;
    longitude?: number;
  }) => Promise<RescueTeam>;
  updateTeam: (
    id: string,
    payload: {
      name?: string;
      type?: string;
      contactPhone?: string;
      teamLead?: string;
      baseLocation?: string;
      status?: string;
      latitude?: number;
      longitude?: number;
    }
  ) => Promise<RescueTeam>;
  deleteTeam: (id: string) => Promise<void>;
}

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  priority: 'All',
  category: 'All',
  riskZone: 'All',
  status: 'All',
  assignedTeam: 'All',
  timeRange: 'all'
};

const EmergencyContext = createContext<EmergencyContextType | undefined>(undefined);

function upsertIncident(list: Incident[], updated: Incident): Incident[] {
  const exists = list.some((i) => i.id === updated.id);
  if (!exists) return [updated, ...list];
  return list.map((i) => (i.id === updated.id ? updated : i));
}

export const EmergencyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [rescueTeams, setRescueTeams] = useState<RescueTeam[]>([]);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [focusedIncidentId, setFocusedIncidentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('login');
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [audioEnabled, setAudioEnabledState] = useState<boolean>(() => getSavedAudioPreference());
  const [realtimeStatus, setRealtimeStatus] = useState<RealtimeConnectionState>('disconnected');
  const [activeAlerts, setActiveAlerts] = useState<Incident[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [systemStatus, setSystemStatus] = useState<'ONLINE' | 'STANDBY' | 'DEGRADED'>('STANDBY');
  const [lastSyncTime, setLastSyncTime] = useState<string>('—');
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [allUsers, setAllUsers] = useState<UserAccount[]>([]);
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());
  const unseenCountRef = useRef<number>(0);

  // Audio preference toggle with persistence and browser unlocking
  const setAudioEnabled = useCallback((enabled: boolean) => {
    saveAudioPreference(enabled);
    setAudioEnabledState(enabled);
    if (enabled) {
      initAudio();
    }
  }, []);

  const dismissAlert = useCallback((incidentId: string) => {
    setActiveAlerts((prev) => prev.filter((a) => a.id !== incidentId));
  }, []);

  const dismissAllAlerts = useCallback(() => {
    setActiveAlerts([]);
  }, []);

  // Shared periodic ticker for live relative-time updates across all screens
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Unlock Web Audio context on user interaction to comply with autoplay restrictions
  useEffect(() => {
    const unlock = () => initAudio();
    window.addEventListener('click', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    return () => {
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  // Background tab title notification restoration
  useEffect(() => {
    const onVisibilityChange = () => {
      if (!document.hidden) {
        unseenCountRef.current = 0;
        document.title = 'RescueMesh AI — Emergency Response Management System';
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => document.removeEventListener('visibilitychange', onVisibilityChange);
  }, []);

  const isAuthenticated = Boolean(currentUser);

  const applyIncidentUpdate = useCallback((updated: Incident) => {
    setIncidents((prev) => upsertIncident(prev, updated));
    setSelectedIncident((prev) => (prev && prev.id === updated.id ? updated : prev));
  }, []);

  const clearSession = useCallback(() => {
    realtimeEvents.disconnect();
    setAccessToken(null);
    setCurrentUser(null);
    setSelectedIncident(null);
    setIncidents([]);
    setRescueTeams([]);
    setIotDevices([]);
    setAllUsers([]);
    setNotifications([]);
    setActiveAlerts([]);
    setIsSimulating(false);
    setActiveTab('login');
  }, []);

  const refreshData = useCallback(async () => {
    if (!getAccessToken()) {
      setIsLoading(false);
      return;
    }
    try {
      const [inc, teams, devices, users, health] = await Promise.all([
        api.getIncidents(),
        api.getTeams(),
        api.getDevices(),
        api.getUsers(),
        api.getSystemHealth(),
      ]);

      // Missed Incident Recovery: check for any recent (last 15m) unannounced emergencies
      const nowMs = Date.now();
      const fifteenMinsAgo = nowMs - 15 * 60 * 1000;
      const missedAlerts: Incident[] = [];

      for (const item of inc) {
        const itemTime = new Date(item.receivedTimestamp || item.receivedAt || 0).getTime();
        if (itemTime > fifteenMinsAgo && item.status === 'New' && !isIncidentAnnounced(item.id)) {
          if (markIncidentAnnounced(item.id)) {
            missedAlerts.push(item);
          }
        }
      }

      if (missedAlerts.length > 0) {
        if (getSavedAudioPreference()) {
          playEmergencyAlert(missedAlerts[0].operationalPriority);
        }
        setActiveAlerts((prev) => [
          ...missedAlerts,
          ...prev.filter((p) => !missedAlerts.some((m) => m.id === p.id)),
        ]);
      }

      setIncidents(inc);
      setRescueTeams(teams);
      setIotDevices(devices);
      setAllUsers(users);
      setSystemHealth(health);
      setApiError(null);

      const dbOk = health.database === 'online';
      const backendOk = health.backend === 'online';
      setSystemStatus(backendOk && dbOk ? 'ONLINE' : 'DEGRADED');
      setLastSyncTime(
        new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearSession();
        setApiError(err.message);
        return;
      }
      const message = err instanceof Error ? err.message : 'Communication with the emergency operations server was interrupted.';
      setApiError(message);
      setSystemStatus('DEGRADED');
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  // Bootstrap session + load dashboard data from Flask
  useEffect(() => {
    const bootstrap = async () => {
      setIsLoading(true);
      const token = getAccessToken();
      if (token) {
        try {
          const me = await api.me();
          setCurrentUser(me);
          setActiveTab('dashboard');
        } catch {
          clearSession();
        }
      }
      await refreshData();
    };
    bootstrap();
  }, [refreshData, clearSession]);

  // Real-time Server-Sent Events (SSE) subscription for instant emergency alerts
  useEffect(() => {
    const token = getAccessToken();
    if (!isAuthenticated || !token) {
      realtimeEvents.disconnect();
      return;
    }

    const unsubCreated = realtimeEvents.subscribeCreated((event: IncidentCreatedEvent) => {
      const newInc: Incident = event.incident;
      if (!newInc || !newInc.id) return;

      const isHardware = (newInc.ingestionSource || event.ingestion_source || 'HARDWARE') === 'HARDWARE';
      if (!isHardware) {
        return;
      }

      // Prevent alert fatigue / duplicates
      const isFirstAnnouncement = markIncidentAnnounced(newInc.id);

      setIncidents((prev) => upsertIncident(prev, newInc));

      if (isFirstAnnouncement) {
        if (getSavedAudioPreference()) {
          playEmergencyAlert(newInc.operationalPriority);
        }

        setActiveAlerts((prev) => [newInc, ...prev.filter((a) => a.id !== newInc.id)]);

        const notif: SystemNotification = {
          id: `notif-${Date.now()}-${newInc.id}`,
          incidentId: newInc.id,
          title: `New ${newInc.operationalPriority} Priority Emergency`,
          message: `${newInc.category} emergency reported in ${newInc.locationName}.`,
          category: newInc.category,
          priority: newInc.operationalPriority,
          timestamp: newInc.receivedTimestamp || new Date().toISOString(),
          isRead: false,
        };
        setNotifications((prev) => [notif, ...prev]);

        if (document.hidden) {
          unseenCountRef.current += 1;
          document.title = `(${unseenCountRef.current}) RescueMesh AI`;
        }
      }
    });

    const unsubUpdated = realtimeEvents.subscribeUpdated((event: IncidentUpdatedEvent) => {
      const updated: Incident = event.incident;
      if (updated && updated.id) {
        const isHardware = (updated.ingestionSource || event.ingestion_source || 'HARDWARE') === 'HARDWARE';
        if (!isHardware) {
          return;
        }
        applyIncidentUpdate(updated);

        // Instantly refresh team statuses and assignments upon incident changes
        api.getTeams().then(setRescueTeams).catch(() => {});

        const notif: SystemNotification = {
          id: `notif-upd-${Date.now()}-${updated.id}`,
          incidentId: updated.id,
          title: `Incident ${updated.id} Updated`,
          message: `Status moved to ${updated.status} (${updated.locationName}).`,
          category: updated.category,
          priority: updated.operationalPriority,
          timestamp: new Date().toISOString(),
          isRead: false,
        };
        setNotifications((prev) => [notif, ...prev]);
      }
    });

    const unsubState = realtimeEvents.subscribeConnectionState((state) => {
      setRealtimeStatus(state);
      if (state === 'connected') {
        // Missed Incident Recovery on reconnect
        refreshData();
      }
    });

    realtimeEvents.connect(token);

    return () => {
      unsubCreated();
      unsubUpdated();
      unsubState();
      realtimeEvents.disconnect();
    };
  }, [isAuthenticated, applyIncidentUpdate, refreshData]);

  // Gentle backup polling (every 45s) as a safety net
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      refreshData();
    }, 45000);
    return () => clearInterval(interval);
  }, [isAuthenticated, refreshData]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  const triggerMockSos = useCallback(
    async (customCategory?: EmergencyCategory, customRisk?: RiskZone) => {
      try {
        const created = await api.createTestSos({
          category: customCategory,
          risk_zone: customRisk,
        });
        setIncidents((prev) => [created, ...prev]);
        setFocusedIncidentId(created.id);

        const timeStr = created.receivedTimestamp;
        const newNotification: SystemNotification = {
          id: `notif-${Date.now()}`,
          incidentId: created.id,
          title: `New ${created.operationalPriority} Priority Emergency`,
          message: `${created.category} emergency reported in ${created.locationName}. Recommended Priority: ${created.aiRecommendedPriority}.`,
          category: created.category,
          priority: created.operationalPriority,
          timestamp: timeStr,
          isRead: false,
        };
        setNotifications((prev) => [newNotification, ...prev]);

        if (audioEnabled) {
          playEmergencyAlert(created.operationalPriority);
        }
        return created;
      } catch (err) {
        setApiError(err instanceof Error ? err.message : 'Unable to create test emergency request');
        return null;
      }
    },
    [audioEnabled]
  );

  useEffect(() => {
    if (!isSimulating) return;
    const interval = setInterval(() => {
      triggerMockSos();
    }, 25000);
    return () => clearInterval(interval);
  }, [isSimulating, triggerMockSos]);

  const acknowledgeIncident = useCallback(
    async (incidentId: string) => {
      const updated = await api.acknowledgeIncident(incidentId);
      applyIncidentUpdate(updated);
      await refreshData();
    },
    [applyIncidentUpdate, refreshData]
  );

  const assignTeamToIncident = useCallback(
    async (incidentId: string, teamId: string, notes?: string) => {
      const updated = await api.assignTeam(incidentId, teamId, notes);
      applyIncidentUpdate(updated);
      await refreshData();
    },
    [applyIncidentUpdate, refreshData]
  );

  const updateIncidentStatus = useCallback(
    async (incidentId: string, newStatus: IncidentStatus, notes?: string) => {
      const updated = await api.updateStatus(incidentId, newStatus, notes);
      applyIncidentUpdate(updated);
      await refreshData();
    },
    [applyIncidentUpdate, refreshData]
  );

  const overridePriority = useCallback(
    async (incidentId: string, newPriority: PriorityLevel, reason: string) => {
      const updated = await api.overridePriority(incidentId, newPriority, reason);
      applyIncidentUpdate(updated);
    },
    [applyIncidentUpdate]
  );

  const markNotificationRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  }, []);

  const login = useCallback(
    async (credentials: { email: string; password: string; station_id?: string }) => {
      const result = await api.login(credentials);
      setAccessToken(result.access_token);
      setCurrentUser(result.user);
      setActiveTab('dashboard');
      await refreshData();
    },
    [refreshData]
  );

  const logout = useCallback(() => {
    clearSession();
    setApiError(null);
  }, [clearSession]);

  const createUser = useCallback(
    async (payload: {
      name: string;
      email: string;
      role: string;
      station?: string;
      password?: string;
      badgeNumber?: string;
    }) => {
      const res = await api.createUser(payload);
      await refreshData();
      return { user: res.user, generatedPassword: res.generatedPassword };
    },
    [refreshData]
  );

  const updateUserRole = useCallback(
    async (id: string, role: string) => {
      const res = await api.updateUserRole(id, role);
      setAllUsers((prev) => prev.map((u) => (u.id === id ? res.user : u)));
      setCurrentUser((prev) => (prev && prev.id === id ? res.user : prev));
      await refreshData();
    },
    [refreshData]
  );

  const updateUserStatus = useCallback(
    async (id: string, status: 'Active' | 'Disabled') => {
      const res = await api.updateUserStatus(id, status);
      setAllUsers((prev) => prev.map((u) => (u.id === id ? res.user : u)));
      setCurrentUser((prev) => (prev && prev.id === id ? res.user : prev));
      await refreshData();
    },
    [refreshData]
  );

  const resetUserPassword = useCallback(
    async (id: string, password?: string) => {
      const res = await api.resetUserPassword(id, password);
      return res.temporaryPassword;
    },
    []
  );

  const updateUserProfile = useCallback(
    async (id: string, payload: { name?: string; station?: string }) => {
      const res = await api.updateUserProfile(id, payload);
      setAllUsers((prev) => prev.map((u) => (u.id === id ? res.user : u)));
      setCurrentUser((prev) => (prev && prev.id === id ? res.user : prev));
      await refreshData();
    },
    [refreshData]
  );

  const createTeam = useCallback(
    async (payload: {
      name: string;
      type: string;
      contactPhone?: string;
      teamLead?: string;
      baseLocation: string;
      status?: string;
      latitude?: number;
      longitude?: number;
    }) => {
      const created = await api.createTeam(payload);
      setRescueTeams((prev) => [...prev, created]);
      await refreshData();
      return created;
    },
    [refreshData]
  );

  const updateTeam = useCallback(
    async (
      id: string,
      payload: {
        name?: string;
        type?: string;
        contactPhone?: string;
        teamLead?: string;
        baseLocation?: string;
        status?: string;
        latitude?: number;
        longitude?: number;
      }
    ) => {
      const updated = await api.updateTeam(id, payload);
      setRescueTeams((prev) => prev.map((t) => (t.id === id ? updated : t)));
      await refreshData();
      return updated;
    },
    [refreshData]
  );

  const deleteTeam = useCallback(
    async (id: string) => {
      await api.deleteTeam(id);
      await refreshData();
    },
    [refreshData]
  );

  const unreadAlertCount = notifications.filter((n) => !n.isRead).length;

  return (
    <EmergencyContext.Provider
      value={{
        incidents,
        rescueTeams,
        iotDevices,
        allUsers,
        currentUser,
        selectedIncident,
        focusedIncidentId,
        activeTab,
        filters,
        notifications,
        unreadAlertCount,
        audioEnabled,
        realtimeStatus,
        activeAlerts,
        isSimulating,
        systemStatus,
        lastSyncTime,
        systemHealth,
        isLoading,
        apiError,
        isAuthenticated,
        currentTime,

        setActiveTab,
        setSelectedIncident,
        setFocusedIncidentId,
        setFilters,
        resetFilters,
        setAudioEnabled,
        dismissAlert,
        dismissAllAlerts,
        setIsSimulating,
        refreshData,

        acknowledgeIncident,
        assignTeamToIncident,
        updateIncidentStatus,
        overridePriority,
        triggerMockSos,
        markNotificationRead,
        markAllNotificationsRead,
        login,
        logout,
        createUser,
        updateUserRole,
        updateUserStatus,
        resetUserPassword,
        updateUserProfile,
        createTeam,
        updateTeam,
        deleteTeam
      }}
    >
      {children}
    </EmergencyContext.Provider>
  );
};

export function useEmergency() {
  const context = useContext(EmergencyContext);
  if (!context) {
    throw new Error('useEmergency must be used within an EmergencyProvider');
  }
  return context;
}
