/*
 * Scoundrel: tunable rules, card tables and flavour.
 *
 * Everything here is data. The engine reads it and never writes to it, so this
 * file doubles as the place to house-rule the game: change a constant, reload.
 */
import type { Card, CardKind, PresetId, Rules, Suit, SuitKey } from './types.ts';

/* ------------------------------------------------------------------ *
 * Rules you can turn
 * ------------------------------------------------------------------ */

export const MAX_HEALTH = 20;
export const ROOM_SIZE = 4;
/** How many of the four room cards you must resolve before moving on. */
export const CARDS_TO_RESOLVE = 3;

/**
 * The weapon rule.
 *
 *   false — non-increasing: a blade capped at 10 may still fight a 10.
 *   true  — strictly decreasing: capped at 10, it may only fight a 9 or less.
 *
 * Non-increasing is the default here. Printed editions of Scoundrel use the
 * strict version, so flip this if you want the harsher dungeon.
 */
export const WEAPON_STRICTLY_DECREASING = false;

/**
 * What happens when you swing at a monster too big for the blade.
 *
 *   false — the monster always dies; you soak the overflow as damage and the
 *           monster is stacked, lowering the cap. (Default, and the printed rule.)
 *   true  — only a clean kill (0 damage) stacks; a bloody win leaves the cap
 *           untouched, which makes one good weapon last the whole dungeon.
 */
export const STACK_ONLY_ON_CLEAN_KILL = false;

/** Potions after the first in a room are poured out. */
export const POTIONS_PER_ROOM = 1;

/** Runs kept in the history list. */
export const HISTORY_LIMIT = 25;

export const STORAGE_KEY = 'scoundrel:save:v2';
export const SAVE_VERSION = 2; // v2: chronicle stores keys, not sentences
/** Chronicle entries kept in memory / in the save. */
export const LOG_LIMIT = 120;

/* ------------------------------------------------------------------ *
 * Rulesets
 *
 * The two constants above are the defaults; these are the presets a player
 * can pick in Settings. A ruleset is copied into the game state when the
 * dungeon is dealt, so changing the setting never alters a run in progress —
 * and a saved game always plays by the rules it was dealt with.
 * ------------------------------------------------------------------ */

export interface Preset {
  id: PresetId;
  name: string;
  blurb: string;
  rules: Rules;
}

export const PRESETS: Record<PresetId, Preset> = {
  standard: {
    id: 'standard',
    name: 'Standard',
    blurb: 'A blade may fight monsters of its last kill’s value or lower.',
    rules: { weaponStrictlyDecreasing: false, stackOnlyOnCleanKill: false },
  },
  classic: {
    id: 'classic',
    name: 'Classic',
    blurb: 'Printed rules: a blade may only fight something strictly smaller. Harder.',
    rules: { weaponStrictlyDecreasing: true, stackOnlyOnCleanKill: false },
  },
  relaxed: {
    id: 'relaxed',
    name: 'Relaxed',
    blurb: 'A blade only dulls on a clean kill, so one good weapon lasts. Easier.',
    rules: { weaponStrictlyDecreasing: false, stackOnlyOnCleanKill: true },
  },
};

export const DEFAULT_PRESET: PresetId = 'standard';

export const isPreset = (id: unknown): id is PresetId =>
  typeof id === 'string' && Object.prototype.hasOwnProperty.call(PRESETS, id);

/** The ruleset for a preset id, falling back to the default. */
export const rulesFor = (id: string): Rules =>
  ({ ...(isPreset(id) ? PRESETS[id] : PRESETS[DEFAULT_PRESET]).rules });

/* ------------------------------------------------------------------ *
 * Cards
 * ------------------------------------------------------------------ */

export const SUITS: Record<Suit, { key: SuitKey; name: string; kind: CardKind }> = {
  '♣': { key: 'clubs', name: 'Clubs', kind: 'monster' },
  '♠': { key: 'spades', name: 'Spades', kind: 'monster' },
  '♦': { key: 'diamonds', name: 'Diamonds', kind: 'weapon' },
  '♥': { key: 'hearts', name: 'Hearts', kind: 'potion' },
};

/** Rank 14 is the ace: high, and the nastiest thing in the deck. */
export const RANK_LABEL: Record<number, string> = { 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };

export const label = (rank: number): string => RANK_LABEL[rank] || String(rank);

