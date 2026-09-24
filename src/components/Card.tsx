import { useEffect, useState } from 'react';
import { ART_BACK } from '../game/config.ts';
import * as Engine from '../game/engine.ts';
import { t } from '../game/i18n.ts';
import type { Card, FightMode, GameState, Slot } from '../game/types.ts';
import { cardLabel, cardName, spoken } from '../labels.ts';
import { Glyph } from './Glyph.tsx';

/*
 * The illustrations are full card faces — they carry their own suit outline,
 * starfield and framing — so the card chrome on top is only the rank pips and
 * the name plate, both of which sit in the empty space the art leaves at the
 * top and bottom.
 *
 * `alt=""` is deliberate: the art is decorative here, and the button around
 * it already carries a label naming the card, what it is and what it costs.
 * A second description would just be read twice.
 */
function Front({ card }: { card: Card }) {
  return (
    <>
      <span className="pip pip--tl" aria-hidden="true">{card.label}<Glyph suit={card.suit} size={11} /></span>
      <span className="pip pip--br" aria-hidden="true">{card.label}<Glyph suit={card.suit} size={11} /></span>
      <img className="art" src={card.art} alt="" draggable={false} decoding="async" />
      <span className="card__name">
        <b>{cardName(card)}</b>
        <i>{card.kind === 'potion' ? t('card.heals', { n: card.rank }) : t('card.strength', { n: card.rank })}</i>
      </span>
    </>
  );
}

interface RoomCardProps {
  state: GameState;
  slot: Slot;
  index: number;
  choosing: boolean;
  showThreat: boolean;
  /** ms before this card turns face up; null when it is already face up. */
  flipDelay: number | null;
  onPress: (index: number) => void;
  onPlay: (index: number, mode: FightMode) => void;
  onCancel: () => void;
}

/** One card in the room: a button that flips face up when dealt. */
export function RoomCard({
  state, slot, index, choosing, showThreat, flipDelay, onPress, onPlay, onCancel,
}: RoomCardProps) {
  const card = slot.card;
  // Only genuinely new arrivals flip; the card keeps this state for as long
  // as it stays in the room, so a carried-over card does not flip again.
  // The delay is read once, at mount: the room marks this card as revealed
  // straight after the first render, so a re-render that lands before the
  // flip (any state change will do) passes null — which must not cancel it.
  const [delay] = useState(flipDelay);
  const [faceUp, setFaceUp] = useState(delay === null);
  useEffect(() => {
    if (faceUp || delay === null) return undefined;
    const timer = window.setTimeout(() => setFaceUp(true), delay);
    return () => window.clearTimeout(timer);
  }, [faceUp, delay]);

  const isMonster = card.kind === 'monster';
  const offersChoice = isMonster && Engine.canUseWeapon(state, card);
  const playable = state.status === 'playing' && !slot.done;
  const label = slot.done
    ? t('card.resolved', { card: `${spoken(card)}, ${cardName(card)}` })
    : cardLabel(state, card, offersChoice ? 'choice' : 'direct');

  // Damage preview badge on monsters — the number you actually care about.
  const threat = isMonster && playable && showThreat
    ? Engine.previewDamage(state, card, offersChoice ? 'weapon' : 'bare')
    : null;

  return (
    <li className="slot" data-card-id={card.id}>
      <div
        className={`card${faceUp ? ' is-faceup' : ''}`}
        data-kind={card.kind}
        data-suit={card.suitKey}
        data-done={String(slot.done)}
        data-choosing={String(choosing)}
        data-wasted={String(card.kind === 'potion' && state.potionUsed && !slot.done)}
      >
        <button
          type="button"
          className="card__btn"
          data-index={index}
          disabled={!playable}
          aria-label={label}
          aria-keyshortcuts={String(index + 1)}
          onClick={() => onPress(index)}
        >
          <span className="card__inner">
            <span className="face face--back">
              <img className="art art--back" src={ART_BACK} alt="" draggable={false} decoding="async" />
            </span>
            <span className="face face--front"><Front card={card} /></span>
          </span>
        </button>

        {threat !== null && (
          <span className="card__threat" data-safe={String(threat === 0)}>
            <span className="sr-only">{t('card.threatLabel')}</span>−{threat}
          </span>
        )}

        {/* The weapon-or-fists prompt, as real buttons so it is keyboard-operable. */}
        {choosing && playable && offersChoice && state.weapon && (
          <div className="engage">
            <p className="engage__title" id={`engageTitle${index}`}>
              {t('engage.title', { card: `${card.suit}${card.label}` })}
            </p>
            <button type="button" className="engage__btn" data-act="weapon" data-index={index} onClick={() => onPlay(index, 'weapon')}>
              <span>{t('engage.useWeapon', { card: `${state.weapon.card.suit}${state.weapon.card.label}` })}</span>
              <b>−{Engine.previewDamage(state, card, 'weapon')}</b>
            </button>
            <button type="button" className="engage__btn" data-act="bare" data-index={index} onClick={() => onPlay(index, 'bare')}>
              <span>{t('engage.bare')}</span>
              <b>−{Engine.previewDamage(state, card, 'bare')}</b>
            </button>
            <button type="button" className="engage__cancel" data-act="cancel" onClick={onCancel}>
              {t('engage.cancel')}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/**
 * A card with no button and no flip, for display only (the end screen).
 *
 * Shares the room card's markup and styling, minus the interactive parts:
 * the front face is mounted straight into `.card`, which carries the size, so
 * there is no `.card__inner` and nothing to rotate.
 */
export function StaticCard({ card, caption }: { card: Card; caption: string }) {
  return (
    <figure className="trophy">
      <div className="card card--static" data-kind={card.kind} data-suit={card.suitKey}>
        <div className="face face--front">
          <span className="pip pip--tl" aria-hidden="true">{card.label}<Glyph suit={card.suit} size={11} /></span>
          <span className="pip pip--br" aria-hidden="true">{card.label}<Glyph suit={card.suit} size={11} /></span>
          <img className="art" src={card.art} alt="" draggable={false} decoding="async" />
          <span className="card__name"><b>{cardName(card)}</b><i>{t('card.strength', { n: card.rank })}</i></span>
        </div>
      </div>
      <figcaption className="trophy__cap">
        <span className="sr-only">{spoken(card)}, {cardName(card)}, {t('card.strength', { n: card.rank })}. </span>
        {caption}
      </figcaption>
    </figure>
  );
}
