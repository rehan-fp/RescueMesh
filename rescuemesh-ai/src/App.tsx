import React, { useState } from 'react';
import { EmergencyProvider, useEmergency } from './context/EmergencyContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { MainDashboard } from './components/dashboard/MainDashboard';
import { LiveMapView } from './components/map/LiveMapView';
import { IncidentTable } from './components/incidents/IncidentTable';
import { TeamsView } from './components/teams/TeamsView';
import { ReportsView } from './components/reports/ReportsView';
import { DeviceMonitorView } from './components/devices/DeviceMonitorView';
import { UsersView } from './components/users/UsersView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginView } from './components/auth/LoginView';
import { IncidentDetailModal } from './components/incidents/IncidentDetailModal';
import { AssignTeamModal } from './components/incidents/AssignTeamModal';
import { EmergencyAlertBanner } from './components/common/EmergencyAlertBanner';
import { Incident } from './types';

const DashboardContent: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    selectedIncident,
    setSelectedIncident,
    isAuthenticated,
    isLoading,
    activeAlerts,
    currentTime,
    dismissAlert,
    dismissAllAlerts,
    acknowledgeIncident,
    setFocusedIncidentId,
  } = useEmergency();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [assignModalIncident, setAssignModalIncident] = useState<Incident | null>(null);

  const handleViewIncident = (inc: Incident) => {
    setFocusedIncidentId(inc.id);
    setSelectedIncident(inc);
  };

  // Require real JWT login before opening the operations console
  if (!isAuthenticated || activeTab === 'login') {
    return <LoginView onLoginSuccess={() => setActiveTab('dashboard')} />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-200 flex items-center justify-center text-sm">
        Connecting to RescueMesh Emergency System…
      </div>
    );
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <MainDashboard />;
      case 'live-map':
        return <LiveMapView />;
      case 'incidents':
        return <IncidentTable onOpenAssignModal={(inc) => setAssignModalIncident(inc)} />;
      case 'teams':
        return <TeamsView />;
      case 'reports':
        return <ReportsView />;
      case 'devices':
        return <DeviceMonitorView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <MainDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex text-slate-900 antialiased font-sans">
      {/* Primary Left Navigation Sidebar */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Operational Header */}
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Dynamic Scrollable Content Canvas */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {renderActiveView()}

          {/* Minimal Operational Footer */}
          <footer className="pt-6 pb-4 border-t border-slate-200 text-center text-xs text-slate-400 select-none">
            <p>© 2026 RescueMesh AI</p>
          </footer>
        </main>
      </div>

      {/* Global Modals for Universal Incident Triage */}
      <IncidentDetailModal
        incident={selectedIncident}
        isOpen={Boolean(selectedIncident)}
        onClose={() => setSelectedIncident(null)}
      />

      {assignModalIncident && (
        <AssignTeamModal
          incident={assignModalIncident}
          isOpen={Boolean(assignModalIncident)}
          onClose={() => setAssignModalIncident(null)}
        />
      )}

      {/* Priority-Aware Real-Time Emergency Notification Banner */}
      <EmergencyAlertBanner
        alerts={activeAlerts}
        currentTime={currentTime}
        onDismiss={dismissAlert}
        onDismissAll={dismissAllAlerts}
        onViewIncident={handleViewIncident}
        onAcknowledge={acknowledgeIncident}
      />
    </div>
  );
};

export function App() {
  return (
    <EmergencyProvider>
      <DashboardContent />
    </EmergencyProvider>
  );
}

export default App;
