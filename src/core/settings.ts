// ============================================================
//  settings.ts — User preferences (volumes, keybinds)
// ============================================================
//
//  Persisted to localStorage. Scenes read via getSettings(), and
//  audio/input helpers reference the helpers at the bottom of
//  this file so the game never hard-codes keys like 'e' directly.

const STORAGE_KEY = 'empathy_settings_v1';

export const DEFAULT_KEYBINDS = {
  interact:  'e',
  moveLeft:  'a',
  moveRight: 'd',
};

export type KeybindAction = keyof typeof DEFAULT_KEYBINDS;

export interface Keybinds {
  interact:  string;
  moveLeft:  string;
  moveRight: string;
}

export interface Settings {
  bgmVolume: number; // 0..1
  sfxVolume: number; // 0..1
  keybinds:  Keybinds;
}

const DEFAULTS: Settings = {
  bgmVolume: 0.6,
  sfxVolume: 0.8,
  keybinds: { ...DEFAULT_KEYBINDS },
};

let current: Settings = load();
const listeners = new Set<() => void>();

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        bgmVolume: typeof parsed.bgmVolume === 'number' ? clamp01(parsed.bgmVolume) : DEFAULTS.bgmVolume,
        sfxVolume: typeof parsed.sfxVolume === 'number' ? clamp01(parsed.sfxVolume) : DEFAULTS.sfxVolume,
        keybinds: { ...DEFAULT_KEYBINDS, ...(parsed.keybinds ?? {}) },
      };
    }
  } catch {
    /* ignore corrupt storage */
  }
  return deepClone(DEFAULTS);
}

function save(): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch {}
}

function notifyListeners(): void {
  listeners.forEach(fn => { try { fn(); } catch {} });
}

function clamp01(v: number): number { return Math.max(0, Math.min(1, v)); }
function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }

// ── Public API ─────────────────────────────────────────────────────────────

export function getSettings(): Settings { return current; }

export function setBgmVolume(v: number): void {
  current.bgmVolume = clamp01(v);
  save();
  notifyListeners();
}

export function setSfxVolume(v: number): void {
  current.sfxVolume = clamp01(v);
  save();
  notifyListeners();
}

export function setKeybind(action: KeybindAction, key: string): void {
  current.keybinds[action] = key.toLowerCase();
  save();
  notifyListeners();
}

export function resetKeybinds(): void {
  current.keybinds = { ...DEFAULT_KEYBINDS };
  save();
  notifyListeners();
}

export function resetAll(): void {
  current = deepClone(DEFAULTS);
  save();
  notifyListeners();
}

export function onSettingsChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// ── Keybind helpers ────────────────────────────────────────────────────────
// Used by scenes instead of raw key checks. Enter/Space always count as
// interact (common convention) and arrow keys always count as movement.

export function isInteractKey(e: KeyboardEvent): boolean {
  const k = e.key.toLowerCase();
  return k === current.keybinds.interact || k === 'enter' || k === ' ';
}

export function isMoveLeftKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === current.keybinds.moveLeft || k === 'arrowleft';
}

export function isMoveRightKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === current.keybinds.moveRight || k === 'arrowright';
}

// Human-readable rendering for keybind buttons
export function formatKey(k: string): string {
  if (k === ' ' || k === 'space') return 'Space';
  if (k === 'arrowleft')  return '←';
  if (k === 'arrowright') return '→';
  if (k === 'arrowup')    return '↑';
  if (k === 'arrowdown')  return '↓';
  if (k === 'escape')     return 'Esc';
  if (k === 'enter')      return 'Enter';
  if (k === 'tab')        return 'Tab';
  if (k === 'shift')      return 'Shift';
  if (k.length === 1) return k.toUpperCase();
  return k.charAt(0).toUpperCase() + k.slice(1);
}

// Whether a given raw key is a valid binding target (rejects modifiers etc.)
export function isAssignableKey(k: string): boolean {
  const key = k.toLowerCase();
  if (['shift', 'control', 'alt', 'meta', 'capslock', 'tab', 'escape', 'contextmenu'].includes(key)) return false;
  if (key === '\\') return false; // reserved for dev skip
  return true;
}
