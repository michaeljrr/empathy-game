// ============================================================
//  audio.ts — Shared SFX / BGM player used across scenes
// ============================================================
//
//  Thin cache around HTMLAudioElement. Every element's volume is the
//  caller-supplied `base volume` multiplied by the user's corresponding
//  setting (bgmVolume for tracks in /audio/music/, sfxVolume otherwise).
//  When the player changes volume in Settings, all active elements
//  rebalance immediately.

import { getSettings, onSettingsChange } from './settings';

const cache = new Map<string, HTMLAudioElement>();
// Per-path "base" volumes (before user multiplier is applied).
const baseVolumes = new Map<string, number>();
// Active fade-out tickers keyed by audio src, so we can cancel them if a
// start-request comes in before the fade finishes.
const activeFades = new Map<string, number>();

function isBGMPath(path: string): boolean {
  return path.indexOf('/audio/music/') !== -1;
}

function volumeMultiplier(path: string): number {
  const s = getSettings();
  return isBGMPath(path) ? s.bgmVolume : s.sfxVolume;
}

function effectiveVolume(path: string): number {
  const base = baseVolumes.get(path) ?? 0.5;
  return base * volumeMultiplier(path);
}

function getOrLoad(path: string, opts?: { volume?: number; loop?: boolean }): HTMLAudioElement {
  let audio = cache.get(path);
  if (!audio) {
    audio = new Audio();
    audio.src = path;
    audio.loop = opts?.loop ?? false;
    audio.onerror = () => console.warn(`[audio] Failed to load: ${path}`);
    cache.set(path, audio);
  } else {
    if (opts?.loop !== undefined) audio.loop = opts.loop;
  }
  if (opts?.volume !== undefined) baseVolumes.set(path, opts.volume);
  audio.volume = effectiveVolume(path);
  return audio;
}

function cancelFade(path: string): void {
  const id = activeFades.get(path);
  if (id !== undefined) {
    window.clearInterval(id);
    activeFades.delete(path);
  }
}

// Reapply user volume settings to every cached element. Called automatically
// whenever settings change.
export function applyVolumeSettings(): void {
  cache.forEach((audio, path) => {
    // Skip fading-out tracks — their volume is mid-interpolation; the fade
    // will complete on its own and the next start will pick up fresh volume.
    if (activeFades.has(path)) return;
    audio.volume = effectiveVolume(path);
  });
}
onSettingsChange(applyVolumeSettings);

// ── Paths ──────────────────────────────────────────────────────────────────

export const SFX = {
  CHOICE:          '/src/assets/audio/sfx/selection (choice).mp3',
  ITEM:            '/src/assets/audio/sfx/selection (item).mp3',
  PHONE_PING:      '/src/assets/audio/sfx/phone (notif ping).mp3',
  PHONE_MSG:       '/src/assets/audio/sfx/phone (message send&received).mp3',
  PAGER_BEEP:      '/src/assets/audio/sfx/pager beeping.mp3',
  FOOTSTEPS:       '/src/assets/audio/sfx/footsteps.mp3',
  BELL:            '/src/assets/audio/sfx/bell ring.mp3',
  MUFFLED_VOICES:  '/src/assets/audio/sfx/muffled voices.mp3',
  HOSPITAL_AMBIENT:'/src/assets/audio/sfx/hospital_background_noise.mp3',
  STREET_VEHICLES: '/src/assets/audio/sfx/outside hospital street (vehicles).mp3',
  BED_A_LAUGH:     '/src/assets/audio/sfx/bed a laughing.mp3',
  DINER_AMBIENCE:  '/src/assets/audio/sfx/diner ambience.mp3',
  VELCRO:          '/src/assets/audio/sfx/velcro.mp3',
  MACHINE_BEEP:    '/src/assets/audio/sfx/machine beep.mp3',
  BREAK_ROOM_EAT:  '/src/assets/audio/sfx/break room (quiet, eating).mp3',
};

export const BGM = {
  JOVIAL:                  '/src/assets/audio/music/jovial.mp3',
  EMOTIONAL_CONTEMPLATIVE: '/src/assets/audio/music/emotional_contemplative.mp3',
  EMOTIONAL_SAD:           '/src/assets/audio/music/emotional_sad.mp3',
  SAD:                     '/src/assets/audio/music/sad.mp3',
  END:                     '/src/assets/audio/music/end_bgm.mp3',
};

// ── Play helpers ───────────────────────────────────────────────────────────

// Play a sound from the start. Safe to call rapidly — each call restarts
// playback of the same cached element.
export function playOnce(path: string, volume = 0.5): void {
  cancelFade(path);
  const audio = getOrLoad(path, { volume });
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

// Play the first `durationMs` of a sound, then stop. Used for UI blips where
// you want just a short clip of a longer asset.
export function playClipped(path: string, durationMs: number, volume = 0.5): void {
  cancelFade(path);
  const audio = getOrLoad(path, { volume });
  audio.currentTime = 0;
  audio.play().catch(() => {});
  window.setTimeout(() => {
    audio.pause();
    audio.currentTime = 0;
  }, durationMs);
}

// Start a looping sound if it isn't already playing (idempotent).
export function startLoop(path: string, volume = 0.3): void {
  cancelFade(path);
  const audio = getOrLoad(path, { volume, loop: true });
  if (audio.paused) {
    audio.play().catch(() => {});
  }
}

// Immediate stop — use fadeOutLoop for a gentler exit.
export function stopLoop(path: string): void {
  cancelFade(path);
  const audio = cache.get(path);
  if (audio && !audio.paused) {
    audio.pause();
    audio.currentTime = 0;
  }
}

// Gradually fade an active loop (or one-shot) to silence over `durationMs`,
// then pause & reset. Safe to call on a non-playing audio — no-op.
export function fadeOutLoop(path: string, durationMs = 900): void {
  const audio = cache.get(path);
  if (!audio || audio.paused) return;
  cancelFade(path);

  const startVolume = audio.volume;
  const stepMs = 40;
  const steps = Math.max(1, Math.floor(durationMs / stepMs));
  let currentStep = 0;

  const id = window.setInterval(() => {
    currentStep++;
    const t = currentStep / steps;
    audio.volume = Math.max(0, startVolume * (1 - t));
    if (currentStep >= steps) {
      window.clearInterval(id);
      activeFades.delete(path);
      audio.pause();
      audio.currentTime = 0;
      // Restore to the user-adjusted effective volume for the next startLoop
      audio.volume = effectiveVolume(path);
    }
  }, stepMs);
  activeFades.set(path, id);
}
