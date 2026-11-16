export type EmergencyCategory = 'Medical' | 'Rescue' | 'Food & Water' | 'Shelter';

export type PriorityLevel = 'Critical' | 'High' | 'Medium' | 'Low';

export type IncidentStatus = 'New' | 'Acknowledged' | 'Assigned' | 'In Progress' | 'Resolved';

export type RiskZone = 'High' | 'Medium' | 'Low' | 'Unknown';

export type UserRole =
  | 'Administrator'
  | 'Emergency Operator'
  | 'Response Coordinator'
  | 'Rescue Coordinator' // legacy alias
  | 'Viewer';

export interface TimelineEntry {
  status: IncidentStatus;
  timestamp: string;
  operator: string;
  note?: string;
}

/** AI priority factor breakdown (Stage 1 baseline / Stage 4 TabPFN). */
export interface AiPriorityFactors {
  category: EmergencyCategory;
  categoryFactor: string;
  riskZone: RiskZone;
  riskZoneFactor: string;
  nearbySosCount: number;
  nearbyDensityFactor: string;
  requestAgeMinutes: number;
  ageFactor: string;
  explanation: string;
}

/** @deprecated Use AiPriorityFactors — kept for transitional UI references */
export type DecisionTreeFactors = AiPriorityFactors;

export interface Incident {
  id: string; // e.g. RM-00184
  deviceId: string; // e.g. NODE_001
  gatewayId: string; // e.g. GATEWAY_001
  category: EmergencyCategory;
  latitude: number | null;
  longitude: number | null;
  displayLatitude?: number | null;
  displayLongitude?: number | null;
  locationSource?: 'GPS_FIXED' | 'CONFIGURED_VENUE' | 'NO_FIX' | string;
  locationName: string;
  ingestionSource?: 'HARDWARE' | 'API_TEST' | 'SIMULATION';
  locality?: string;
  district?: string;
  locationResolvedAt?: string;
  riskZone: RiskZone;
  nearbySosCount: number;
  aiRecommendedPriority: PriorityLevel;
  operationalPriority: PriorityLevel;
  isOverridden: boolean;
  overrideReason?: string;
  overrideOperator?: string;
  overrideTimestamp?: string;
  receivedTimestamp: string;
  receivedAt?: string;
  sequenceNumber: number;
  status: IncidentStatus;
  assignedTeamId?: string;
  assignedTeamName?: string;
  assignedTimestamp?: string;
  acknowledgedTimestamp?: string;
  inProgressTimestamp?: string;
  resolvedTimestamp?: string;
  operatorNotes?: string;
  timeline: TimelineEntry[];
  snrDb: number;
  rssiDbm: number;
  battery?: number | null;
  gpsStatus?: boolean | null;
  aiPriorityFactors?: AiPriorityFactors;
  /** Transitional alias returned by API for older UI bindings */
  decisionTreeFactors: AiPriorityFactors;
  prioritySource?: string;
  aiModel?: string;
  aiPredictionTimestamp?: string;
  isNewPulse?: boolean;
}

export interface RescueTeam {
  id: string;
  name: string;
  type: 'Medical' | 'Boat Rescue' | 'Supply Logistics' | 'General Evacuation';
  status: 'Available' | 'Assigned' | 'In Progress' | 'Offline';
  currentIncidentId?: string;
  currentIncidentCode?: string;
  baseLocation: string;
  latitude: number;
  longitude: number;
  completedIncidentsToday: number;
  lastUpdate: string;
  contactPhone: string;
  teamLead: string;
  currentAssignmentsCount: number;
}

export interface IoTDevice {
  id: string;
  name: string;
  type: 'Emergency Device' | 'Communication Gateway' | 'Community Emergency Node' | 'ESP32 LoRa Gateway' | string;
  status: 'Online' | 'Recently Seen' | 'Offline';
  lastSeen: string;
  firmware: string;
  gateway: string;
  rssiDbm: number;
  snrDb: number;
  signalStrength: string;
  latitude: number;
  longitude: number;
  location: string;
  packetsTransmitted: number;
  lastIncidentId?: string;
  frequencyBand: string; // '433 MHz'
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  badgeNumber: string;
  assignedDistrict: string;
  status: 'Active' | 'On Duty' | 'Off Duty' | 'Disabled';
  lastLogin?: string | null;
  avatarUrl?: string;
  station?: string;
  stationId?: string;
  createdAt?: string | null;
}

export type UserProfile = UserAccount;

export interface FilterState {
  searchQuery: string;
  priority: string; // 'All' | PriorityLevel
  category: string; // 'All' | EmergencyCategory
  riskZone: string; // 'All' | RiskZone
  status: string; // 'All' | IncidentStatus
  assignedTeam: string; // 'All' | string
  timeRange: 'all' | '1h' | '6h' | '24h' | '7d';
}

export interface SystemNotification {
  id: string;
  incidentId?: string;
  title: string;
  message: string;
  category: EmergencyCategory;
  priority: PriorityLevel;
  timestamp: string;
  isRead: boolean;
}
