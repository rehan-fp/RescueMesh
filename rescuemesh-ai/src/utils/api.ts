import {
  EmergencyCategory,
  Incident,
  IncidentStatus,
  IoTDevice,
  PriorityLevel,
  RescueTeam,
  RiskZone,
  UserAccount,
} from '../types';

// Production builds must set VITE_API_BASE_URL; the localhost default is dropped from them.
const env = typeof import.meta !== 'undefined' ? (import.meta as any).env : undefined;
const API_BASE =
  env?.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  (env?.DEV ? 'http://localhost:5001/api/v1' : '') ||
  (typeof process !== 'undefined' ? process.env?.VITE_API_BASE_URL || 'http://localhost:5001/api/v1' : '');

export function getApiBaseUrl(): string {
  return API_BASE;
}

if (!API_BASE && typeof window !== 'undefined') {
  console.error('VITE_API_BASE_URL was not set at build time; API requests will fail.');
}

const TOKEN_KEY = 'rescuemesh_access_token';

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function getFriendlyErrorMessage(status?: number, rawError?: string): string {
  if (
    rawError &&
    !rawError.toLowerCase().includes('http') &&
    !rawError.includes('{') &&
    !rawError.toLowerCase().includes('failed to fetch') &&
    rawError.trim().length > 0
  ) {
    return rawError;
  }
  if (status === 401) {
    return 'Your session has expired. Please sign in again.';
  }
  if (status === 403) {
    return 'You do not have permission to perform this operational action.';
  }
  if (status === 404) {
    return 'The requested emergency record or resource could not be found.';
  }
  if (status && status >= 500) {
    return 'The emergency operations server encountered a temporary issue. Please try again in a moment.';
  }
  return 'Unable to complete this action. Please try again.';
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const token = getAccessToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });
  } catch (netErr) {
    throw new ApiError('Communication with the server was interrupted. Please check your network and try again.', 0);
  }

  if (!response.ok) {
    let rawError = '';
    try {
      const err = await response.json();
      if (err?.error) rawError = err.error;
    } catch {
      // ignore parse errors
    }
    const message = getFriendlyErrorMessage(response.status, rawError);
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export interface LoginResponse {
  access_token: string;
  user: UserAccount;
}

export interface SystemHealth {
  backend: string;
  database: string;
  mqtt: string;
  ingest?: string;
  ai?: string;
  gateway: string;
  last_packet_at?: string | null;
  checked_at?: string;
}

export const api = {
  login: (payload: { email: string; password: string; station_id?: string }) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => apiFetch<UserAccount>('/auth/me'),

  changePassword: (payload: { current_password: string; new_password: string }) =>
    apiFetch<{ message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  getIncidents: (source?: string) =>
    apiFetch<Incident[]>(source ? `/incidents?source=${encodeURIComponent(source)}` : '/incidents'),
  getIncident: (id: string) => apiFetch<Incident>(`/incidents/${id}`),

  acknowledgeIncident: (id: string) =>
    apiFetch<Incident>(`/incidents/${id}/acknowledge`, { method: 'POST' }),

  assignTeam: (id: string, teamId: string, notes?: string) =>
    apiFetch<Incident>(`/incidents/${id}/assign`, {
      method: 'POST',
      body: JSON.stringify({ team_id: teamId, notes }),
    }),

  updateStatus: (id: string, status: IncidentStatus, notes?: string) =>
    apiFetch<Incident>(`/incidents/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    }),

  overridePriority: (id: string, priority: PriorityLevel, reason: string) =>
    apiFetch<Incident>(`/incidents/${id}/priority-override`, {
      method: 'POST',
      body: JSON.stringify({ priority, reason }),
    }),

  getTeams: () => apiFetch<RescueTeam[]>('/teams'),
  getTeam: (id: string) => apiFetch<RescueTeam>(`/teams/${id}`),

  createTeam: (payload: {
    name: string;
    type: string;
    contactPhone?: string;
    teamLead?: string;
    baseLocation: string;
    status?: string;
    latitude?: number;
    longitude?: number;
  }) =>
    apiFetch<RescueTeam>('/teams', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

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
  ) =>
    apiFetch<RescueTeam>(`/teams/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  deleteTeam: (id: string) =>
    apiFetch<{ message: string; deactivated?: boolean; deleted?: boolean }>(`/teams/${id}`, {
      method: 'DELETE',
    }),

  getDevices: () => apiFetch<IoTDevice[]>('/devices'),
  getUsers: () => apiFetch<UserAccount[]>('/users'),
  getUser: (id: string) => apiFetch<UserAccount>(`/users/${id}`),

  createUser: (payload: {
    name: string;
    email: string;
    role: string;
    station?: string;
    password?: string;
    badgeNumber?: string;
  }) =>
    apiFetch<{ user: UserAccount; message: string; generatedPassword?: string }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  updateUserRole: (id: string, role: string) =>
    apiFetch<{ user: UserAccount; message: string }>(`/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),

  updateUserStatus: (id: string, status: 'Active' | 'Disabled') =>
    apiFetch<{ user: UserAccount; message: string }>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  resetUserPassword: (id: string, password?: string) =>
    apiFetch<{ message: string; temporaryPassword?: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  updateUserProfile: (id: string, payload: { name?: string; station?: string }) =>
    apiFetch<{ user: UserAccount; message: string }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    }),

  getSystemHealth: () => apiFetch<SystemHealth>('/system/health'),

  createTestSos: (payload?: {
    category?: EmergencyCategory;
    risk_zone?: RiskZone;
    location_name?: string;
  }) =>
    apiFetch<Incident>('/testing/sos', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    }),
};
