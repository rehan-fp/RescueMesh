import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';

// Ensure global L is available before leaflet.markercluster executes in browser
if (typeof window !== 'undefined' && !(window as any).L) {
  (window as any).L = L;
}
import 'leaflet.markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

import { Incident, RescueTeam, IoTDevice } from '../../types';
import { useEmergency } from '../../context/EmergencyContext';
import { MapLegend } from './MapLegend';
import { IncidentMapDetailCard } from './IncidentMapDetailCard';
import {
  createIndividualMarkerHtml,
  createClusterMarkerHtml,
  createIndividualTooltipHtml,
  createClusterTooltipHtml,
  getClusterSummary
} from './mapClusterUtils';
import { formatGpsCoordinates } from '../../utils/coordinates';
import { getStatusLabel, getCategoryLabel } from '../../utils/operationalLanguage';
import {
  Layers,
  Maximize2,
  Minimize2,
  Compass,
  Plus,
  Minus,
  Radio,
  ShieldCheck,
  Waves
} from 'lucide-react';

interface LeafletGisMapProps {
  heightClass?: string;
  isFullView?: boolean;
  onOpenAssignModal?: (incident: Incident) => void;
}

// Operational Center: Western Province / Colombo Metro General Operations
const DEFAULT_CENTER: [number, number] = [6.9271, 79.8612];
const DEFAULT_ZOOM = 12;

