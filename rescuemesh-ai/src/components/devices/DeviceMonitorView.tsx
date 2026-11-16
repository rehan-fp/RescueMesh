import React, { useState, useMemo } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { IoTDevice } from '../../types';
import { formatGpsCoordinates } from '../../utils/coordinates';
import {
  getDeviceDisplayName,
  getDevicePurpose,
  getDeviceLocation,
  getDeviceSignalQuality,
  computeDeviceOperationalStatus,
  DeviceOperationalStatus
} from '../../utils/deviceCommunication';
import {
  Radio,
  Search,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Cpu,
  Info,
  CheckCircle2,
  Clock,
  Battery,
  MapPin,
  Signal,
  AlertTriangle,
  X,
  ShieldCheck,
  Activity
} from 'lucide-react';

export const DeviceMonitorView: React.FC = () => {
  const { iotDevices, incidents, setSelectedIncident, currentTime } = useEmergency();
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Connected' | 'Needs Attention' | 'Offline'>('All');
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState<boolean>(false);

  // Compute operational status for each device
  const deviceStatusMap = useMemo(() => {
    const map = new Map<string, DeviceOperationalStatus>();
    for (const dev of iotDevices) {
      map.set(dev.id, computeDeviceOperationalStatus(dev, incidents, currentTime));
    }
    return map;
  }, [iotDevices, incidents, currentTime]);

  // Summary KPI counts
  const summaryCounts = useMemo(() => {
    let connected = 0;
    let needsAttention = 0;
    let offline = 0;

    for (const [, op] of deviceStatusMap.entries()) {
      if (op.status === 'Connected') connected += 1;
      else if (op.status === 'Needs Attention') needsAttention += 1;
      else offline += 1;
    }

    return {
      total: iotDevices.length,
      connected,
      needsAttention,
      offline
    };
  }, [iotDevices.length, deviceStatusMap]);

  // Filter devices
  const filteredDevices = useMemo(() => {
    return iotDevices.filter((dev) => {
      const op = deviceStatusMap.get(dev.id);
      if (statusFilter !== 'All' && op?.status !== statusFilter) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const displayName = getDeviceDisplayName(dev).toLowerCase();
        const purpose = getDevicePurpose(dev).toLowerCase();
        const loc = getDeviceLocation(dev, op?.linkedIncident).toLowerCase();
        const incidentId = dev.lastIncidentId?.toLowerCase() || '';

        return (
          displayName.includes(q) ||
          dev.id.toLowerCase().includes(q) ||
          purpose.includes(q) ||
          loc.includes(q) ||
          incidentId.includes(q)
        );
      }

      return true;
    });
  }, [iotDevices, deviceStatusMap, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Emergency Communication Status
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Monitor emergency devices and communication availability.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Communication Network Operational</span>
          </span>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {/* TOTAL DEVICES */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            TOTAL DEVICES
          </span>
          <span className="text-3xl font-black text-slate-900 font-mono mt-1 block">
            {summaryCounts.total}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            Active communication units
          </span>
        </div>

        {/* CONNECTED */}
        <div className="bg-white p-4.5 rounded-xl border border-emerald-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            CONNECTED
          </span>
          <span className="text-3xl font-black text-emerald-700 font-mono mt-1 block">
            {summaryCounts.connected}
          </span>
          <span className="text-[11px] text-emerald-700 font-medium mt-1 block">
            {summaryCounts.connected === summaryCounts.total && summaryCounts.total > 0
              ? 'All communication devices are responding.'
              : `${summaryCounts.connected} devices communicating normally`}
          </span>
        </div>

        {/* NEEDS ATTENTION */}
        <div className="bg-white p-4.5 rounded-xl border border-amber-200/80 shadow-xs">
          <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider block">
            NEEDS ATTENTION
          </span>
          <span className="text-3xl font-black text-amber-600 font-mono mt-1 block">
            {summaryCounts.needsAttention}
          </span>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">
            {summaryCounts.needsAttention === 0
              ? 'No communication issues detected.'
              : `${summaryCounts.needsAttention} units delayed or intermittent`}
          </span>
        </div>

        {/* OFFLINE */}
        <div className="bg-white p-4.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            OFFLINE
          </span>
          <span className="text-3xl font-black text-slate-700 font-mono mt-1 block">
            {summaryCounts.offline}
          </span>
          <span className="text-[11px] text-slate-500 font-medium mt-1 block">
            {summaryCounts.offline === 0 ? 'No devices offline' : `${summaryCounts.offline} inactive units`}
          </span>
        </div>
      </div>

      {/* Search & Problem-Oriented Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by device name, location, or active emergency..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
          />
        </div>

        {/* Problem-oriented status filter */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs" role="tablist">
          {(['All', 'Connected', 'Needs Attention', 'Offline'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                statusFilter === filter
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Desktop Device Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-semibold text-[11px] tracking-wider">
              <tr>
                <th className="px-4 py-3.5">DEVICE</th>
                <th className="px-4 py-3.5">PURPOSE</th>
                <th className="px-4 py-3.5">STATUS</th>
                <th className="px-4 py-3.5">LOCATION</th>
                <th className="px-4 py-3.5">CONNECTION</th>
                <th className="px-4 py-3.5">SIGNAL</th>
                <th className="px-4 py-3.5">LAST CONTACT</th>
                <th className="px-4 py-3.5 text-center">ACTIVE EMERGENCY</th>
                <th className="px-4 py-3.5 text-right">DETAILS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No communication devices match this filter.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Adjust search query or select "All" above.</p>
                  </td>
                </tr>
              ) : (
                filteredDevices.map((dev) => {
                  const op = deviceStatusMap.get(dev.id)!;
                  const displayName = getDeviceDisplayName(dev);
                  const purpose = getDevicePurpose(dev);
                  const location = getDeviceLocation(dev, op.linkedIncident);
                  const signal = getDeviceSignalQuality(dev.rssiDbm, dev.snrDb);

                  return (
                    <tr key={dev.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* DEVICE */}
                      <td className="px-4 py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              op.status === 'Connected'
                                ? 'bg-emerald-500'
                                : op.status === 'Needs Attention'
                                ? 'bg-amber-500 animate-pulse'
                                : 'bg-slate-400'
                            }`}
                          />
                          <span>{displayName}</span>
                        </div>
                      </td>

                      {/* PURPOSE */}
                      <td className="px-4 py-3.5">
                        <span className="text-[11px] font-medium text-slate-600">
                          {purpose}
                        </span>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded border ${op.statusBadgeClass}`}
                        >
                          {op.status}
                        </span>
                      </td>

                      {/* LOCATION */}
                      <td className="px-4 py-3.5 max-w-[180px]">
                        <span className="font-medium text-slate-800 truncate block flex items-center gap-1" title={location}>
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{location}</span>
                        </span>
                      </td>

                      {/* CONNECTION */}
                      <td className="px-4 py-3.5 text-slate-700">
                        <span className="font-medium text-xs">
                          {op.connectionLabel}
                        </span>
                      </td>

                      {/* SIGNAL */}
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1.5 ${signal.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${signal.dotColor}`} />
                          <span>{signal.label}</span>
                        </span>
                      </td>

                      {/* LAST CONTACT */}
                      <td className="px-4 py-3.5 text-slate-600">
                        <span title={op.exactLastContact} className="cursor-help">
                          {op.relativeLastContact}
                        </span>
                      </td>

                      {/* ACTIVE EMERGENCY */}
                      <td className="px-4 py-3.5 text-center">
                        {op.linkedIncident && op.isEmergencyActive ? (
                          <button
                            type="button"
                            onClick={() => setSelectedIncident(op.linkedIncident)}
                            className="font-mono font-bold text-blue-600 hover:text-blue-800 text-xs inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 border border-blue-200 cursor-pointer"
                            title="Open emergency triage modal"
                          >
                            <span>{op.linkedIncident.id}</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        ) : (
                          <span className="text-slate-400 font-mono">—</span>
                        )}
                      </td>

                      {/* DETAILS */}
                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedDevice(dev);
                            setShowTechnicalDetails(false);
                          }}
                          className="text-blue-600 hover:text-blue-800 font-semibold px-2.5 py-1 rounded hover:bg-blue-50 transition-colors cursor-pointer text-xs"
                        >
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Device Cards View (< 768px) */}
      <div className="space-y-3 md:hidden">
        {filteredDevices.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
            <Radio className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700 text-xs">No communication devices match this filter.</p>
            <p className="text-[11px] text-slate-400 mt-1">Adjust search query or select "All" above.</p>
          </div>
        ) : (
          filteredDevices.map((dev) => {
            const op = deviceStatusMap.get(dev.id)!;
            const displayName = getDeviceDisplayName(dev);
            const purpose = getDevicePurpose(dev);
            const location = getDeviceLocation(dev, op.linkedIncident);
            const signal = getDeviceSignalQuality(dev.rssiDbm, dev.snrDb);

            return (
              <div
                key={dev.id}
                className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        op.status === 'Connected'
                          ? 'bg-emerald-500'
                          : op.status === 'Needs Attention'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span className="font-bold text-slate-900 text-xs">{displayName}</span>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded border ${op.statusBadgeClass}`}
                  >
                    {op.status}
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1">
                  <p className="font-medium text-slate-700">{purpose}</p>
                  <p className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{location}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${signal.badgeClass}`}>
                    Signal: {signal.label}
                  </span>

                  <span className="text-[11px] text-slate-500">
                    {op.relativeLastContact}
                  </span>
                </div>

                <div className="pt-1 flex items-center justify-between gap-2">
                  {op.linkedIncident && op.isEmergencyActive ? (
                    <button
                      type="button"
                      onClick={() => setSelectedIncident(op.linkedIncident)}
                      className="font-mono font-bold text-blue-600 text-[11px] inline-flex items-center gap-1 px-2 py-1 rounded bg-blue-50 border border-blue-200"
                    >
                      <span>Emergency: {op.linkedIncident.id}</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400">No active emergency</span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedDevice(dev);
                      setShowTechnicalDetails(false);
                    }}
                    className="text-xs font-semibold px-3 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
                  >
                    Details
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Device Detail Modal with Collapsible Technical Details */}
      {selectedDevice && (() => {
        const op = deviceStatusMap.get(selectedDevice.id)!;
        const displayName = getDeviceDisplayName(selectedDevice);
        const purpose = getDevicePurpose(selectedDevice);
        const location = getDeviceLocation(selectedDevice, op.linkedIncident);
        const signal = getDeviceSignalQuality(selectedDevice.rssiDbm, selectedDevice.snrDb);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95">
              {/* Modal Header */}
              <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Radio className="w-4 h-4 text-blue-400" />
                  <div>
                    <h3 className="font-bold text-sm text-white">{displayName}</h3>
                    <p className="text-[11px] text-slate-400">{purpose}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDevice(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-md"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Clean Operator Information */}
              <div className="p-5 space-y-4 text-xs">
                {/* Status & Signal Row */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Communication Status
                    </span>
                    <span className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded text-[11px] font-bold border ${op.statusBadgeClass}`}>
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          op.status === 'Connected' ? 'bg-emerald-500' : op.status === 'Needs Attention' ? 'bg-amber-500' : 'bg-slate-400'
                        }`}
                      />
                      <span>{op.status}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Signal Quality
                    </span>
                    <span className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded text-[11px] font-bold border ${signal.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${signal.dotColor}`} />
                      <span>{signal.label}</span>
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Battery Level
                    </span>
                    <span className="font-bold text-slate-900 mt-1 flex items-center gap-1">
                      <Battery className="w-3.5 h-3.5 text-slate-500" />
                      <span>{op.batteryPercentage != null ? `${op.batteryPercentage}%` : 'Station Powered'}</span>
                    </span>
                  </div>
                </div>

                {/* Location & Last Contact */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-medium">Device Location:</span>
                    <span className="font-bold text-slate-900 text-right">{location}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-slate-500 font-medium">Last Contact:</span>
                    <div className="text-right">
                      <span className="font-bold text-slate-900 block">{op.relativeLastContact}</span>
                      <span className="text-[10px] text-slate-500 block">{op.exactLastContact}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-slate-200/60">
                    <span className="text-slate-500 font-medium">Active Emergency:</span>
                    {op.linkedIncident && op.isEmergencyActive ? (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDevice(null);
                          setSelectedIncident(op.linkedIncident);
                        }}
                        className="font-mono font-bold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>{op.linkedIncident.id} ({op.linkedIncident.operationalPriority})</span>
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </div>
                </div>

                {/* Collapsible Technical Details Section */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
                    className="w-full px-3.5 py-2.5 bg-slate-100/70 hover:bg-slate-100 flex items-center justify-between text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-slate-500" />
                      <span>Technical Details (Engineering & Diagnostics)</span>
                    </span>
                    {showTechnicalDetails ? (
                      <ChevronDown className="w-4 h-4 text-slate-500" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>

                  {showTechnicalDetails && (
                    <div className="p-3.5 bg-white space-y-2 text-xs border-t border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Hardware Identifier:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedDevice.id}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Hardware Model:</span>
                        <span className="font-medium text-slate-800">{selectedDevice.type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Radio Frequency:</span>
                        <span className="font-mono text-slate-800">{selectedDevice.frequencyBand || '433.0 MHz'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Signal Strength (RSSI):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {selectedDevice.rssiDbm != null ? `${selectedDevice.rssiDbm} dBm` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Signal-to-Noise Ratio (SNR):</span>
                        <span className="font-mono font-semibold text-slate-900">
                          {selectedDevice.snrDb != null ? `+${selectedDevice.snrDb} dB` : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Total Transmissions:</span>
                        <span className="font-mono text-slate-900">{selectedDevice.packetsTransmitted || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500 font-medium">Gateway Uplink:</span>
                        <span className="font-mono text-slate-800">{selectedDevice.gateway || 'GATEWAY_001'}</span>
                      </div>
                      <div className="pt-1 border-t border-slate-100 flex justify-between">
                        <span className="text-slate-500 font-medium">GPS Coordinates:</span>
                        <span className="font-mono text-slate-900 font-semibold">
                          {formatGpsCoordinates(selectedDevice.latitude, selectedDevice.longitude, 6)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedDevice(null)}
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
