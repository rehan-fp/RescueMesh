/**
 * Real-time Server-Sent Events (SSE) Client for RescueMesh Dashboard.
 * 
 * Provides:
 * - Instantaneous push notifications for new emergencies (incident.created)
 * - Live workflow and priority updates (incident.updated)
 * - Automatic graceful reconnection with exponential backoff
 * - Missed-incident recovery triggers on reconnect
 * - Connection state tracking (connected, reconnecting, disconnected)
 */
import { getApiBaseUrl } from './api';

export type RealtimeConnectionState = 'connected' | 'reconnecting' | 'disconnected';

export interface IncidentCreatedEvent {
  incident_id: string;
  category: string;
  priority: string;
  ai_recommended_priority: string;
  status: string;
  location_name: string;
  locality?: string;
  district?: string;
  latitude: number | null;
  longitude: number | null;
  risk_zone: string;
  nearby_sos_count: number;
  received_at: string;
  sequence_number: number;
  ingestion_source?: string;
  incident: any;
}

export interface IncidentUpdatedEvent {
  incident_id: string;
  action: string;
  status: string;
  priority: string;
  assigned_team_id?: string;
  assigned_team_name?: string;
  is_overridden?: boolean;
  ingestion_source?: string;
  incident: any;
}

export type IncidentCreatedCallback = (event: IncidentCreatedEvent) => void;
export type IncidentUpdatedCallback = (event: IncidentUpdatedEvent) => void;
export type ConnectionStateCallback = (state: RealtimeConnectionState) => void;

class RealtimeEventManager {
  private eventSource: EventSource | null = null;
  private token: string | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private isIntentionallyClosed = false;
  private connectionState: RealtimeConnectionState = 'disconnected';

  private createdListeners: Set<IncidentCreatedCallback> = new Set();
  private updatedListeners: Set<IncidentUpdatedCallback> = new Set();
  private stateListeners: Set<ConnectionStateCallback> = new Set();

  public subscribeCreated(cb: IncidentCreatedCallback): () => void {
    this.createdListeners.add(cb);
    return () => this.createdListeners.delete(cb);
  }

  public subscribeUpdated(cb: IncidentUpdatedCallback): () => void {
    this.updatedListeners.add(cb);
    return () => this.updatedListeners.delete(cb);
  }

  public subscribeConnectionState(cb: ConnectionStateCallback): () => void {
    this.stateListeners.add(cb);
    cb(this.connectionState);
    return () => this.stateListeners.delete(cb);
  }

  public getConnectionState(): RealtimeConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: RealtimeConnectionState) {
    if (this.connectionState !== state) {
      this.connectionState = state;
      this.stateListeners.forEach((listener) => listener(state));
    }
  }

  public connect(token: string): void {
    if (!token) return;
    this.token = token;
    this.isIntentionallyClosed = false;
    this.startStream();
  }

  public disconnect(): void {
    this.isIntentionallyClosed = true;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.setConnectionState('disconnected');
    this.reconnectAttempt = 0;
  }

  private startStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (!this.token || this.isIntentionallyClosed) {
      return;
    }

    const baseUrl = getApiBaseUrl();
    if (!baseUrl) {
      console.warn('API base URL unavailable for real-time events');
      return;
    }

    const streamUrl = `${baseUrl}/events/stream?token=${encodeURIComponent(this.token)}`;

    try {
      this.setConnectionState(this.reconnectAttempt > 0 ? 'reconnecting' : 'disconnected');
      const es = new EventSource(streamUrl);
      this.eventSource = es;

      es.onopen = () => {
        this.reconnectAttempt = 0;
        this.setConnectionState('connected');
      };

      es.addEventListener('connected', () => {
        this.setConnectionState('connected');
      });

      es.addEventListener('incident.created', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          const data: IncidentCreatedEvent = parsed.data || parsed;
          this.createdListeners.forEach((listener) => listener(data));
        } catch (err) {
          console.error('Failed to parse incident.created event:', err);
        }
      });

      es.addEventListener('incident.updated', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          const data: IncidentUpdatedEvent = parsed.data || parsed;
          this.updatedListeners.forEach((listener) => listener(data));
        } catch (err) {
          console.error('Failed to parse incident.updated event:', err);
        }
      });

      es.onerror = () => {
        if (this.isIntentionallyClosed) return;
        es.close();
        this.eventSource = null;
        this.setConnectionState('reconnecting');
        this.scheduleReconnect();
      };
    } catch (err) {
      console.error('Failed to establish EventSource connection:', err);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isIntentionallyClosed || this.reconnectTimeout) return;

    // Exponential backoff: 1.5s, 3s, 6s, max 10s
    const backoff = Math.min(10000, 1500 * Math.pow(1.5, this.reconnectAttempt));
    this.reconnectAttempt++;

    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = null;
      if (!this.isIntentionallyClosed) {
        this.startStream();
      }
    }, backoff);
  }
}

export const realtimeEvents = new RealtimeEventManager();
