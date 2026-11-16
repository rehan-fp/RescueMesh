import React from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { RescueMeshLogo } from '../common/RescueMeshLogo';
import {
  LayoutDashboard,
  MapPin,
  AlertTriangle,
  Users2,
  FileText,
  Radio,
  ShieldCheck,
  Settings,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  onCloseMobile
}) => {
  const { activeTab, setActiveTab, currentUser, logout, incidents } = useEmergency();

  const activeIncidentsCount = incidents.filter((i) => i.status !== 'Resolved').length;
  const criticalCount = incidents.filter(
    (i) => i.status !== 'Resolved' && i.operationalPriority === 'Critical'
  ).length;

  const navGroups = [
    {
      groupTitle: 'MAIN OPERATIONS',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: null
        },
        {
          id: 'live-map',
          label: 'Emergency Map',
          icon: MapPin,
          badge: criticalCount > 0 ? `${criticalCount}` : null,
          badgeType: 'critical'
        },
        {
          id: 'incidents',
          label: 'Incidents',
          icon: AlertTriangle,
          badge: activeIncidentsCount > 0 ? activeIncidentsCount : null,
          badgeType: 'info'
        },
        {
          id: 'teams',
          label: 'Response Teams',
          icon: Users2,
          badge: null
        }
      ]
    },
    {
      groupTitle: 'SYSTEM',
      items: [
        {
          id: 'devices',
          label: 'Communication Status',
          icon: Radio,
          badge: null
        },
        {
          id: 'reports',
          label: 'Reports & Analytics',
          icon: FileText,
          badge: null
        }
      ]
    },
    {
      groupTitle: 'ADMINISTRATION',
      items: [
        {
          id: 'users',
          label: 'Users & Access',
          icon: ShieldCheck,
          badge: null
        },
        {
          id: 'settings',
          label: 'Settings',
          icon: Settings,
          badge: null
        }
      ]
    }
  ];

  const handleNavClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 flex flex-col w-60 bg-[#0F172A] text-slate-200 border-r border-slate-800 transition-transform duration-200 ease-in-out select-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4.5 border-b border-slate-800/80">
          <RescueMeshLogo size="md" showText textColor="light" />
        </div>

        {/* Navigation List grouped */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto">
          {navGroups.map((group, groupIdx) => (
            <div key={groupIdx} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {group.groupTitle}
              </p>
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleNavClick(item.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-md cursor-pointer transition-colors text-xs font-medium ${
                      isActive
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          item.badgeType === 'critical'
                            ? 'bg-red-500/25 text-red-300 ring-1 ring-red-500/40'
                            : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Operator Profile Footer */}
        <div className="p-3.5 bg-[#020617] border-t border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-xs font-bold text-white overflow-hidden">
                {currentUser?.avatarUrl ? (
                  <img
                    src={currentUser.avatarUrl}
                    alt={currentUser.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  currentUser?.name.substring(0, 2).toUpperCase() || 'FM'
                )}
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-green-500 ring-2 ring-[#020617]" />
            </div>

            <div className="flex-1 overflow-hidden min-w-0">
              <p className="text-white text-xs font-semibold truncate leading-tight">
                {currentUser?.name || 'Fernando M N'}
              </p>
              <p className="text-slate-400 text-[10px] truncate">
                {currentUser?.role || 'Emergency Operator'}
              </p>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};
