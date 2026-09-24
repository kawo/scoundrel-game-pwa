/*
 * Scoundrel: LocalStorage persistence.
 *
 * The whole game state is a plain JSON tree (cards are data, not class
 * instances), so saving is a stringify and loading is a parse plus a version
 * check. Every access is wrapped: private windows, blocked site data and full
 * quotas all throw, and none of them should cost you the game.
 */
import { SAVE_VERSION, STORAGE_KEY as KEY } from './config.ts';
import type { GameState } from './types.ts';

let warned = false;

function warn(err: unknown): void {
  if (warned) return;
  warned = true;
  console.warn('[Scoundrel] storage unavailable, the run will not survive a reload:', err);
}

/** @returns whether the write went through */
export function save(state: GameState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (err) {
    warn(err);
    return false;
  }
}

/** Read the saved run back, or null when there is nothing usable. */
export function load(): GameState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (err) {
    warn(err);
    return null;
  }
  if (!raw) return null;

  try {
    const state = JSON.parse(raw);
    // A save from an older build is not worth migrating for a card game;
    // drop it rather than crash halfway through a render.
    if (!state || state.version !== SAVE_VERSION) return null;
    if (!Array.isArray(state.deck) || !Array.isArray(state.room)) return null;
    return state as GameState;
  } catch (err) {
    warn(err);
    return null;
  }
}

export function clear(): void {
  try {
    localStorage.removeItem(KEY);
  } catch (err) {
    warn(err);
  }
}
