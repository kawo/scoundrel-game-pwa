/*
 * Scoundrel: shared shapes.
 *
 * Everything in a game state is plain JSON — cards are data, not class
 * instances — so a state round-trips through LocalStorage and structuredClone
 * as is. See engine.ts for what each field means.
 */

export type Suit = '♣' | '♠' | '♦' | '♥';
export type SuitKey = 'clubs' | 'spades' | 'diamonds' | 'hearts';
export type CardKind = 'monster' | 'weapon' | 'potion';
export type PresetId = 'standard' | 'classic' | 'relaxed';
export type Status = 'playing' | 'won' | 'lost';
export type FightMode = 'weapon' | 'bare';

export interface Card {
  id: string;
  suit: Suit;
  suitKey: SuitKey;
  suitName: string;
  rank: number;
  label: string;
  kind: CardKind;
  name: string;
  art: string;
}

export interface Slot {
  card: Card;
  done: boolean;
  dealtOn: number;
}

export interface Weapon {
  card: Card;
  lastSlain: number | null;
  stack: Card[];
}

export interface Rules {
  weaponStrictlyDecreasing: boolean;
  stackOnlyOnCleanKill: boolean;
}

export type LogParams = Record<string, string | number | null | undefined>;

export interface LogEntry {
  id: number;
  key: string;
  params: LogParams | null;
  kind: string;
  turn: number;
  /** Only on entries from saves older than the key-based chronicle. */
  text?: string;
}

export interface GameState {
  version: number;
  seed: string;
  preset: PresetId;
  rules: Rules;
  recorded?: boolean;
  deck: Card[];
  room: Slot[];
  discard: Card[];
  health: number;
  weapon: Weapon | null;
  turn: number;
  resolved: number;
  potionUsed: boolean;
  avoidedLast: boolean;
  status: Status;
  score: number | null;
  killer: Card | null;
  avoidsUsed: number;
  potionsDrunk: number;
  potionsWasted: number;
  monstersSlain: number;
  log: LogEntry[];
  logSeq: number;
  startedAt: number;
}

/** How a card resolved — drives sound, particles and achievements. */
export interface Outcome {
  card: Card;
  kind: CardKind;
  damage: number;
  healed: number;
  withWeapon: boolean;
  bareHanded: boolean;
  clean: boolean;
  slain: boolean;
  wasted: boolean;
  equipped: boolean;
  roomEnded: boolean;
  turn: number;
}
