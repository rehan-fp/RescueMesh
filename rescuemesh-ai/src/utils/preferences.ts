/**
 * Centralized operator preference management for RescueMesh.
 * Persists non-critical user-facing operational settings in browser storage.
 */

export interface OperatorPreferences {
  alertSoundsEnabled: boolean;
  criticalSoundDistinct: boolean;
  bannerAlertsEnabled: boolean;
  criticalHighlightEnabled: boolean;
  defaultIncidentSort: 'priority' | 'time';
}

const PREF_KEYS = {
  ALERT_SOUNDS: 'rescuemesh_audio_enabled',
  CRITICAL_SOUND: 'rescuemesh_critical_sound_enabled',
  BANNER_ALERTS: 'rescuemesh_banner_alerts_enabled',
  CRITICAL_HIGHLIGHT: 'rescuemesh_critical_highlight_enabled',
  DEFAULT_SORT: 'rescuemesh_default_incident_sort',
};

export function getSavedPreferences(): OperatorPreferences {
  try {
    return {
      alertSoundsEnabled: localStorage.getItem(PREF_KEYS.ALERT_SOUNDS) !== 'false',
      criticalSoundDistinct: localStorage.getItem(PREF_KEYS.CRITICAL_SOUND) !== 'false',
      bannerAlertsEnabled: localStorage.getItem(PREF_KEYS.BANNER_ALERTS) !== 'false',
      criticalHighlightEnabled: localStorage.getItem(PREF_KEYS.CRITICAL_HIGHLIGHT) !== 'false',
      defaultIncidentSort:
        (localStorage.getItem(PREF_KEYS.DEFAULT_SORT) as 'priority' | 'time') || 'priority',
    };
  } catch {
    return {
      alertSoundsEnabled: true,
      criticalSoundDistinct: true,
      bannerAlertsEnabled: true,
      criticalHighlightEnabled: true,
      defaultIncidentSort: 'priority',
    };
  }
}

export function savePreferences(prefs: Partial<OperatorPreferences>): void {
  try {
    if (prefs.alertSoundsEnabled !== undefined) {
      localStorage.setItem(PREF_KEYS.ALERT_SOUNDS, String(prefs.alertSoundsEnabled));
    }
    if (prefs.criticalSoundDistinct !== undefined) {
      localStorage.setItem(PREF_KEYS.CRITICAL_SOUND, String(prefs.criticalSoundDistinct));
    }
    if (prefs.bannerAlertsEnabled !== undefined) {
      localStorage.setItem(PREF_KEYS.BANNER_ALERTS, String(prefs.bannerAlertsEnabled));
    }
    if (prefs.criticalHighlightEnabled !== undefined) {
      localStorage.setItem(PREF_KEYS.CRITICAL_HIGHLIGHT, String(prefs.criticalHighlightEnabled));
    }
    if (prefs.defaultIncidentSort !== undefined) {
      localStorage.setItem(PREF_KEYS.DEFAULT_SORT, prefs.defaultIncidentSort);
    }
  } catch {
    // Gracefully handle storage errors
  }
}
