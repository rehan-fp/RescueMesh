// Professional emergency audio chime using Web Audio API

const AUDIO_STORAGE_KEY = 'rescuemesh_audio_enabled';

let audioCtx: AudioContext | null = null;
const announcedIncidentIds = new Set<string>();

/**
 * Initializes or unlocks the AudioContext on user interaction to comply with modern browser autoplay policies.
 */
export function initAudio(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
  } catch {
    // Gracefully handle browser restrictions
  }
}

/**
 * Retrieves persisted user preference for alert audio. Defaults to true.
 */
export function getSavedAudioPreference(): boolean {
  try {
    if (typeof localStorage === 'undefined') return true;
    const saved = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (saved === null) return true;
    return saved === 'true';
  } catch {
    return true;
  }
}

/**
 * Persists user preference for alert audio.
 */
export function saveAudioPreference(enabled: boolean): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(AUDIO_STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns true if this incident has already been announced during the current browser session.
 */
export function isIncidentAnnounced(incidentId: string): boolean {
  return announcedIncidentIds.has(incidentId);
}

/**
 * Marks an incident as announced to prevent alert fatigue and duplicate chimes.
 * Returns true if this was the first announcement, false if already announced.
 */
export function markIncidentAnnounced(incidentId: string): boolean {
  if (announcedIncidentIds.has(incidentId)) {
    return false;
  }
  announcedIncidentIds.add(incidentId);
  return true;
}

/**
 * Plays a single, professional emergency notification chime.
 * Will not repeat, loop, or sound like a game.
 */
export function playEmergencyAlert(priority: 'Critical' | 'High' | 'Medium' | 'Low' = 'High') {
  try {
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const criticalDistinct =
      typeof localStorage !== 'undefined'
        ? localStorage.getItem('rescuemesh_critical_sound_enabled') !== 'false'
        : true;
    const effectivePriority = priority === 'Critical' && !criticalDistinct ? 'High' : priority;

    if (effectivePriority === 'Critical') {
      // 2-tone urgent command beep (A5 -> C#6)
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now); // A5
      osc.frequency.setValueAtTime(1108.73, now + 0.12); // C#6
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Professional emergency operations notification chime (D5 -> A5)
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.1); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch {
    // Gracefully ignore audio autoplay policies if audio not unlocked yet
  }
}

export const playEmergencyAlertSound = playEmergencyAlert;

export function playSuccessSound() {
  try {
    initAudio();
    if (!audioCtx) return;

    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.08); // E5
    osc.frequency.setValueAtTime(783.99, now + 0.16); // G5
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch {
    // Ignore audio restriction
  }
}