export const LeafletGisMap: React.FC<LeafletGisMapProps> = ({
  heightClass = 'h-[520px]',
  isFullView = false,
  onOpenAssignModal
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
  const incidentMarkerMapRef = useRef<Map<string, L.Marker>>(new Map());
  const teamsLayerRef = useRef<L.LayerGroup | null>(null);
  const gatewaysLayerRef = useRef<L.LayerGroup | null>(null);
  const floodZoneLayerRef = useRef<L.Polygon | null>(null);
  const initialFitDoneRef = useRef(false);

  const {
    incidents,
    rescueTeams,
    iotDevices,
    focusedIncidentId,
    setFocusedIncidentId,
    setSelectedIncident,
    acknowledgeIncident,
    filters
  } = useEmergency();

  const [activeMapIncident, setActiveMapIncident] = useState<Incident | null>(null);
  const [showFloodOverlay, setShowFloodOverlay] = useState(true);
  const [showTeams, setShowTeams] = useState(true);
  const [showGateways] = useState(false);
  const [showLegend, setShowLegend] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Complete deselection handler: clears local card, focused incident ID, and selected incident
  const handleDeselectIncident = useCallback(() => {
    setActiveMapIncident(null);
    setFocusedIncidentId(null);
    setSelectedIncident(null);
  }, [setFocusedIncidentId, setSelectedIncident]);

  // Support ESC key to unselect active incident
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDeselectIncident();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleDeselectIncident]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      attributionControl: false
    });

    // High quality OpenStreetMap standard carto tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      subdomains: ['a', 'b', 'c']
    }).addTo(map);

    // Dedicated layer panes ensuring strict hierarchy:
    // Base Tiles (200) < Flood Risk (350) < Teams (550) < Incident Markers (600)
    if (!map.getPane('floodRiskPane')) {
      const floodPane = map.createPane('floodRiskPane');
      floodPane.style.zIndex = '350';
    }
    if (!map.getPane('responseTeamsPane')) {
      const teamsPane = map.createPane('responseTeamsPane');
      teamsPane.style.zIndex = '550';
    }
    if (!map.getPane('incidentMarkersPane')) {
      const incidentPane = map.createPane('incidentMarkersPane');
      incidentPane.style.zIndex = '600';
    }

    // Prototype flood-risk zone (Kelani Basin corridor approximation for evaluation)
    const floodCoordinates: [number, number][] = [
      [6.935, 79.955],
      [6.945, 79.975],
      [6.930, 79.995],
      [6.905, 79.990],
      [6.895, 79.975],
      [6.900, 79.955],
      [6.915, 79.950]
    ];

    const floodPolygon = L.polygon(floodCoordinates, {
      pane: 'floodRiskPane',
      color: '#0284c7',
      fillColor: '#38bdf8',
      fillOpacity: 0.12,
      weight: 1.5,
      dashArray: '4, 4'
    }).addTo(map);

    floodPolygon.bindTooltip(
      '<div class="font-semibold text-xs text-sky-900">Prototype Flood-Risk Zone</div><div class="text-[10px] text-sky-700">Kelani Basin Corridor (Evaluation)</div>',
      { permanent: false, direction: 'center' }
    );

    floodZoneLayerRef.current = floodPolygon;

    // Professional Marker Clustering with Spiderfy for identical/close coordinates
    const clusterGroup = (L as any).markerClusterGroup({
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      spiderfyOnMaxZoom: true,
      spiderfyDistanceMultiplier: 1.6,
      maxClusterRadius: 45,
      clusterPane: 'incidentMarkersPane',
      iconCreateFunction: (cluster: any) => {
        const childMarkers = cluster.getAllChildMarkers();
        const clusterIncidents: Incident[] = childMarkers
          .map((m: any) => m.incidentData)
          .filter(Boolean);
        const summary = getClusterSummary(clusterIncidents);
        const html = createClusterMarkerHtml(summary.count, summary.highestPriority);
        return L.divIcon({
          html,
          className: 'custom-cluster-div-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
      }
    });

    clusterGroup.on('clustermouseover', (c: any) => {
      const childMarkers = c.layer.getAllChildMarkers();
      const clusterIncidents: Incident[] = childMarkers
        .map((m: any) => m.incidentData)
        .filter(Boolean);
      const summary = getClusterSummary(clusterIncidents);
      c.layer.bindTooltip(
        createClusterTooltipHtml(summary.count, summary.highestPriority, summary.breakdown),
        {
          direction: 'top',
          offset: [0, -18],
          className: 'custom-map-cluster-tooltip',
          opacity: 0.95
        }
      ).openTooltip();
    });

    clusterGroup.on('clustermouseout', (c: any) => {
      c.layer.closeTooltip();
      c.layer.unbindTooltip();
    });

    map.addLayer(clusterGroup);
    clusterGroupRef.current = clusterGroup;

    const teamsGroup = L.layerGroup().addTo(map);
    const gatewaysGroup = L.layerGroup().addTo(map);

    teamsLayerRef.current = teamsGroup;
    gatewaysLayerRef.current = gatewaysGroup;
    mapInstanceRef.current = map;

    // Dismiss active incident detail card and clear selection when clicking map background
    map.on('click', () => {
      handleDeselectIncident();
    });

    // Handle container resize
    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize();
    });
    resizeObserver.observe(mapContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapInstanceRef.current = null;
      clusterGroupRef.current = null;
    };
  }, []);

  // Update Flood Inundation Layer visibility
  useEffect(() => {
    if (!mapInstanceRef.current || !floodZoneLayerRef.current) return;
    if (showFloodOverlay) {
      floodZoneLayerRef.current.addTo(mapInstanceRef.current);
    } else {
      floodZoneLayerRef.current.remove();
    }
  }, [showFloodOverlay]);

  // Invalidate map size on fullscreen toggle
  useEffect(() => {
    const timer = setTimeout(() => {
      mapInstanceRef.current?.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [isFullscreen]);

  // Update Incidents Markers in Cluster Group
  useEffect(() => {
    if (!mapInstanceRef.current || !clusterGroupRef.current) return;

    clusterGroupRef.current.clearLayers();
    incidentMarkerMapRef.current.clear();

    // Filter incidents according to dashboard filters and strict hardware criteria
    const filtered = incidents.filter((inc) => {
      // Emergency Operations: only genuine HARDWARE incidents on the operational map
      if (inc.ingestionSource && inc.ingestionSource !== 'HARDWARE') return false;

      if (filters.priority !== 'All' && inc.operationalPriority !== filters.priority) return false;
      if (filters.category !== 'All' && inc.category !== filters.category) return false;
      if (filters.riskZone !== 'All' && inc.riskZone !== filters.riskZone) return false;
      if (filters.status !== 'All' && inc.status !== filters.status) return false;
      if (filters.searchQuery) {
        const q = filters.searchQuery.toLowerCase();
        const matches =
          inc.id.toLowerCase().includes(q) ||
          (inc.deviceId && inc.deviceId.toLowerCase().includes(q)) ||
          (inc.locationName && inc.locationName.toLowerCase().includes(q));
        if (!matches) return false;
      }
      return true;
    });

    const markersToAdd: L.Marker[] = [];

    filtered.forEach((incident) => {
      // Emergency Map coordinates: use configured display coordinates if available (e.g. CONFIGURED_VENUE during exhibition), otherwise authoritative GPS
      const markerLat = incident.displayLatitude != null ? incident.displayLatitude : incident.latitude;
      const markerLng = incident.displayLongitude != null ? incident.displayLongitude : incident.longitude;

      if (
        markerLat == null ||
        markerLng == null ||
        isNaN(Number(markerLat)) ||
        isNaN(Number(markerLng)) ||
        (markerLat === 0 && markerLng === 0)
      ) {
        return;
      }

      const isCritical = incident.operationalPriority === 'Critical';
      const isNew = incident.status === 'New';
      const isFocused = incident.id === focusedIncidentId || incident.id === activeMapIncident?.id;

      const customIcon = L.divIcon({
        html: createIndividualMarkerHtml(incident, isFocused, isCritical || isNew),
        className: 'custom-individual-marker',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      // Marker uses configured display coordinates or exact hardware coordinates — never mutated or jittered
      const marker = L.marker([markerLat, markerLng], {
        icon: customIcon,
        pane: 'incidentMarkersPane',
        zIndexOffset: isFocused ? 1000 : 0
      });

      // Attach data reference for cluster aggregation
      (marker as any).incidentData = incident;

      // Clean non-intrusive tooltip on hover
      marker.bindTooltip(createIndividualTooltipHtml(incident), {
        direction: 'top',
        offset: [0, -17],
        className: 'custom-map-individual-tooltip',
        opacity: 0.95
      });

      // Selection opens compact floating detail card / mobile bottom sheet
      marker.on('click', (e: L.LeafletMouseEvent) => {
        L.DomEvent.stopPropagation(e);
        setActiveMapIncident(incident);
        setFocusedIncidentId(incident.id);

        // Intelligent panning so marker and detail card remain visible simultaneously
        if (mapInstanceRef.current) {
          const map = mapInstanceRef.current;
          const pt = map.latLngToContainerPoint([markerLat, markerLng]);
          const size = map.getSize();

          if (typeof window !== 'undefined' && window.innerWidth >= 640) {
            // Desktop side card sits top-right (width ~320px, height ~340px)
            if (pt.x > size.x - 360 && pt.y < 360) {
              map.panBy([-180, 100], { animate: true, duration: 0.3 });
            }
          } else {
            // Mobile bottom sheet sits at bottom (height ~40%)
            if (pt.y > size.y * 0.6) {
              map.panBy([0, 120], { animate: true, duration: 0.3 });
            }
          }
        }
      });

      incidentMarkerMapRef.current.set(incident.id, marker);
      markersToAdd.push(marker);
    });

    clusterGroupRef.current.addLayers(markersToAdd);
  }, [incidents, filters, setFocusedIncidentId]);

  // Update selected/focused marker visual highlight in-place without destroying spiderfy state
  useEffect(() => {
    if (!incidentMarkerMapRef.current) return;
    incidentMarkerMapRef.current.forEach((marker, id) => {
      const inc = (marker as any).incidentData as Incident;
      if (!inc) return;
      const isSelected = id === activeMapIncident?.id || id === focusedIncidentId;
      const isCritical = inc.operationalPriority === 'Critical';
      const isNew = inc.status === 'New';

      const icon = L.divIcon({
        html: createIndividualMarkerHtml(inc, isSelected, isCritical || isNew),
        className: 'custom-individual-marker',
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });
      marker.setIcon(icon);
      marker.setZIndexOffset(isSelected ? 1000 : 0);
    });
  }, [activeMapIncident?.id, focusedIncidentId]);

  // Keep activeMapIncident synchronized if external status or assignment changes
  useEffect(() => {
    if (!activeMapIncident) return;
    const fresh = incidents.find((i) => i.id === activeMapIncident.id);
    if (fresh && fresh !== activeMapIncident) {
      setActiveMapIncident(fresh);
    }
  }, [incidents, activeMapIncident]);

  // Update Rescue Teams Markers in dedicated teams pane
  useEffect(() => {
    if (!mapInstanceRef.current || !teamsLayerRef.current) return;

    teamsLayerRef.current.clearLayers();

    if (!showTeams) return;

    rescueTeams.forEach((team) => {
      if (
        typeof team.latitude !== 'number' ||
        typeof team.longitude !== 'number' ||
        isNaN(team.latitude) ||
        isNaN(team.longitude)
      ) {
        return;
      }

      const isResponding = team.status === 'Assigned' || team.status === 'In Progress';
      const teamColor = isResponding ? '#2563eb' : team.status === 'Available' ? '#059669' : '#64748b';

      const iconHtml = `
        <div class="relative flex items-center justify-center cursor-pointer group" style="width: 28px; height: 28px;">
          <div class="w-6 h-6 rounded bg-slate-900 text-white flex items-center justify-center shadow-md border-2 border-white text-[10px] font-bold" style="background-color: ${teamColor};">
            ⚓
          </div>
        </div>
      `;

      const teamIcon = L.divIcon({
        html: iconHtml,
        className: 'custom-leaflet-marker',
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        popupAnchor: [0, -14]
      });

      const marker = L.marker([team.latitude, team.longitude], {
        icon: teamIcon,
        pane: 'responseTeamsPane'
      });

      const displayStatus = team.status === 'In Progress' ? 'Responding' : team.status;

      marker.bindPopup(`
        <div class="p-1 min-w-[210px] text-xs font-sans">
          <div class="font-bold text-slate-900 border-b pb-1 flex items-center justify-between">
            <span>${team.name}</span>
            <span class="text-[10px] text-slate-500">${team.type}</span>
          </div>
          <div class="mt-1 space-y-0.5 text-slate-600">
            <div><span class="font-medium text-slate-500">Status:</span> <span class="font-semibold ${isResponding ? 'text-blue-700' : 'text-emerald-700'}">${displayStatus}</span></div>
            <div><span class="font-medium text-slate-500">Base:</span> ${team.baseLocation}</div>
            ${team.teamLead ? `<div><span class="font-medium text-slate-500">Lead:</span> ${team.teamLead}</div>` : ''}
            ${team.contactPhone ? `<div><span class="font-medium text-slate-500">Phone:</span> ${team.contactPhone}</div>` : ''}
            ${
              team.currentIncidentCode
                ? `<div class="mt-1 pt-1 border-t text-blue-700 font-semibold">Responding to: ${team.currentIncidentCode}</div>`
                : ''
            }
          </div>
        </div>
      `);

      teamsLayerRef.current?.addLayer(marker);
    });
  }, [rescueTeams, showTeams]);

  // Communication Gateways (Disabled by default from primary operator view)
  useEffect(() => {
    if (!mapInstanceRef.current || !gatewaysLayerRef.current) return;

    gatewaysLayerRef.current.clearLayers();

    if (!showGateways) return;

    iotDevices
      .filter((d) => d.type.includes('Gateway'))
      .forEach((gw) => {
        const iconHtml = `
          <div class="w-5 h-5 rounded-full bg-slate-800 border-2 border-white shadow flex items-center justify-center text-[9px] text-white">
            📡
          </div>
        `;
        const gwIcon = L.divIcon({
          html: iconHtml,
          className: 'custom-leaflet-marker',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        const marker = L.marker([gw.latitude, gw.longitude], {
          icon: gwIcon,
          pane: 'responseTeamsPane'
        });
        marker.bindPopup(`
          <div class="p-1 min-w-[180px] text-xs font-sans">
            <div class="font-bold text-slate-900">${gw.name}</div>
            <p class="text-slate-500 text-[11px]">${gw.location}</p>
            <div class="mt-1 text-emerald-700 font-semibold text-[10px]">Communication Gateway • Connected</div>
          </div>
        `);
        gatewaysLayerRef.current?.addLayer(marker);
      });
  }, [iotDevices, showGateways]);

  // Focus on incident if focusedIncidentId changes (expands cluster/spiderfy if needed)
  useEffect(() => {
    if (!focusedIncidentId || !mapInstanceRef.current) return;
    const target = incidents.find((i) => i.id === focusedIncidentId);
    if (!target) return;
    const targetLat = target.displayLatitude != null ? target.displayLatitude : target.latitude;
    const targetLng = target.displayLongitude != null ? target.displayLongitude : target.longitude;
    if (
      targetLat != null &&
      targetLng != null &&
      !isNaN(Number(targetLat)) &&
      !isNaN(Number(targetLng)) &&
      (targetLat !== 0 || targetLng !== 0)
    ) {
      setActiveMapIncident(target);
      const marker = incidentMarkerMapRef.current.get(target.id);
      if (clusterGroupRef.current && marker) {
        clusterGroupRef.current.zoomToShowLayer(marker, () => {
          // Marker unclustered and spiderfied if overlapping
        });
      } else {
        mapInstanceRef.current.flyTo([targetLat, targetLng], 15, {
          animate: true,
          duration: 0.8
        });
      }
    }
  }, [focusedIncidentId, incidents]);

  // Dynamically fit map bounds to active incidents on initial load
  useEffect(() => {
    if (!mapInstanceRef.current || incidents.length === 0 || initialFitDoneRef.current) return;
    const validCoords = incidents
      .map((i) => {
        const lat = i.displayLatitude != null ? i.displayLatitude : i.latitude;
        const lng = i.displayLongitude != null ? i.displayLongitude : i.longitude;
        return [lat, lng];
      })
      .filter(
        ([lat, lng]) =>
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          !isNaN(lat) &&
          !isNaN(lng) &&
          (lat !== 0 || lng !== 0)
      ) as [number, number][];
    if (validCoords.length > 0) {
      initialFitDoneRef.current = true;
      const bounds = L.latLngBounds(validCoords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [incidents]);

  const handleResetView = () => {
    if (!mapInstanceRef.current) return;
    const validCoords = incidents
      .map((i) => {
        const lat = i.displayLatitude != null ? i.displayLatitude : i.latitude;
        const lng = i.displayLongitude != null ? i.displayLongitude : i.longitude;
        return [lat, lng];
      })
      .filter(
        ([lat, lng]) =>
          typeof lat === 'number' &&
          typeof lng === 'number' &&
          !isNaN(lat) &&
          !isNaN(lng) &&
          (lat !== 0 || lng !== 0)
      ) as [number, number][];
    if (validCoords.length > 0) {
      const bounds = L.latLngBounds(validCoords);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    } else {
      mapInstanceRef.current.flyTo(DEFAULT_CENTER, DEFAULT_ZOOM, {
        animate: true,
        duration: 0.6
      });
    }
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  return (
    <div
      className={`relative w-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-xs ${
        isFullscreen ? 'fixed inset-4 z-50 h-[calc(100vh-2rem)]' : heightClass
      }`}
    >
      {/* Top Map Header Controls Bar - Responsive flex layout preventing overlap */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-center gap-2 pointer-events-auto bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs text-xs">
          <span className="flex items-center gap-1.5 font-bold text-slate-900">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            Emergency Map View
          </span>
          <span className="text-slate-300 hidden sm:inline">|</span>
          <span className="text-slate-600 font-medium hidden sm:inline">
            Western Province Operational Area
          </span>
        </div>

        {/* Layer Toggles & Fullscreen */}
        <div className="flex items-center gap-1.5 pointer-events-auto bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-xs text-xs">
          <button
            type="button"
            onClick={() => setShowFloodOverlay(!showFloodOverlay)}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              showFloodOverlay
                ? 'bg-sky-100 text-sky-800 border border-sky-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Flood Risk Inundation Polygon"
          >
            <Waves className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Flood Risk</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTeams(!showTeams)}
            className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
              showTeams
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
            title="Toggle Response Teams"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Response Teams ({rescueTeams.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setShowLegend(!showLegend)}
            className={`p-1 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer`}
            title="Toggle Priority Legend"
            aria-label="Toggle Legend"
          >
            <Layers className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1 rounded text-xs font-medium text-slate-700 hover:bg-slate-100 cursor-pointer"
            title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
            aria-label="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Floating Map Zoom & Navigation Controls */}
      <div className="absolute bottom-4 right-4 z-[400] flex flex-col gap-1.5 bg-white/95 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-md">
        <button
          type="button"
          onClick={handleZoomIn}
          className="p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded transition-colors cursor-pointer"
          title="Zoom In"
          aria-label="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          className="p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded transition-colors cursor-pointer"
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <div className="h-px bg-slate-200 my-0.5" />
        <button
          type="button"
          onClick={handleResetView}
          className="p-2 text-slate-700 hover:bg-slate-100 hover:text-slate-900 rounded transition-colors cursor-pointer"
          title="Fit to Incidents"
          aria-label="Fit to Incidents"
        >
          <Compass className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Legend Overlay */}
      {showLegend && (
        <div className="absolute bottom-4 left-4 z-[400]">
          <MapLegend />
        </div>
      )}

      {/* Floating Detail Card / Mobile Bottom Sheet for Selected Incident */}
      {activeMapIncident && (
        <IncidentMapDetailCard
          incident={activeMapIncident}
          onClose={handleDeselectIncident}
          onViewDetails={(inc) => {
            setSelectedIncident(inc);
          }}
          onAssignTeam={onOpenAssignModal ? (inc) => onOpenAssignModal(inc) : undefined}
          onAcknowledge={(id) => acknowledgeIncident(id)}
        />
      )}

      {/* Actual Leaflet Container */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