/* ------------------------------------------------------------------ *
 * Artwork
 *
 * There are eleven illustrations for forty-four cards, so each suit is cut
 * into tiers by rank and the art escalates with the number. The tier
 * boundaries and the file for each tier live in one table: to re-cut the
 * deck, edit ART and nothing else.
 *
 * On the file names: `club-3` is drawn inside a SPADE outline, not a club —
 * the only illustration whose frame disagrees with its name. It is used here
 * as a club anyway, following the naming. Moving it to the spade list (and
 * giving the clubs two tiers instead of three) is a two-line change below.
 *
 * The files live in public/, so they are served from the site root as is.
 * BASE_URL keeps that working when the app is deployed under a sub-path.
 * ------------------------------------------------------------------ */

export const ART_DIR = `${import.meta.env?.BASE_URL ?? '/'}assets/cards/`;

/** [minRank, maxRank, file] per suit, weakest first. */
export const ART: Record<SuitKey, [number, number, string][]> = {
  clubs: [
    [2, 6, 'club-3.jpg'],    // wolf
    [7, 10, 'club-2.png'],   // hooded wraith
    [11, 14, 'club-1.png'],  // skeleton
  ],
  spades: [
    [2, 6, 'spade-1.png'],   // goblin
    [7, 10, 'spade-2.png'],  // armoured knight
    [11, 14, 'spade-3.png'], // dragon
  ],
  diamonds: [
    [2, 4, 'diamond-1.png'], // crossbow
    [5, 7, 'diamond-2.jpg'], // war axe
    [8, 10, 'diamond-3.png'],// winged sword
  ],
  hearts: [
    [2, 10, 'heart.png'],    // potion flask
  ],
};

/** The card back. */
export const ART_BACK = `${ART_DIR}deck.png`;

export function artFor(suitKey: SuitKey, rank: number): string {
  const tier = ART[suitKey].find(([lo, hi]) => rank >= lo && rank <= hi);
  return ART_DIR + (tier ? tier[2] : ART[suitKey][0][2]);
}

/*
 * Names follow the pictures: a card showing a dragon is not called a spider.
 * Each block of names matches one art tier above.
 */
const LORE: Record<SuitKey, Record<number, string>> = {
  clubs: {
    // wolf
    2: 'Starved Wolf', 3: 'Moor Hound', 4: 'Grey Stalker', 5: 'Dire Wolf', 6: 'Black Lurcher',
    // wraith
    7: 'Pale Shade', 8: 'The Veiled', 9: 'Hollow Mourner', 10: 'The Shrouded',
    // skeleton
    11: 'Bone Sentry', 12: 'Barrow Wight', 13: 'Bone Lord', 14: 'The Marrow King',
  },
  spades: {
    // goblin
    2: 'Gutter Goblin', 3: 'Night Creeper', 4: 'Cave Imp', 5: 'Goblin Cutter', 6: 'Hobgoblin',
    // knight
    7: 'Iron Sentinel', 8: 'Grave Knight', 9: 'Black Warden', 10: 'Iron Revenant',
    // dragon
    11: 'Ash Drake', 12: 'Cinder Wyrm', 13: 'Elder Wyrm', 14: 'Wyrm of Cinders',
  },
  diamonds: {
    // crossbow
    2: 'Light Crossbow', 3: 'Hunting Crossbow', 4: 'Siege Crossbow',
    // axe
    5: 'Hand Axe', 6: 'Bearded Axe', 7: 'War Axe',
    // sword
    8: 'Knight’s Sword', 9: 'Falcon Blade', 10: 'Eagle Greatsword',
  },
  hearts: {
    2: 'Sip of Rain', 3: 'Bitter Tonic', 4: 'Field Salve', 5: 'Vial of Mending',
    6: 'Red Draught', 7: 'Cleric’s Flask', 8: 'Elixir of Bone', 9: 'Amber Philtre',
    10: 'Draught of Dawn',
  },
};

/* ------------------------------------------------------------------ *
 * Card factory
 * ------------------------------------------------------------------ */

/** Build one card. Rank is 2–14. */
export function makeCard(suit: Suit, rank: number): Card {
  const meta = SUITS[suit];
  return {
    id: meta.key[0].toUpperCase() + rank, // "S14", "D7", "H3"
    suit,
    suitKey: meta.key,
    suitName: meta.name,
    rank,
    label: label(rank),
    kind: meta.kind,
    name: LORE[meta.key][rank],
    art: artFor(meta.key, rank),
  };
}

/** The 44-card dungeon, unshuffled: 26 monsters, 9 weapons, 9 potions. */
export function buildDeck(): Card[] {
  const cards: Card[] = [];
  for (const suit of ['♣', '♠'] as const) {
    for (let rank = 2; rank <= 14; rank += 1) cards.push(makeCard(suit, rank));
  }
  for (let rank = 2; rank <= 10; rank += 1) cards.push(makeCard('♦', rank));
  for (let rank = 2; rank <= 10; rank += 1) cards.push(makeCard('♥', rank));
  return cards;
}
