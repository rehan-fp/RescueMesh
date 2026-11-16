import { Incident, RescueTeam, IoTDevice, UserAccount, TimelineEntry } from '../types';
import { calculateDecisionTreePriority } from '../utils/decisionTree';

export const INITIAL_OPERATOR: UserAccount = {
  id: 'USR-042',
  name: 'Fernando M N',
  email: 'fernando.op@rescuemesh.gov.lk',
  role: 'Emergency Operator',
  badgeNumber: 'RM-OPER-004',
  assignedDistrict: 'Western Province (Kelani River Basin)',
  station: 'Disaster Emergency Command Center',
  status: 'On Duty',
  lastLogin: '2026-08-19 20:30:12',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80'
};

export const ALL_USERS: UserAccount[] = [
  INITIAL_OPERATOR,
  {
    id: 'USR-010',
    name: 'Dr. Rohan Perera',
    email: 'rohan.perera@disastermgmt.gov.lk',
    role: 'Administrator',
    badgeNumber: 'DIR-001',
    assignedDistrict: 'National Command Center',
    station: 'Disaster Management Center HQ',
    status: 'Active',
    lastLogin: '2026-08-19 19:15:00'
  },
  {
    id: 'USR-025',
    name: 'Capt. Sarah Alwis',
    email: 'sarah.alwis@navy.rescuemesh.lk',
    role: 'Response Coordinator',
    badgeNumber: 'COORD-104',
    assignedDistrict: 'Kelani Basin Tactical Command',
    station: 'Kelaniya Forward Staging Base',
    status: 'On Duty',
    lastLogin: '2026-08-19 20:10:45'
  },
  {
    id: 'USR-088',
    name: 'Kavinda Jayasuriya',
    email: 'kavinda.j@redcross.lk',
    role: 'Viewer',
    badgeNumber: 'OBS-892',
    assignedDistrict: 'Western Province Sector 3',
    station: 'Western Sector Observation Terminal',
    status: 'Active',
    lastLogin: '2026-08-19 18:40:00'
  }
];

export const MOCK_USERS = ALL_USERS;

export const INITIAL_RESCUE_TEAMS: RescueTeam[] = [
  {
    id: 'TEAM-01',
    name: 'Medical Response Team 01',
    type: 'Medical',
    status: 'Assigned',
    currentIncidentId: 'RM-00188',
    currentIncidentCode: 'RM-00188',
    baseLocation: 'Kelaniya Base Hospital Staging Post',
    latitude: 7.2015,
    longitude: 79.8402,
    completedIncidentsToday: 8,
    lastUpdate: '2 mins ago',
    contactPhone: '+94 77 123 4501',
    teamLead: 'Dr. H. M. Wickramasinghe',
    currentAssignmentsCount: 1
  },
  {
    id: 'TEAM-02',
    name: 'Rescue Team 02 (Navy Boat Unit)',
    type: 'Boat Rescue',
    status: 'Assigned',
    currentIncidentId: 'RM-00185',
    currentIncidentCode: 'RM-00185',
    baseLocation: 'Sedawatta River Jetty',
    latitude: 7.2150,
    longitude: 79.8290,
    completedIncidentsToday: 12,
    lastUpdate: '4 mins ago',
    contactPhone: '+94 77 123 4502',
    teamLead: 'Lt. Cmdr. T. Silva',
    currentAssignmentsCount: 1
  },
  {
    id: 'TEAM-03',
    name: 'Rescue Team 03 (Swift Water Ops)',
    type: 'Boat Rescue',
    status: 'Available',
    baseLocation: 'Peliyagoda Tactical Base',
    latitude: 7.2280,
    longitude: 79.8510,
    completedIncidentsToday: 7,
    lastUpdate: '6 mins ago',
    contactPhone: '+94 77 123 4503',
    teamLead: 'Chief Insp. R. Bandara',
    currentAssignmentsCount: 0
  },
  {
    id: 'TEAM-04',
    name: 'Disaster Supply Unit 04',
    type: 'Supply Logistics',
    status: 'In Progress',
    currentIncidentId: 'RM-00186',
    currentIncidentCode: 'RM-00186',
    baseLocation: 'Wattala Disaster Logistics Hub',
    latitude: 7.2410,
    longitude: 79.8210,
    completedIncidentsToday: 5,
    lastUpdate: '9 mins ago',
    contactPhone: '+94 77 123 4504',
    teamLead: 'Logistics Off. A. Fonseka',
    currentAssignmentsCount: 1
  },
  {
    id: 'TEAM-05',
    name: 'Army Evacuation Squad 05',
    type: 'General Evacuation',
    status: 'In Progress',
    currentIncidentId: 'RM-00189',
    currentIncidentCode: 'RM-00189',
    baseLocation: 'Gampaha District Secretariat Post',
    latitude: 7.2190,
    longitude: 79.8650,
    completedIncidentsToday: 14,
    lastUpdate: '11 mins ago',
    contactPhone: '+94 77 123 4505',
    teamLead: 'Capt. N. Senanayake',
    currentAssignmentsCount: 1
  },
  {
    id: 'TEAM-06',
    name: 'Shelter & Relief Squad 06',
    type: 'Supply Logistics',
    status: 'Available',
    baseLocation: 'Kolonnawa Community Center',
    latitude: 7.1950,
    longitude: 79.8450,
    completedIncidentsToday: 4,
    lastUpdate: '15 mins ago',
    contactPhone: '+94 77 123 4506',
    teamLead: 'Coordinator Priyantha D.',
    currentAssignmentsCount: 0
  },
  {
    id: 'TEAM-07',
    name: 'Aero-Rescue Support 07',
    type: 'General Evacuation',
    status: 'Offline',
    baseLocation: 'Ratmalana Air Base (Standby)',
    latitude: 7.1700,
    longitude: 79.8300,
    completedIncidentsToday: 3,
    lastUpdate: '45 mins ago',
    contactPhone: '+94 77 123 4507',
    teamLead: 'Sq. Ldr. K. Mendis',
    currentAssignmentsCount: 0
  }
];

