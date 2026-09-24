import { useEffect, useRef, type RefObject } from 'react';
import * as C from '../game/config.ts';
import * as Engine from '../game/engine.ts';
import { t } from '../game/i18n.ts';
import type { GameState } from '../game/types.ts';
import { avoidReason, cardName, spoken } from '../labels.ts';
import { BrandMark, Glyph } from './Glyph.tsx';

function HealthGauge({ health }: { health: number }) {
  const gauge = useRef<HTMLDivElement>(null);
  const last = useRef<number | null>(null);

  // Flash the meter when it drops, so damage is felt and not just read.
  useEffect(() => {
    const node = gauge.current;
    if (node && last.current !== null && health < last.current) {
      node.classList.remove('is-hit');
      void node.offsetWidth; // restart the animation
      node.classList.add('is-hit');
    }
    last.current = health;
  }, [health]);

  const level = health <= 5 ? 'critical' : health <= 10 ? 'low' : 'ok';
  return (
    <div className="gauge" id="healthGauge" ref={gauge} data-level={level}>
      <div className="gauge__top">
        <span className="gauge__label">{t('hud.health')}</span>
        <span className="gauge__value">
          <output id="healthValue" aria-live="off">{health}</output>
          <span className="gauge__max">/{C.MAX_HEALTH}</span>
        </span>
      </div>
      <div
        className="meter"
        role="meter"
        aria-labelledby="healthLabelText"
        aria-valuemin={0}
        aria-valuemax={C.MAX_HEALTH}
        aria-valuenow={health}
        aria-valuetext={t('hud.healthOf', { n: health, max: C.MAX_HEALTH })}
        id="healthMeter"
      >
        <div className="meter__fill" id="healthFill" style={{ width: `${(health / C.MAX_HEALTH) * 100}%` }} />
      </div>
      <span className="sr-only" id="healthLabelText">{t('hud.health')}</span>
    </div>
  );
}

function WeaponPanel({ state }: { state: GameState }) {
  const weapon = state.weapon;
  if (!weapon) {
    return (
      <div className="panel panel--weapon" id="weaponPanel" data-empty="true" aria-label={t('card.noWeaponAria')}>
        <span className="panel__label">{t('hud.weapon')}</span>
        <div className="panel__body" id="weaponBody">
          <span className="panel__empty">{t('hud.bareHands')}</span>
        </div>
      </div>
    );
  }

  const cap = weapon.lastSlain;
  const aria = t('card.weaponAria', { card: spoken(weapon.card), n: weapon.card.rank })
    + (cap === null ? t('card.weaponAriaFresh') : t('card.weaponAriaCap', { cap }))
    + (weapon.stack.length ? t('card.weaponAriaSlain', { n: weapon.stack.length }) : '');

  return (
    <div className="panel panel--weapon" id="weaponPanel" data-empty="false" aria-label={aria}>
      <span className="panel__label">{t('hud.weapon')}</span>
      <div className="panel__body" id="weaponBody">
        <span className="weapon__card"><Glyph suit={weapon.card.suit} size={16} /><b>{weapon.card.label}</b></span>
        <span className="weapon__meta">
          <span className="weapon__name">{cardName(weapon.card)}</span>
          <span className="weapon__cap" data-fresh={String(cap === null)}>
            {cap === null ? t('hud.weaponFresh') : t('hud.weaponCap', { n: cap })}
          </span>
        </span>
        {weapon.stack.length > 0 && (
          <span className="weapon__stack" title={t('hud.weaponStackTitle')}>
            {weapon.stack.map((c) => <i key={c.id}>{c.suit}{c.label}</i>)}
          </span>
        )}
      </div>
    </div>
  );
}

interface HudProps {
  state: GameState;
  avoidRef: RefObject<HTMLButtonElement>;
  onAvoid: () => void;
}

export function Hud({ state, avoidRef, onAvoid }: HudProps) {
  const can = Engine.canAvoid(state);
  return (
    <header className="hud" aria-label={t('app.status')}>
      <div className="hud__brand">
        <BrandMark />
        <div className="hud__titles">
          <h1>Scoundrel</h1>
          <p>{t('app.tagline')}</p>
        </div>
      </div>

      <HealthGauge health={state.health} />
      <WeaponPanel state={state} />

      <dl className="counters">
        <div className="counter"><dt>{t('hud.room')}</dt><dd id="turnCount">{state.turn}</dd></div>
        <div className="counter"><dt>{t('hud.deck')}</dt><dd id="deckCount">{state.deck.length}</dd></div>
        <div className="counter"><dt>{t('hud.discard')}</dt><dd id="discardCount">{state.discard.length}</dd></div>
      </dl>

      <button
        type="button"
        className="btn btn--avoid"
        id="avoidBtn"
        ref={avoidRef}
        aria-describedby="avoidHint"
        disabled={!can}
        title={can ? t('hud.avoidTitle') : avoidReason(state)}
        onClick={onAvoid}
      >
        <span className="btn__key" aria-hidden="true">A</span>
        <span>{t('hud.avoid')}</span>
      </button>
      <p className="sr-only" id="avoidHint">{t('hud.avoidHint')}</p>
    </header>
  );
}
