/*
 * Scoundrel: lifetime record and run history.
 *
 * Its own LocalStorage key again — your record should survive a corrupt save,
 * a version bump, or starting a fresh run.
 *
 * A finished run is recorded exactly once. The guard lives on the game state
 * (`state.recorded`), not in here, because the state is what gets saved: if you
 * finish a run, close the tab and come back, the end screen shows again but the
 * run must not be counted twice.
 *
 * Streaks count wins in a row and reset on a loss. Rows keep the seed, so any
 * past run can be dealt again from the history list.
 */
import { DEFAULT_PRESET, HISTORY_LIMIT } from './config.ts';
import type { GameState, PresetId, Status } from './types.ts';

const KEY = 'scoundrel:stats:v1';

export interface RunRow {
  seed: string;
  preset: PresetId;
  status: Status;
  score: number;
  health: number;
  turns: number;
  killer: string | null;
  at: number;
}

export interface StatsRecord {
  version: number;
  games: number;
  wins: number;
  losses: number;
  bestScore: number | null;
  bestSeed: string | null;
  currentStreak: number;
  longestStreak: number;
  totalTurns: number;
  history: RunRow[];
}

const EMPTY: StatsRecord = {
  version: 1,
  games: 0,
  wins: 0,
  losses: 0,
  bestScore: null,
  bestSeed: null,
  currentStreak: 0,
  longestStreak: 0,
  totalTurns: 0,
  history: [],
};

let cache: StatsRecord | null = null;
let warned = false;

function warn(err: unknown): void {
  if (warned) return;
  warned = true;
  console.warn('[Scoundrel] stats are not persisting:', err);
}

function load(): StatsRecord {
  if (cache) return cache;
  cache = { ...EMPTY, history: [] };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved.version === EMPTY.version) {
        cache = { ...EMPTY, ...saved } as StatsRecord;
        if (!Array.isArray(cache.history)) cache.history = [];
      }
    }
  } catch (err) {
    warn(err);
  }
  return cache;
}

function persist(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch (err) {
    warn(err);
  }
}

/**
 * Fold a finished run into the record.
 * @returns the updated stats, or null if the run did not count
 */
export function record(state: GameState): StatsRecord | null {
  if (!state || (state.status !== 'won' && state.status !== 'lost')) return null;
  const s = load();
  const won = state.status === 'won';
  const score = state.score ?? 0;

  s.games += 1;
  s.totalTurns += state.turn || 0;
  if (won) {
    s.wins += 1;
    s.currentStreak += 1;
    if (s.currentStreak > s.longestStreak) s.longestStreak = s.currentStreak;
  } else {
    s.losses += 1;
    s.currentStreak = 0;
  }

  // Best score is across every run: a win is always positive and a loss
  // always negative, so the comparison works without special-casing.
  if (s.bestScore === null || score > s.bestScore) {
    s.bestScore = score;
    s.bestSeed = state.seed;
  }

  s.history.unshift({
    seed: state.seed,
    preset: state.preset || DEFAULT_PRESET,
    status: state.status,
    score,
    health: state.health,
    turns: state.turn,
    killer: state.killer ? `${state.killer.suit}${state.killer.label}` : null,
    at: Date.now(),
  });
  if (s.history.length > HISTORY_LIMIT) s.history.length = HISTORY_LIMIT;

  persist();
  return all();
}

export const all = (): StatsRecord => {
  const s = load();
  return { ...s, history: s.history.slice() };
};

/** Wins as a percentage, or null before the first finished run. */
export const winRate = (): number | null => {
  const s = load();
  return s.games ? (s.wins / s.games) * 100 : null;
};

export function reset(): void {
  cache = { ...EMPTY, history: [] };
  persist();
}