export const INITIAL_IOT_DEVICES: IoTDevice[] = [
  {
    id: 'GATEWAY_001',
    name: 'Communication Gateway - Kelaniya Central',
    type: 'Communication Gateway',
    status: 'Online',
    lastSeen: 'Now',
    firmware: 'v2.4.1-Rel',
    gateway: 'Connected',
    rssiDbm: -78,
    snrDb: 9.2,
    signalStrength: 'Excellent',
    latitude: 7.2105,
    longitude: 79.8390,
    location: 'Kelaniya Telecommunication Station',
    packetsTransmitted: 14890,
    frequencyBand: '433 MHz'
  },
  {
    id: 'GATEWAY_002',
    name: 'Communication Gateway - Sedawatta Hill',
    type: 'Communication Gateway',
    status: 'Online',
    lastSeen: '1 min ago',
    firmware: 'v2.4.1-Rel',
    gateway: 'Connected',
    rssiDbm: -82,
    snrDb: 8.4,
    signalStrength: 'Good',
    latitude: 7.2210,
    longitude: 79.8250,
    location: 'Sedawatta High Water Observation Mast',
    packetsTransmitted: 9420,
    frequencyBand: '433 MHz'
  },
  {
    id: 'NODE_001',
    name: 'Emergency Device 001',
    type: 'Emergency Device',
    status: 'Online',
    lastSeen: '2 min ago',
    firmware: 'v1.8.0',
    gateway: 'GATEWAY_001',
    rssiDbm: -88,
    snrDb: 7.1,
    signalStrength: 'Good',
    latitude: 7.2083,
    longitude: 79.8358,
    location: 'Taladuwa, Negombo, Gampaha District',
    packetsTransmitted: 412,
    lastIncidentId: 'RM-00184',
    frequencyBand: '433 MHz'
  },
  {
    id: 'NODE_002',
    name: 'Emergency Device 002',
    type: 'Emergency Device',
    status: 'Online',
    lastSeen: '4 min ago',
    firmware: 'v1.8.0',
    gateway: 'GATEWAY_001',
    rssiDbm: -94,
    snrDb: 6.0,
    signalStrength: 'Fair',
    latitude: 7.2162,
    longitude: 79.8310,
    location: 'Grandpass North Lowlands',
    packetsTransmitted: 388,
    lastIncidentId: 'RM-00185',
    frequencyBand: '433 MHz'
  },
  {
    id: 'NODE_003',
    name: 'Emergency Device 003',
    type: 'Emergency Device',
    status: 'Online',
    lastSeen: '7 min ago',
    firmware: 'v1.8.0',
    gateway: 'GATEWAY_002',
    rssiDbm: -90,
    snrDb: 6.8,
    signalStrength: 'Good',
    latitude: 7.2340,
    longitude: 79.8450,
    location: 'Gampaha Riverbank Sector A',
    packetsTransmitted: 275,
    lastIncidentId: 'RM-00186',
    frequencyBand: '433 MHz'
  },
  {
    id: 'NODE_004',
    name: 'Emergency Device 004',
    type: 'Emergency Device',
    status: 'Online',
    lastSeen: '14 min ago',
    firmware: 'v1.7.9',
    gateway: 'GATEWAY_002',
    rssiDbm: -101,
    snrDb: 4.2,
    signalStrength: 'Fair',
    latitude: 7.2270,
    longitude: 79.8180,
    location: 'Wattala Coastal Plain',
    packetsTransmitted: 190,
    lastIncidentId: 'RM-00187',
    frequencyBand: '433 MHz'
  },
  {
    id: 'NODE_005',
    name: 'Emergency Device 005',
    type: 'Emergency Device',
    status: 'Online',
    lastSeen: '22 min ago',
    firmware: 'v1.8.0',
    gateway: 'GATEWAY_001',
    rssiDbm: -86,
    snrDb: 7.5,
    signalStrength: 'Good',
    latitude: 7.2020,
    longitude: 79.8490,
    location: 'Kolonnawa Canal Inflow Gate',
    packetsTransmitted: 1240,
    lastIncidentId: 'RM-00188',
    frequencyBand: '433 MHz'
  },
  {
    id: 'NODE_006',
    name: 'Emergency Device 006',
    type: 'Emergency Device',
    status: 'Recently Seen',
    lastSeen: '28 min ago',
    firmware: 'v1.8.0',
    gateway: 'GATEWAY_002',
    rssiDbm: -109,
    snrDb: 2.1,
    signalStrength: 'Weak',
    latitude: 7.2480,
    longitude: 79.8580,
    location: 'Biyagama Industrial Zone Edge',
    packetsTransmitted: 154,
    lastIncidentId: 'RM-00189',
    frequencyBand: '433 MHz'
  },
  {
    id: 'NODE_007',
    name: 'Emergency Device 007',
    type: 'Emergency Device',
    status: 'Offline',
    lastSeen: '2 hours ago',
    firmware: 'v1.7.5',
    gateway: 'GATEWAY_001',
    rssiDbm: -120,
    snrDb: 0,
    signalStrength: 'Unavailable',
    latitude: 7.1910,
    longitude: 79.8220,
    location: 'Wellampitiya Bridge Outpost',
    packetsTransmitted: 98,
    frequencyBand: '433 MHz'
  }
];

