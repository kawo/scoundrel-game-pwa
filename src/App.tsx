/*
 * Scoundrel: wiring.
 *
 * Owns the one live game, translates input into engine calls, and saves after
 * anything that changed. The engine mutates the state it is given, so every
 * action works on a structuredClone and hands the copy to React — the previous
 * state is never touched, which is what lets React see the change.
 *
 * Sound and particles are driven off the engine's outcome object, so the
 * presentation never re-derives what happened from the state — it is told.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Achievements from './game/achievements.ts';
import type { Achievement, AchievementEvent } from './game/achievements.ts';
import * as Art from './game/art.ts';
import * as Audio from './game/audio.ts';
import * as C from './game/config.ts';
import * as Engine from './game/engine.ts';
import * as I18n from './game/i18n.ts';
import { t } from './game/i18n.ts';
import * as Fx from './game/particles.ts';
import * as Prefs from './game/prefs.ts';
import type { PrefKey, PrefValues } from './game/prefs.ts';
import * as Stats from './game/stats.ts';
import * as Storage from './game/storage.ts';
import type { FightMode, GameState, LogParams, Outcome, PresetId } from './game/types.ts';
import { Chronicle } from './components/Chronicle.tsx';
import { DebugPanel } from './components/DebugPanel.tsx';
import { EndModal } from './components/EndModal.tsx';
import { Hud } from './components/Hud.tsx';
import { Room } from './components/Room.tsx';
import { RulesModal } from './components/RulesModal.tsx';
import { SettingsModal } from './components/SettingsModal.tsx';
import { StatsModal } from './components/StatsModal.tsx';
import { Toasts, type ToastItem } from './components/Toasts.tsx';
import { WelcomeModal } from './components/WelcomeModal.tsx';
import { useLang, usePrefs } from './hooks.ts';
import { presetName } from './labels.ts';

type ModalName = 'rules' | 'settings' | 'stats' | 'end' | 'welcome';

/** Where focus should land after the next render. */
type FocusRequest = { to: 'first' } | { to: 'engage'; index: number } | { to: 'card'; index: number };

const params = new URLSearchParams(window.location.search);

/**
 * ?seed=… always deals that dungeon, overriding any saved run; otherwise pick
 * up where the last visit left off.
 */
function initialGame(): GameState {
  const seed = params.get('seed');
  if (seed) return Engine.create(seed, Prefs.get('preset'));
  return Storage.load() ?? Engine.create(undefined, Prefs.get('preset'));
}

/* ------------------------------------------------------------------ *
 * Coaching
 *
 * One-off notes pushed into the chronicle the first time something that
 * needs explaining actually happens. Teaching a rule at the moment it bites
 * beats front-loading it in a modal nobody reads twice. Each fires once per
 * browser and the whole thing can be switched off in Settings.
 * ------------------------------------------------------------------ */

const COACH_KEY = 'scoundrel:coached:v1';
let coached: Set<string> | null = null;

function coachSeen(): Set<string> {
  if (coached) return coached;
  try {
    coached = new Set(JSON.parse(localStorage.getItem(COACH_KEY) || '[]'));
  } catch {
    coached = new Set();
  }
  return coached;
}

/**
 * Push a one-off tip into the chronicle, stored as a key like every other
 * entry so it re-translates when the language changes.
 */
function coach(state: GameState, id: string, params?: LogParams): void {
  if (!Prefs.get('coach') || state.status !== 'playing') return;
  const seen = coachSeen();
  if (seen.has(id)) return;
  seen.add(id);
  try {
    localStorage.setItem(COACH_KEY, JSON.stringify([...seen]));
  } catch { /* a lost tip is not worth breaking the turn over */ }
  state.log.push({
    id: (state.logSeq += 1),
    key: `coach.${id}`,
    params: params || null,
    kind: 'coach',
    turn: state.turn,
  });
}

interface Snapshot {
  health: number;
  potionUsed: boolean;
  weapon: { card: { id: string }; lastSlain: number | null } | null;
}

