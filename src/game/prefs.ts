/*
 * Scoundrel: player preferences.
 *
 * Kept in its own LocalStorage key, separate from the save. Settings outlive
 * any individual run — clearing a game, or a save written by an older build
 * being discarded, must not cost you your preferences.
 *
 * Every read is defensive: unknown keys are dropped and bad values fall back to
 * the default, so a hand-edited or half-written entry degrades to sane settings
 * rather than breaking startup.
 *
 * The cache is replaced, never mutated, on every change, so all() doubles as a
 * stable snapshot for React's useSyncExternalStore (see usePrefs in hooks.ts).
 */
import { DEFAULT_PRESET, PRESETS } from './config.ts';
import type { PresetId } from './types.ts';

const KEY = 'scoundrel:prefs:v1';

export type Motion = 'system' | 'reduced' | 'full';

export interface PrefValues {
  /** Which ruleset new games are dealt with. */
  preset: PresetId;
  /**
   * 'system' follows prefers-reduced-motion. The other two override it —
   * the OS setting is not always reachable, and some players want the flip
   * animation off (or on) just here.
   */
  motion: Motion;
  /** The −N damage badges on monsters. Off makes for a harder read. */
  showThreat: boolean;
  /** One-off teaching notes in the chronicle. */
  coach: boolean;
  /** Synthesised sound effects. Off by default: a game that makes noise
   *  uninvited on first load is a game people mute at the tab level. */
  sound: boolean;
  /** Sparks, motes and the win shower. Reduced motion suppresses these
   *  regardless of this setting. */
  particles: boolean;
  /** Has the welcome been shown. */
  seenWelcome: boolean;
}

export type PrefKey = keyof PrefValues;

/**
 * Defaults, and the allowed values for each. `one-of` fields validate against
 * their list; booleans just have to be booleans.
 */
export const SCHEMA: { [K in PrefKey]: { value: PrefValues[K]; options?: readonly PrefValues[K][] } } = {
  preset: { value: DEFAULT_PRESET, options: Object.keys(PRESETS) as PresetId[] },
  motion: { value: 'system', options: ['system', 'reduced', 'full'] },
  showThreat: { value: true },
  coach: { value: true },
  sound: { value: false },
  particles: { value: true },
  seenWelcome: { value: false },
};

export const DEFAULTS = Object.freeze(Object.fromEntries(
  Object.entries(SCHEMA).map(([k, spec]) => [k, spec.value]),
) as unknown as PrefValues);

let cache: PrefValues | null = null;
const listeners = new Set<(key: PrefKey | null, value: unknown) => void>();
let warned = false;

function warn(err: unknown): void {
  if (warned) return;
  warned = true;
  console.warn('[Scoundrel] preferences are not persisting:', err);
}

function valid(key: string, value: unknown): key is PrefKey {
  const spec = (SCHEMA as Record<string, { value: unknown; options?: readonly unknown[] }>)[key];
  if (!spec) return false;
  if (spec.options) return spec.options.includes(value);
  return typeof value === typeof spec.value;
}

function load(): PrefValues {
  if (cache) return cache;
  const next: PrefValues = { ...DEFAULTS };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      for (const [key, value] of Object.entries(saved || {})) {
        if (valid(key, value)) (next as unknown as Record<string, unknown>)[key] = value;
      }
    }
  } catch (err) {
    warn(err);
  }
  cache = next;
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch (err) {
    warn(err);
  }
}

export const get = <K extends PrefKey>(key: K): PrefValues[K] => load()[key];

/** The current preferences. The same object until something changes. */
export const all = (): PrefValues => load();

export function set<K extends PrefKey>(key: K, value: PrefValues[K]): boolean {
  if (!valid(key, value)) return false;
  const current = load();
  if (current[key] === value) return true;
  cache = { ...current, [key]: value };
  persist();
  for (const fn of listeners) fn(key, value);
  return true;
}

export function reset(): void {
  cache = { ...DEFAULTS };
  persist();
  for (const fn of listeners) fn(null, null);
}

export function onChange(fn: (key: PrefKey | null, value: unknown) => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

/**
 * Should motion be suppressed right now?
 * 'system' defers to the OS; the other two are explicit overrides.
 */
export function reduceMotion(): boolean {
  const mode = get('motion');
  if (mode === 'reduced') return true;
  if (mode === 'full') return false;
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
}
