import React, { useState, useEffect } from 'react';
import { useEmergency } from '../../context/EmergencyContext';
import { playEmergencyAlert, playSuccessSound } from '../../utils/audio';
import { api } from '../../utils/api';
import { getSavedPreferences, savePreferences, OperatorPreferences } from '../../utils/preferences';
import {
  Settings,
  Volume2,
  VolumeX,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Key,
  Shield,
  Save,
  Radio,
  Activity,
  Check,
  X,
  User,
  Building2,
  Mail,
  Info
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    audioEnabled,
    setAudioEnabled,
    systemStatus,
    realtimeStatus,
    lastSyncTime
  } = useEmergency();

  // Operator preferences state
  const [preferences, setPreferences] = useState<OperatorPreferences>(() => getSavedPreferences());

  // UI state
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [soundTestSuccess, setSoundTestSuccess] = useState(false);
  const [soundTestError, setSoundTestError] = useState<string | null>(null);

  // Change Password Modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // Sync audio toggle with context if audioEnabled changed from header
  useEffect(() => {
    setPreferences((prev) => ({ ...prev, alertSoundsEnabled: audioEnabled }));
  }, [audioEnabled]);

  // Handle testing emergency alert sound (plays genuine chime without creating records)
  const handleTestAlertSound = () => {
    try {
      setSoundTestError(null);
      playEmergencyAlert('Critical');
      setSoundTestSuccess(true);
      setTimeout(() => setSoundTestSuccess(false), 3000);
    } catch {
      setSoundTestError('Alert sound could not be played. Please check your browser sound settings.');
      setTimeout(() => setSoundTestError(null), 4000);
    }
  };

  // Handle saving operational preferences
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    savePreferences(preferences);
    setAudioEnabled(preferences.alertSoundsEnabled);
    playSuccessSound();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Handle password change submission
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match. Please verify and try again.');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      await api.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });

      setPasswordSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordSuccess(null);
      }, 1500);
    } catch (err) {
      const message = err instanceof Error ? err.message : "We couldn't save your changes. Please try again.";
      setPasswordError(message);
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Settings
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage RescueMesh preferences and operational settings.
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Changes saved</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSavePreferences} className="space-y-5">
        {/* Section 1: Emergency Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <Volume2 className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Emergency Alerts
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* Alert Sounds Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="pr-4">
                <span className="font-bold text-slate-900 block text-xs">Alert Sounds</span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Play an audible chime when a new emergency is received by the command center.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    alertSoundsEnabled: !preferences.alertSoundsEnabled
                  })
                }
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                  preferences.alertSoundsEnabled
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {preferences.alertSoundsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Critical Sound Pattern Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="pr-4">
                <span className="font-bold text-slate-900 block text-xs">Critical Priority Distinct Tone</span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Use an urgent dual-frequency tone for Critical priority emergency incidents.
                </p>
              </div>

              <button
                type="button"
                disabled={!preferences.alertSoundsEnabled}
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    criticalSoundDistinct: !preferences.criticalSoundDistinct
                  })
                }
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                  preferences.criticalSoundDistinct && preferences.alertSoundsEnabled
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {preferences.criticalSoundDistinct ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Test Sound Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
              <div>
                <span className="text-slate-600 font-semibold block text-xs">Sound Check:</span>
                <span className="text-[11px] text-slate-400">Verify audio output and volume without triggering actual emergency records</span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {soundTestSuccess && (
                  <span className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Alert sound played.</span>
                  </span>
                )}
                {soundTestError && (
                  <span className="text-xs font-semibold text-rose-600">
                    {soundTestError}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleTestAlertSound}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Volume2 className="w-3.5 h-3.5 text-slate-600" />
                  <span>Test Alert Sound</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Notifications */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <Bell className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Notifications
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            {/* New Emergency Banner Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="pr-4">
                <span className="font-bold text-slate-900 block text-xs">New Emergency Alerts</span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Show an on-screen toast alert banner when a newly reported emergency arrives.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    bannerAlertsEnabled: !preferences.bannerAlertsEnabled
                  })
                }
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                  preferences.bannerAlertsEnabled
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {preferences.bannerAlertsEnabled ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Critical Priority Visual Highlighting */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div className="pr-4">
                <span className="font-bold text-slate-900 block text-xs">Critical Priority Alerts</span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Give Critical emergencies stronger visual attention and pulse styling across dashboard lists.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPreferences({
                    ...preferences,
                    criticalHighlightEnabled: !preferences.criticalHighlightEnabled
                  })
                }
                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-colors cursor-pointer shrink-0 ${
                  preferences.criticalHighlightEnabled
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                {preferences.criticalHighlightEnabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Emergency Operations */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <Activity className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Emergency Operations
            </h2>
          </div>

          <div className="space-y-4 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-900 block text-xs">Default Incident Order</span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Preferred initial sorting when opening the emergency incidents table.
                </p>
              </div>

              <select
                value={preferences.defaultIncidentSort}
                onChange={(e) =>
                  setPreferences({
                    ...preferences,
                    defaultIncidentSort: e.target.value as 'priority' | 'time'
                  })
                }
                className="py-1.5 px-3 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
              >
                <option value="priority">Highest Priority First</option>
                <option value="time">Most Recent First</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50/70 border border-slate-200/80">
              <div>
                <span className="font-bold text-slate-900 block text-xs">Live Emergency Updates</span>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  Receive new emergencies and status changes in real time without refreshing.
                </p>
              </div>

              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected</span>
              </span>
            </div>
          </div>
        </div>

        {/* Section 4: Account & Security */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <Lock className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Account & Security
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50/70 border border-slate-200/80">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{currentUser?.name}</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  {currentUser?.role}
                </span>
              </div>
              <div className="text-slate-500 text-[11px] flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>Email: {currentUser?.email}</span>
                <span>•</span>
                <span>Badge: {currentUser?.badgeNumber}</span>
                <span>•</span>
                <span>Center: {currentUser?.station || currentUser?.assignedDistrict}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setPasswordError(null);
                setPasswordSuccess(null);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
                setIsPasswordModalOpen(true);
              }}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer shrink-0"
            >
              <Key className="w-3.5 h-3.5 text-slate-500" />
              <span>Change Password</span>
            </button>
          </div>
        </div>

        {/* Section 5: System Information (Read-only) */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Radio className="w-4 h-4 text-blue-600" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              System Information
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                System Status
              </span>
              <span className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    systemStatus === 'ONLINE' ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                <span>{systemStatus === 'ONLINE' ? 'Operational' : 'Attention Required'}</span>
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Live Updates
              </span>
              <span className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    realtimeStatus === 'connected' ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  }`}
                />
                <span>{realtimeStatus === 'connected' ? 'Connected' : 'Reconnecting'}</span>
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Emergency Network
              </span>
              <span className="font-bold text-slate-900 mt-1 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Operational</span>
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                Last Synchronized
              </span>
              <span className="font-mono font-semibold text-slate-800 mt-1 block">
                {lastSyncTime || 'Just now'}
              </span>
            </div>
          </div>
        </div>

        {/* Save Changes Button */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="px-5 py-2.5 rounded-lg text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Changes</span>
          </button>
        </div>
      </form>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Change Account Password</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordError && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            {passwordSuccess && (
              <div className="mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{passwordSuccess}</span>
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50"
                >
                  {isSubmittingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