/** Watch what just happened and teach the rule behind it. */
function coachOn(state: GameState, before: Snapshot): void {
  if (!state.weapon) {
    if (before.health > state.health) coach(state, 'bare');
  } else if (!before.weapon || before.weapon.card.id !== state.weapon.card.id) {
    coach(state, 'equipped');
  } else if (state.weapon.lastSlain !== null && before.weapon.lastSlain === null) {
    coach(state, 'capped', { cap: state.weapon.lastSlain });
  }
  if (state.potionUsed && !before.potionUsed) coach(state, 'potion');
  if (Engine.canAvoid(state) && state.turn >= 2) coach(state, 'avoid');
}

const typing = (node: EventTarget | null) =>
  node instanceof HTMLElement
  && (node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.isContentEditable);

export default function App() {
  const lang = useLang();
  const prefs = usePrefs();

  const [game, setGame] = useState<GameState>(initialGame);
  /** Bumped for every freshly dealt run, which remounts the room and log. */
  const [run, setRun] = useState(0);
  /** Which slot is asking "weapon or bare hands?" — UI-only state. */
  const [choosing, setChoosing] = useState(-1);
  const [modal, setModal] = useState<ModalName | null>(() => {
    // First visit ever: a three-point primer instead of dropping someone into
    // a dungeon with no explanation. Shown once, then never again.
    if (!Prefs.get('seenWelcome')) return 'welcome';
    return null;
  });
  const [debug, setDebug] = useState(params.has('debug'));
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const gameRef = useRef(game);
  const busy = useRef(false);
  const focusRequest = useRef<FocusRequest | null>(null);
  const endTimer = useRef<number | undefined>(undefined);
  const toastSeq = useRef(0);
  const roomRef = useRef<HTMLUListElement>(null);
  const avoidRef = useRef<HTMLButtonElement>(null);

  /* ------------------------------------------------------------------ *
   * Lifecycle
   * ------------------------------------------------------------------ */

  const addToast = useCallback((achievement: Achievement) => {
    toastSeq.current += 1;
    const key = toastSeq.current;
    // Never let a pile-up push the room off screen.
    setToasts((list) => [...list, { key, achievement, leaving: false }].slice(-3));
    const life = Prefs.reduceMotion() ? 6000 : 4600;
    window.setTimeout(() => {
      setToasts((list) => list.map((item) => (item.key === key ? { ...item, leaving: true } : item)));
      window.setTimeout(() => setToasts((list) => list.filter((item) => item.key !== key)), 400);
    }, life);
  }, []);

  const checkAchievements = useCallback((state: GameState, event: AchievementEvent) => {
    let fresh: Achievement[] = [];
    try {
      fresh = Achievements.check({ stats: Stats.all(), state, event });
    } catch (err) {
      console.warn('[Scoundrel] achievement check failed:', err);
      return;
    }
    fresh.forEach((a, i) => {
      // Stagger so two at once do not land on the same frame.
      window.setTimeout(() => {
        addToast(a);
        Audio.play('unlock');
      }, 260 + i * 700);
    });
  }, [addToast]);

  /**
   * Save and show a new state.
   *
   * A finished run is folded into the lifetime record once and only once. The
   * guard lives on the state because the state is what gets saved: finish a
   * run, close the tab, come back, and the end screen shows again — but the
   * run must not be counted a second time.
   */
  const commit = useCallback((next: GameState, { checkEnd = true } = {}) => {
    if (next.status !== 'playing' && !next.recorded) {
      next.recorded = true;
      Stats.record(next);
    }
    Storage.save(next);
    gameRef.current = next;
    setGame(next);

    if (checkEnd && next.status !== 'playing') {
      const won = next.status === 'won';
      // Let the last card's flip and the damage flash land first.
      window.clearTimeout(endTimer.current);
      endTimer.current = window.setTimeout(() => {
        setModal('end');
        Audio.play(won ? 'win' : 'lose');
        if (won) Fx.rain('gold');
      }, 420);
      checkAchievements(next, { type: 'end' });
    }
  }, [checkAchievements]);

  /** Deal a fresh dungeon, under the given ruleset or the current setting. */
  const deal = useCallback((seed?: string, preset?: PresetId, takeFocus = true) => {
    window.clearTimeout(endTimer.current);
    setChoosing(-1);
    Fx.clear();
    setRun((n) => n + 1);
    setModal((m) => (m === 'end' ? null : m));
    commit(Engine.create(seed, preset ?? Prefs.get('preset')), { checkEnd: false });
    if (takeFocus) focusRequest.current = { to: 'first' };
  }, [commit]);

  const startGame = useCallback((seed?: string) => deal(seed || undefined), [deal]);

  /** Same seed and ruleset, from the top. */
  const restart = useCallback(() => {
    const { seed, preset } = gameRef.current;
    deal(seed, preset);
  }, [deal]);

  /** Deal a past run again, with the ruleset it was played under. */
  const replaySeed = useCallback((seed: string, preset: PresetId) => {
    if (preset && Prefs.get('preset') !== preset) Prefs.set('preset', preset);
    setModal(null);
    deal(seed, preset);
  }, [deal]);

  /* ------------------------------------------------------------------ *
   * Feedback
   * ------------------------------------------------------------------ */

  /** The card element a burst should come from, if it is still on screen. */
  const nodeFor = (card: { id: string }) =>
    roomRef.current?.querySelector(`.slot[data-card-id="${card.id}"] .card`) ?? roomRef.current;

  const feedback = (outcome: Outcome) => {
    const node = nodeFor(outcome.card);

    if (outcome.kind === 'weapon') {
      Audio.play('equip');
      Fx.burst(node, 'equip', 0.5);
      return;
    }
    if (outcome.kind === 'potion') {
      if (outcome.wasted) return; // a wasted potion gets no fanfare
      Audio.play('potion');
      Fx.burst(node, 'heal', Math.min(1, outcome.healed / 8));
      return;
    }
    // Monster. A clean kill and a costly one should not feel the same.
    if (outcome.clean) {
      Audio.play('kill');
      Fx.burst(node, 'kill', 0.85);
    } else {
      Audio.play('hit', outcome.damage);
      Fx.burst(node, 'damage', Math.min(1, outcome.damage / 10));
      if (!Prefs.reduceMotion()) {
        document.body.classList.remove('is-struck');
        void document.body.offsetWidth; // restart the animation
        document.body.classList.add('is-struck');
      }
    }
  };

  /** Hold input for the deal, so a fast click does not land on a card that
   *  slid into a slot under the cursor. */
  const holdInput = () => {
    busy.current = true;
    window.setTimeout(() => { busy.current = false; }, 260);
  };

  /* ------------------------------------------------------------------ *
   * Actions
   * ------------------------------------------------------------------ */

  const play = (index: number, mode: FightMode) => {
    const current = gameRef.current;
    if (busy.current || current.status !== 'playing') return;
    // Playing a card disables its button, which would drop focus to <body>.
    // Only recover it if the player was actually working the keyboard here.
    const hadFocus = !!roomRef.current?.contains(document.activeElement);
    const snapshot: Snapshot = {
      health: current.health,
      potionUsed: current.potionUsed,
      weapon: current.weapon && { card: current.weapon.card, lastSlain: current.weapon.lastSlain },
    };

    const next = structuredClone(current);
    const outcome = Engine.resolve(next, index, mode);
    if (!outcome) return;
    feedback(outcome);
    setChoosing(-1);
    coachOn(next, snapshot);

    if (outcome.roomEnded && next.status === 'playing') holdInput();
    commit(next);
    checkAchievements(next, { type: 'resolve', ...outcome });
    if (hadFocus && next.status === 'playing') focusRequest.current = { to: 'first' };
  };

  const avoid = () => {
    const current = gameRef.current;
    if (busy.current || !Engine.canAvoid(current)) return;
    // The Avoid button disables itself the moment it works, so send focus into
    // the new room rather than letting it fall to <body>.
    const fromKeyboard = document.activeElement === avoidRef.current
      || !!roomRef.current?.contains(document.activeElement);
    setChoosing(-1);
    const next = structuredClone(current);
    Engine.avoid(next);
    Audio.play('avoid');
    holdInput();
    commit(next);
    checkAchievements(next, { type: 'avoid' });
    if (fromKeyboard && next.status === 'playing') focusRequest.current = { to: 'first' };
  };

  /**
   * A card was pressed. Monsters that the weapon could legally take open the
   * weapon-or-fists prompt instead of resolving straight away; everything else
   * resolves on the spot.
   */
  const pressCard = (index: number) => {
    const current = gameRef.current;
    if (busy.current || current.status !== 'playing') return;
    const slot = current.room[index];
    if (!slot || slot.done) return;

    if (slot.card.kind === 'monster' && Engine.canUseWeapon(current, slot.card)) {
      const next = choosing === index ? -1 : index;
      setChoosing(next);
      if (next >= 0) focusRequest.current = { to: 'engage', index };
      return;
    }
    play(index, 'bare');
  };

  const cancelChoice = () => {
    if (choosing < 0) return;
    focusRequest.current = { to: 'card', index: choosing };
    setChoosing(-1);
  };

  // Apply a pending focus move once the DOM it points at exists.
  useEffect(() => {
    const request = focusRequest.current;
    const room = roomRef.current;
    if (!request || !room) return;
    focusRequest.current = null;
    let target: HTMLElement | null = null;
    if (request.to === 'first') target = room.querySelector('.card__btn:not([disabled])');
    else if (request.to === 'engage') target = room.querySelector(`.engage__btn[data-index="${request.index}"]`);
    else target = room.querySelector(`.card__btn[data-index="${request.index}"]`);
    target?.focus({ preventScroll: true });
  });

  /* ------------------------------------------------------------------ *
   * Settings
   * ------------------------------------------------------------------ */

  const changePref = <K extends PrefKey>(key: K, value: PrefValues[K]) => {
    Prefs.set(key, value);
    if (key === 'sound' && value) {
      Audio.unlock();
      Audio.play('flip'); // confirm it works
    } else if (key === 'particles') {
      if (value) Fx.burst(avoidRef.current, 'gold', 0.4);
      else Fx.clear();
    }
  };

  /* ------------------------------------------------------------------ *
   * Keyboard
   * ------------------------------------------------------------------ */

  const onKey = (event: KeyboardEvent) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (typing(event.target)) return;
    // An open dialog handles its own keys; Esc closes it natively.
    if (modal) return;

    if (event.key === 'Escape' && choosing >= 0) {
      event.preventDefault();
      cancelChoice();
      return;
    }

    const key = event.key.toLowerCase();

    // Arrow keys walk the playable cards, so the room behaves like one control
    // rather than four separate tab stops.
    if (['arrowleft', 'arrowright', 'home', 'end'].includes(key)) {
      const cards = [...(roomRef.current?.querySelectorAll<HTMLButtonElement>('.card__btn:not([disabled])') ?? [])];
      if (cards.length) {
        event.preventDefault();
        const at = cards.indexOf(document.activeElement as HTMLButtonElement);
        const next = key === 'home' ? 0
          : key === 'end' ? cards.length - 1
            : at < 0 ? 0
              : (at + (key === 'arrowright' ? 1 : cards.length - 1)) % cards.length;
        cards[next].focus();
      }
      return;
    }

    if (key >= '1' && key <= '4') {
      event.preventDefault();
      pressCard(Number(key) - 1);
      return;
    }
    const actions: Record<string, () => void> = {
      a: avoid,
      n: () => startGame(),
      r: restart,
      '?': () => setModal('rules'),
      h: () => setModal('rules'),
      s: () => setModal('settings'),
      t: () => setModal('stats'),
      '`': () => setDebug((d) => !d),
    };
    const action = actions[key];
    if (action) {
      event.preventDefault();
      action();
    }
  };

  // One listener for the app's lifetime, always calling the latest handler.
  const keyHandler = useRef(onKey);
  keyHandler.current = onKey;
  useEffect(() => {
    const listener = (event: KeyboardEvent) => keyHandler.current(event);
    document.addEventListener('keydown', listener);
    return () => document.removeEventListener('keydown', listener);
  }, []);

  /* ------------------------------------------------------------------ *
   * Go
   * ------------------------------------------------------------------ */

  useEffect(() => {
    // Persist whatever the first render dealt or resumed.
    Storage.save(gameRef.current);
    // A finished run picked up from the save goes straight to its end screen.
    if (gameRef.current.status !== 'playing') setModal((m) => m ?? 'end');
    if (!Prefs.get('seenWelcome')) Prefs.set('seenWelcome', true);

    // Eleven illustrations cover the whole deck; fetch them before the first
    // flip so no card turns over to an empty rectangle.
    Art.preload();

    // Browsers refuse to start an AudioContext before the player has
    // interacted with the page. Create it on the first gesture, once.
    const once = () => {
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
      if (Prefs.get('sound')) Audio.unlock();
    };
    window.addEventListener('pointerdown', once);
    window.addEventListener('keydown', once);
    return () => {
      window.removeEventListener('pointerdown', once);
      window.removeEventListener('keydown', once);
    };
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  // Handy from the console: ScoundrelGame.state, .start('seed')
  useEffect(() => {
    (window as unknown as { ScoundrelGame: unknown }).ScoundrelGame = {
      get state() { return gameRef.current; },
      start: startGame,
      restart,
      replay: replaySeed,
      debug: (show?: boolean) => setDebug((d) => (show === undefined ? !d : show)),
      stats: () => Stats.all(),
      prefs: () => Prefs.all(),
      lang: (next?: string) => (next ? I18n.setLang(next) : I18n.getLang()),
      achievements: () => Achievements.all({ stats: Stats.all(), state: gameRef.current, event: { type: 'view' } }),
    };
  }, [startGame, restart, replaySeed]);

  const closeModal = () => setModal(null);
  const openModal = (name: ModalName) => () => setModal(name);

  return (
    <>
      <a className="skip-link" href="#room">{t('app.skip')}</a>

      <div className="app" id="app" data-status={game.status}>
        <Hud state={game} avoidRef={avoidRef} onAvoid={avoid} />

        <main className="board">
          <Room
            key={`room-${run}`}
            state={game}
            choosing={choosing}
            showThreat={prefs.showThreat}
            reduceMotion={Prefs.reduceMotion()}
            roomRef={roomRef}
            onPress={pressCard}
            onPlay={play}
            onCancel={cancelChoice}
          />
          <Chronicle key={`log-${run}`} log={game.log} />
        </main>

        <footer className="controls">
          <button type="button" className="btn" id="newGameBtn" onClick={() => startGame()}>
            <span className="btn__key" aria-hidden="true">N</span><span>{t('ctl.newGame')}</span>
          </button>
          <button type="button" className="btn" id="restartBtn" onClick={restart}>
            <span className="btn__key" aria-hidden="true">R</span><span>{t('ctl.restart')}</span>
          </button>
          <button type="button" className="btn" id="rulesBtn" onClick={openModal('rules')}>
            <span className="btn__key" aria-hidden="true">?</span><span>{t('ctl.rules')}</span>
          </button>
          <button type="button" className="btn" id="statsBtn" onClick={openModal('stats')}>
            <span className="btn__key" aria-hidden="true">T</span><span>{t('ctl.record')}</span>
          </button>
          <button type="button" className="btn" id="settingsBtn" onClick={openModal('settings')}>
            <span className="btn__key" aria-hidden="true">S</span><span>{t('ctl.settings')}</span>
          </button>
          <p className="seed-readout">
            <span>{t('hud.seed')}</span> <code id="seedReadout">{game.seed}</code>{' '}
            <span className="seed-preset" id="presetReadout">
              {game.preset && game.preset !== C.DEFAULT_PRESET ? `· ${presetName(game.preset)}` : ''}
            </span>
          </p>
        </footer>
      </div>

      <RulesModal open={modal === 'rules'} onClose={closeModal} />
      <EndModal
        state={game}
        open={modal === 'end'}
        onClose={closeModal}
        onNew={() => startGame()}
        onRetry={restart}
      />
      <WelcomeModal
        open={modal === 'welcome'}
        onClose={closeModal}
        onStart={() => {
          setModal(null);
          focusRequest.current = { to: 'first' };
        }}
        onRules={openModal('rules')}
      />
      <SettingsModal
        open={modal === 'settings'}
        onClose={closeModal}
        prefs={prefs}
        onLang={I18n.setLang}
        onPref={changePref}
        onSeed={(seed) => { setModal(null); startGame(seed); }}
        onReset={Prefs.reset}
      />
      <StatsModal state={game} open={modal === 'stats'} onClose={closeModal} onReplay={replaySeed} />

      <Toasts items={toasts} />

      {debug && <DebugPanel state={game} onDeal={(seed) => { startGame(seed); setDebug(true); }} />}
    </>
  );
}