function createSampleIncident(
  id: string,
  deviceId: string,
  category: Incident['category'],
  riskZone: Incident['riskZone'],
  lat: number,
  lng: number,
  locationName: string,
  timeStr: string,
  status: Incident['status'],
  nearbySosCount: number,
  requestAgeMinutes: number,
  assignedTeamId?: string,
  assignedTeamName?: string
): Incident {
  const { priority, factors } = calculateDecisionTreePriority({
    category,
    riskZone,
    nearbySosCount,
    requestAgeMinutes
  });

  const now = Date.now();
  const receivedDate = new Date(now - (requestAgeMinutes || 5) * 60 * 1000);
  const isoReceived = receivedDate.toISOString();
  const isoAck = new Date(receivedDate.getTime() + 2 * 60 * 1000).toISOString();
  const isoAssigned = new Date(receivedDate.getTime() + 5 * 60 * 1000).toISOString();
  const isoInProg = new Date(receivedDate.getTime() + 15 * 60 * 1000).toISOString();
  const isoResolved = new Date(receivedDate.getTime() + 45 * 60 * 1000).toISOString();

  const timeline: TimelineEntry[] = [
    {
      status: 'New',
      timestamp: isoReceived,
      operator: 'Emergency Communication System',
      note: `Emergency request received. Recommended Priority: ${priority}.`
    }
  ];

  if (status !== 'New') {
    timeline.push({
      status: 'Acknowledged',
      timestamp: isoAck,
      operator: 'Fernando M N',
      note: 'Incident acknowledged and placed in rescue queue.'
    });
  }

  if (status === 'Assigned' || status === 'In Progress' || status === 'Resolved') {
    timeline.push({
      status: 'Assigned',
      timestamp: isoAssigned,
      operator: 'Fernando M N',
      note: `Dispatched ${assignedTeamName || 'Rescue Team'}.`
    });
  }

  if (status === 'In Progress' || status === 'Resolved') {
    timeline.push({
      status: 'In Progress',
      timestamp: isoInProg,
      operator: assignedTeamName || 'Team Lead',
      note: 'Rescue unit reached coordinates. Operational assistance underway.'
    });
  }

  if (status === 'Resolved') {
    timeline.push({
      status: 'Resolved',
      timestamp: isoResolved,
      operator: 'Fernando M N',
      note: 'Affected group safely moved to higher-ground relief shelter. Incident closed.'
    });
  }

  return {
    id,
    deviceId,
    gatewayId: 'GATEWAY_001',
    category,
    latitude: lat,
    longitude: lng,
    locationName,
    riskZone,
    nearbySosCount,
    aiRecommendedPriority: priority,
    operationalPriority: priority,
    isOverridden: false,
    receivedTimestamp: isoReceived,
    receivedAt: isoReceived,
    sequenceNumber: parseInt(id.replace('RM-', ''), 10),
    status,
    assignedTeamId,
    assignedTeamName,
    assignedTimestamp: assignedTeamId ? isoAssigned : undefined,
    acknowledgedTimestamp: status !== 'New' ? isoAck : undefined,
    inProgressTimestamp: status === 'In Progress' || status === 'Resolved' ? isoInProg : undefined,
    resolvedTimestamp: status === 'Resolved' ? isoResolved : undefined,
    snrDb: 7.4,
    rssiDbm: -88,
    decisionTreeFactors: factors,
    timeline,
    isNewPulse: status === 'New'
  };
}

