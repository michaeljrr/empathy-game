// ============================================================
//  audio.ts — Shared SFX / BGM player used across scenes
// ============================================================
//
//  Thin cache around HTMLAudioElement. Every element's volume is the
//  caller-supplied `base volume` multiplied by the user's corresponding
//  setting (bgmVolume for tracks in /audio/music/, sfxVolume otherwise).
//  When the player changes volume in Settings, all active elements
//  rebalance immediately.
//
//  IMPORTANT: every audio path is imported as a module (resolved at build
//  time by Vite) so the production bundle on Vercel actually ships the
//  files. Raw '/src/assets/...' strings would only work in dev.

import { getSettings, onSettingsChange } from './settings';

// ── SFX imports ───────────────────────────────────────────────────────────
import sfxChoice         from '../assets/audio/sfx/selection (choice).mp3';
import sfxItem           from '../assets/audio/sfx/selection (item).mp3';
import sfxPhonePing      from '../assets/audio/sfx/phone (notif ping).mp3';
import sfxPhoneMsg       from '../assets/audio/sfx/phone (message send&received).mp3';
import sfxPagerBeep      from '../assets/audio/sfx/pager beeping.mp3';
import sfxFootsteps      from '../assets/audio/sfx/footsteps.mp3';
import sfxBell           from '../assets/audio/sfx/bell ring.mp3';
import sfxMuffledVoices  from '../assets/audio/sfx/muffled voices.mp3';
import sfxHospitalAmb    from '../assets/audio/sfx/hospital_background_noise.mp3';
import sfxStreetVehicles from '../assets/audio/sfx/outside hospital street (vehicles).mp3';
import sfxBedALaugh      from '../assets/audio/sfx/bed a laughing.mp3';
import sfxDinerAmbience  from '../assets/audio/sfx/diner ambience.mp3';
import sfxVelcro         from '../assets/audio/sfx/velcro.mp3';
import sfxMachineBeep    from '../assets/audio/sfx/machine beep.mp3';
import sfxBreakRoomEat   from '../assets/audio/sfx/break room (quiet, eating).mp3';

// ── BGM imports ───────────────────────────────────────────────────────────
import bgmJovial                from '../assets/audio/music/jovial.mp3';
import bgmEmotionalContemplative from '../assets/audio/music/emotional_contemplative.mp3';
import bgmEmotionalSad          from '../assets/audio/music/emotional_sad.mp3';
import bgmSad                   from '../assets/audio/music/sad.mp3';
import bgmEnd                   from '../assets/audio/music/end_bgm.mp3';

const cache = new Map<string, HTMLAudioElement>();
// Per-path "base" volumes (before user multiplier is applied).
const baseVolumes = new Map<string, number>();
// Active fade-out tickers keyed by audio src, so we can cancel them if a
// start-request comes in before the fade finishes.
const activeFades = new Map<string, number>();
// Loops the game has asked to play. If the browser's autoplay policy blocks
// them on page load, we replay these the instant the user makes any gesture.
const intendedLoops = new Set<string>();
let autoplayUnlocked = false;

// Vite still groups music tracks under /audio/music/ in the bundle path, so
// this classifier keeps working for both dev and production builds.
function isBGMPath(path: string): boolean {
  return path.indexOf('/audio/music/') !== -1 || path.indexOf('audio%2Fmusic') !== -1;
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

// Reapply user volume settings to every cached element.
export function applyVolumeSettings(): void {
  cache.forEach((audio, path) => {
    // Skip fading-out tracks — their volume is mid-interpolation.
    if (activeFades.has(path)) return;
    audio.volume = effectiveVolume(path);
  });
}
onSettingsChange(applyVolumeSettings);

// ── Autoplay retry ────────────────────────────────────────────────────────
// Browsers block audio.play() before the user interacts with the page. The
// first time they click / press a key / tap, unlock and replay any loops
// the game has already asked to start.
function unlockAutoplayOnce(): void {
  if (autoplayUnlocked) return;
  autoplayUnlocked = true;
  intendedLoops.forEach((path) => {
    const audio = cache.get(path);
    if (audio && audio.paused) {
      audio.play().catch(() => {});
    }
  });
}
const unlockOpts: AddEventListenerOptions = { once: true, capture: true };
window.addEventListener('pointerdown', unlockAutoplayOnce, unlockOpts);
window.addEventListener('keydown',     unlockAutoplayOnce, unlockOpts);
window.addEventListener('touchstart',  unlockAutoplayOnce, unlockOpts);

// ── Path maps (exported) ───────────────────────────────────────────────────
// These are the URLs Vite generated for each imported file. Scenes import
// `SFX` / `BGM` constants and pass them into play/loop helpers — they never
// hard-code paths.

export const SFX = {
  CHOICE:          sfxChoice,
  ITEM:            sfxItem,
  PHONE_PING:      sfxPhonePing,
  PHONE_MSG:       sfxPhoneMsg,
  PAGER_BEEP:      sfxPagerBeep,
  FOOTSTEPS:       sfxFootsteps,
  BELL:            sfxBell,
  MUFFLED_VOICES:  sfxMuffledVoices,
  HOSPITAL_AMBIENT:sfxHospitalAmb,
  STREET_VEHICLES: sfxStreetVehicles,
  BED_A_LAUGH:     sfxBedALaugh,
  DINER_AMBIENCE:  sfxDinerAmbience,
  VELCRO:          sfxVelcro,
  MACHINE_BEEP:    sfxMachineBeep,
  BREAK_ROOM_EAT:  sfxBreakRoomEat,
};

export const BGM = {
  JOVIAL:                  bgmJovial,
  EMOTIONAL_CONTEMPLATIVE: bgmEmotionalContemplative,
  EMOTIONAL_SAD:           bgmEmotionalSad,
  SAD:                     bgmSad,
  END:                     bgmEnd,
};

// ── Play helpers ───────────────────────────────────────────────────────────

export function playOnce(path: string, volume = 0.5): void {
  cancelFade(path);
  const audio = getOrLoad(path, { volume });
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

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

export function startLoop(path: string, volume = 0.3): void {
  cancelFade(path);
  intendedLoops.add(path);
  const audio = getOrLoad(path, { volume, loop: true });
  if (audio.paused) {
    // On first page load this may silently reject (autoplay policy); the
    // retry in unlockAutoplayOnce() will pick it up on first user gesture.
    audio.play().catch(() => {});
  }
}

export function stopLoop(path: string): void {
  cancelFade(path);
  intendedLoops.delete(path);
  const audio = cache.get(path);
  if (audio && !audio.paused) {
    audio.pause();
    audio.currentTime = 0;
  }
}

export function fadeOutLoop(path: string, durationMs = 900): void {
  const audio = cache.get(path);
  if (!audio || audio.paused) return;
  cancelFade(path);
  intendedLoops.delete(path);

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
      audio.volume = effectiveVolume(path);
    }
  }, stepMs);
  activeFades.set(path, id);
}
