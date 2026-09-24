import { useEffect, useRef, type RefObject } from 'react';
import * as C from '../game/config.ts';
import * as Engine from '../game/engine.ts';
import { t } from '../game/i18n.ts';
import type { FightMode, GameState } from '../game/types.ts';
import { roomHint } from '../labels.ts';
import { RoomCard } from './Card.tsx';

interface RoomProps {
  state: GameState;
  choosing: number;
  showThreat: boolean;
  reduceMotion: boolean;
  roomRef: RefObject<HTMLUListElement>;
  onPress: (index: number) => void;
  onPlay: (index: number, mode: FightMode) => void;
  onCancel: () => void;
}

/**
 * The four slots of the current room.
 *
 * App remounts this for every new run (it is keyed by run), which is what
 * forgets which cards were already revealed.
 */
export function Room({ state, choosing, showThreat, reduceMotion, roomRef, onPress, onPlay, onCancel }: RoomProps) {
  // Cards already face up, so they are not re-animated. Updated after each
  // render, so a render (or StrictMode's double render) only reads it.
  const revealed = useRef(new Set<string>());
  const slots = Engine.view.slots(state);

  useEffect(() => {
    revealed.current = new Set(slots.map((slot) => slot.card.id));
  });

  // Only genuinely new arrivals flip, staggered left to right.
  let fresh = 0;
  const delays = slots.map((slot) => {
    if (revealed.current.has(slot.card.id) || reduceMotion) return null;
    const delay = 90 * fresh;
    fresh += 1;
    return delay;
  });

  // The room's own label carries progress, so a screen reader user can land
  // on the group and know where they are without counting cards.
  const open = Engine.pending(state).length;
  const label = state.status === 'playing'
    ? t('room.label', {
      turn: state.turn,
      open: t('room.openCards', { n: open }),
      done: state.resolved,
      need: Math.min(C.CARDS_TO_RESOLVE, open + state.resolved),
    })
    : t('room.labelOver', { turn: state.turn });

  // Pad the grid so the layout does not jump as the room empties.
  const ghosts = Math.max(0, C.ROOM_SIZE - slots.length);

  return (
    <section className="room-wrap" aria-labelledby="roomHeading">
      <div className="room-head">
        <h2 id="roomHeading">{t('room.heading')}</h2>
        <p className="room-hint" id="roomHint">{roomHint(state, choosing)}</p>
      </div>
      <ul className="room" id="room" ref={roomRef} aria-label={label}>
        {slots.map((slot, index) => (
          <RoomCard
            key={slot.card.id}
            state={state}
            slot={slot}
            index={index}
            choosing={choosing === index}
            showThreat={showThreat}
            flipDelay={delays[index]}
            onPress={onPress}
            onPlay={onPlay}
            onCancel={onCancel}
          />
        ))}
        {Array.from({ length: ghosts }, (_, i) => (
          <li key={`ghost-${i}`} className="slot slot--empty" aria-hidden="true" />
        ))}
      </ul>
    </section>
  );
}
