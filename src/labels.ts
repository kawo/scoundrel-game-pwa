/*
 * Text built from game data: card names, spoken labels, chronicle lines.
 *
 * Everything here reads the current language at call time, so it must be
 * called during render (never cached across a language change).
 */
import * as C from './game/config.ts';
import * as Engine from './game/engine.ts';
import { t, td } from './game/i18n.ts';
import type { Card, FightMode, GameState, LogEntry } from './game/types.ts';

/** The card's flavour name, translated. English lives in config.ts. */
export const cardName = (card: Card): string => td(`card.${card.id}`, card.name);

/** "Ace of Spades" / "As de Pique", for screen readers. */
export const spoken = (card: Card): string => t('card.spoken', {
  rank: card.rank > 10 ? t(`rank.${card.rank}`) : card.rank,
  suit: t(`suit.${card.suitKey}`),
});

export const presetName = (id: string): string =>
  (C.isPreset(id) ? td(`preset.${id}`, C.PRESETS[id].name) : id);

export const presetBlurb = (id: string): string =>
  (C.isPreset(id) ? td(`preset.${id}.blurb`, C.PRESETS[id].blurb) : '');

/** "+12" for a win, "-31" for a loss. */
export const signed = (n: number | null): string =>
  (n === null ? '—' : n > 0 ? `+${n}` : String(n));

/**
 * Render one chronicle entry from its key and params.
 *
 * Two params are themselves translatable rather than literal: a card's
 * flavour name and a ruleset's name. The engine stores the id alongside the
 * English so this can look up the current language without the engine ever
 * having to know about one.
 */
export function logText(entry: LogEntry): string {
  if (!entry.key) return entry.text || ''; // tolerate a stray old entry
  const p = entry.params || {};
  const params: Record<string, unknown> = { ...p };
  if (p.id && p.name) params.name = td(`card.${p.id}`, String(p.name));
  if (p.preset) params.name = presetName(String(p.preset));
  return t(entry.key, params);
}

/** Why the Avoid button is disabled, for its tooltip. */
export function avoidReason(state: GameState): string {
  if (state.status !== 'playing') return t('avoid.over');
  if (state.avoidedLast) return t('avoid.twice');
  if (state.resolved > 0) return t('avoid.touched');
  return t('avoid.short');
}

/** The line under "The Room" heading. */
export function roomHint(state: GameState, choosing: number): string {
  if (state.status === 'won') return t('room.won');
  if (state.status === 'lost') return t('room.lost');

  const left = Engine.pending(state).length;
  const toGo = Math.min(C.CARDS_TO_RESOLVE, left) - state.resolved;
  if (choosing >= 0) return t('room.choosing');
  if (state.deck.length === 0 && left <= C.CARDS_TO_RESOLVE) {
    return left === 1 ? t('room.lastOne') : t('room.lastFew', { n: left });
  }
  if (toGo <= 0) return t('room.dealing');
  return t('room.toGo', { n: toGo });
}

/** The accessible name for a card button in the room. */
export function cardLabel(state: GameState, card: Card, mode: 'choice' | 'direct'): string {
  const base = `${spoken(card)}, ${cardName(card)}`;
  if (card.kind === 'weapon') return t('card.weapon', { card: base, n: card.rank });
  if (card.kind === 'potion') {
    return state.potionUsed
      ? t('card.potionWasted', { card: base, n: card.rank })
      : t('card.potion', { card: base, n: card.rank });
  }
  const bare = card.rank;
  if (mode === 'choice') {
    return t('card.monsterChoice', {
      card: base, n: card.rank, armed: Engine.previewDamage(state, card, 'weapon' as FightMode), bare,
    });
  }
  return t('card.monsterBare', { card: base, n: card.rank, bare });
}

/** "just now", "5 min ago", "yesterday"… */
export function when(ms: number): string {
  const mins = Math.round((Date.now() - ms) / 60000);
  if (mins < 1) return t('when.now');
  if (mins < 60) return t('when.min', { n: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t('when.hour', { n: hours });
  const days = Math.round(hours / 24);
  return days === 1 ? t('when.yesterday') : t('when.days', { n: days });
}