export const INITIAL_INCIDENTS: Incident[] = [
  createSampleIncident(
    'RM-00184',
    'NODE_001',
    'Medical',
    'High',
    7.2083,
    79.8358,
    'Taladuwa, Negombo, Gampaha District',
    '20:45',
    'New',
    6,
    2
  ),
  createSampleIncident(
    'RM-00185',
    'NODE_002',
    'Rescue',
    'High',
    7.2162,
    79.8310,
    'Grandpass North Lowlands',
    '20:41',
    'Assigned',
    4,
    6,
    'TEAM-02',
    'Rescue Team 02 (Navy Boat Unit)'
  ),
  createSampleIncident(
    'RM-00186',
    'NODE_003',
    'Food & Water',
    'High',
    7.2340,
    79.8450,
    'Gampaha Riverbank Sector A',
    '20:37',
    'In Progress',
    3,
    10,
    'TEAM-04',
    'Disaster Supply Unit 04'
  ),
  createSampleIncident(
    'RM-00187',
    'NODE_004',
    'Shelter',
    'Medium',
    7.2270,
    79.8180,
    'Wattala Coastal Plain',
    '20:29',
    'Acknowledged',
    1,
    18
  ),
  createSampleIncident(
    'RM-00188',
    'NODE_005',
    'Medical',
    'High',
    7.2020,
    79.8490,
    'Kolonnawa Canal Inflow Gate',
    '20:22',
    'Assigned',
    5,
    25,
    'TEAM-01',
    'Medical Response Team 01'
  ),
  createSampleIncident(
    'RM-00189',
    'NODE_006',
    'Rescue',
    'Medium',
    7.2480,
    79.8580,
    'Biyagama Industrial Zone Edge',
    '20:15',
    'In Progress',
    2,
    32,
    'TEAM-05',
    'Army Evacuation Squad 05'
  ),
  createSampleIncident(
    'RM-00190',
    'NODE_002',
    'Food & Water',
    'Medium',
    7.2190,
    79.8520,
    'Sedawatta East Highground',
    '20:04',
    'Resolved',
    1,
    43,
    'TEAM-06',
    'Shelter & Relief Squad 06'
  ),
  createSampleIncident(
    'RM-00191',
    'NODE_001',
    'Shelter',
    'Low',
    7.1950,
    79.8450,
    'Kolonnawa Community Perimeter',
    '19:48',
    'Resolved',
    0,
    59,
    'TEAM-06',
    'Shelter & Relief Squad 06'
  ),
  createSampleIncident(
    'RM-00192',
    'NODE_003',
    'Medical',
    'High',
    7.2110,
    79.8280,
    'Peliyagoda Market Flood Basin',
    '19:35',
    'Resolved',
    4,
    72,
    'TEAM-01',
    'Medical Response Team 01'
  )
];
