import React, { useState, useRef, useEffect } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import {
  Bell,
  Volume2,
  VolumeX,
  Menu,
  Shield,
  Clock,
  ExternalLink,
  LogOut
} from 'lucide-react';
import { PriorityBadge, CategoryBadge } from '../common/Badges';
import { formatTimelineEventTimestamp, formatTimeOnly } from '../../utils/dateTime';

interface HeaderProps {
  onOpenMobileMenu?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenMobileMenu }) => {
  const {
    activeTab,
    notifications,
    unreadAlertCount,
    markNotificationRead,
    markAllNotificationsRead,
    audioEnabled,
    setAudioEnabled,
    realtimeStatus,
    systemStatus,
    currentUser,
    setSelectedIncident,
    incidents,
    currentTime,
    lastSyncTime,
    logout
  } = useEmergency();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getBreadcrumbTitle = () => {
    switch (activeTab) {
      case 'dashboard':
        return 'Operations Dashboard';
      case 'live-map':
        return 'Live Emergency Map';
      case 'incidents':
        return 'Incidents';
      case 'teams':
        return 'Response Teams';
      case 'reports':
        return 'Reports & Analytics';
      case 'devices':
        return 'Communication Status';
      case 'users':
        return 'Users & Access';
      case 'settings':
        return 'Settings';
      default:
        return 'Operations Dashboard';
    }
  };

  const handleNotificationClick = (incidentId?: string) => {
    setShowNotifications(false);
    if (incidentId) {
      const inc = incidents.find((i) => i.id === incidentId);
      if (inc) {
        setSelectedIncident(inc);
      }
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 md:px-8 flex items-center justify-between shrink-0 select-none z-20">
      {/* Left: Mobile Menu + Title + Breadcrumb */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="p-1.5 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <div className="flex items-center gap-2 sm:gap-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
              Flood Emergency Command Center
            </h2>
            <div className="hidden sm:block h-4 w-[1px] bg-slate-200 shrink-0" />
            <p className="hidden sm:block text-xs font-medium text-slate-500 truncate">
              {getBreadcrumbTitle()}
            </p>
          </div>
        </div>
      </div>

      {/* Right: Operational Status + Controls + Notifications + Profile */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Operational Timezone Clock */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100/80 border border-slate-200 text-slate-700 text-xs font-mono font-medium"
          title="Command Center Operational Time: Asia/Colombo (UTC+05:30)"
        >
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatTimeOnly(currentTime)} <span className="text-[10px] text-slate-500 font-sans font-semibold">IST (+05:30)</span></span>
        </div>

        {/* Single Clear Operational Status Badge */}
        {systemStatus === 'DEGRADED' ? (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold"
            title="System attention required: one or more operational subsystems degraded"
          >
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>System Attention Required</span>
          </div>
        ) : realtimeStatus === 'reconnecting' || realtimeStatus === 'disconnected' ? (
          <div
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold animate-pulse"
            title="Communication issue: attempting to reconnect to live emergency events..."
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Communication Issue</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>System Operational</span>
          </div>
        )}

        {/* Audio Alert Toggle */}
        <button
          onClick={() => setAudioEnabled(!audioEnabled)}
          className={`p-1.5 rounded-md border transition-colors cursor-pointer ${
            audioEnabled
              ? 'border-slate-200 text-slate-600 hover:bg-slate-50'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
          title={audioEnabled ? 'Alert sounds on' : 'Alert sounds muted'}
          aria-label={audioEnabled ? 'Alert sounds on' : 'Alert sounds muted'}
        >
          {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative text-slate-700 hover:text-slate-900 p-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadAlertCount > 0 && (
              <span className="absolute 0.5 top-0.5 right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[8px] font-bold text-white ring-2 ring-white">
                {unreadAlertCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Emergency Alerts
                  </h3>
                  {unreadAlertCount > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-red-100 text-red-700">
                      {unreadAlertCount} NEW
                    </span>
                  )}
                </div>
                {unreadAlertCount > 0 && (
                  <button
                    onClick={markAllNotificationsRead}
                    className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 text-xs">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-slate-500">No emergency alerts</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationRead(notif.id);
                        handleNotificationClick(notif.incidentId);
                      }}
                      className={`p-3 text-left transition-colors cursor-pointer hover:bg-slate-50 ${
                        !notif.isRead ? 'bg-blue-50/30' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900">{notif.title}</span>
                        {(() => {
                          const timeInfo = formatTimelineEventTimestamp(notif.timestamp, currentTime);
                          return (
                            <span className="text-[10px] text-slate-500 font-mono text-right shrink-0" title={timeInfo.exact}>
                              <span>{timeInfo.display}</span>
                              {timeInfo.relative && <span className="block text-blue-600 font-medium">({timeInfo.relative})</span>}
                            </span>
                          );
                        })()}
                      </div>
                      <p className="mt-0.5 text-slate-600 text-xs leading-relaxed">{notif.message}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CategoryBadge category={notif.category} size="sm" showIcon={false} />
                          <PriorityBadge priority={notif.priority} size="sm" />
                        </div>
                        <span className="text-[10px] text-blue-600 font-semibold flex items-center gap-0.5">
                          Inspect <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs border border-slate-200 cursor-pointer hover:border-slate-300 transition-colors"
            aria-label="User Profile"
          >
            {currentUser?.name.slice(0, 2).toUpperCase() || 'FM'}
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white border border-slate-200 shadow-xl z-50 p-3.5">
              <div className="pb-2.5 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{currentUser?.name}</p>
                <p className="text-[11px] text-slate-500">{currentUser?.email}</p>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                  <Shield className="w-3 h-3" />
                  <span>Role: {currentUser?.role} (Badge: {currentUser?.badgeNumber})</span>
                </div>
              </div>

              <div className="py-2.5 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px] text-slate-500">Assigned Center:</span>
                  <span className="font-semibold text-slate-800 text-right text-[11px] truncate max-w-[150px]">
                    {currentUser?.station || currentUser?.assignedDistrict || 'Disaster Emergency HQ'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px] text-slate-500">Badge ID:</span>
                  <span className="font-mono text-slate-800 font-semibold text-[11px]">
                    {currentUser?.badgeNumber || 'RM-OPER-001'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span className="text-[11px] text-slate-500">Account Status:</span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {currentUser?.status || 'Active'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[10px] text-slate-400">
                  <span>Last Sync: </span>
                  <span className="font-mono text-slate-700 font-semibold">{lastSyncTime}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
