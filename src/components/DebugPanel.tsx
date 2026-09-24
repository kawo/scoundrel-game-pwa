import { useState, type FormEvent } from 'react';
import { t } from '../game/i18n.ts';
import type { GameState } from '../game/types.ts';
import { Html } from './Text.tsx';

/** Hidden unless asked for: toggle with ` or ?debug=1. */
export function DebugPanel({ state, onDeal }: { state: GameState; onDeal: (seed: string) => void }) {
  const [seed, setSeed] = useState('');
  const [peek, setPeek] = useState(false);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    onDeal(seed.trim());
  };

  return (
    <aside className="debug" id="debugPanel" aria-label={t('dbg.title')}>
      <h2>{t('dbg.title')}</h2>
      <form id="seedForm" className="debug__row" onSubmit={submit}>
        <label htmlFor="seedInput">{t('hud.seed')}</label>
        <input
          id="seedInput"
          name="seed"
          type="text"
          autoComplete="off"
          spellCheck={false}
          placeholder={state.seed}
          value={seed}
          onChange={(e) => setSeed(e.target.value)}
        />
        <button className="btn btn--sm" type="submit">{t('dbg.deal')}</button>
      </form>
      <p className="debug__row">
        <button className="btn btn--sm" type="button" aria-expanded={peek} onClick={() => setPeek((p) => !p)}>
          {peek ? t('dbg.hide') : t('dbg.peek')}
        </button>
      </p>
      {peek && (
        <ol className="debug__deck" id="debugDeck">
          {state.deck.map((card, i) => (
            <li key={card.id}>{`${String(i + 1).padStart(2, '0')}  ${card.suit}${card.label}  ${card.name}`}</li>
          ))}
        </ol>
      )}
      <Html as="p" className="debug__note" k="dbg.note" />
    </aside>
  );
}
