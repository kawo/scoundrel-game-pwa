import { useEffect, useState } from 'react';
import * as Achievements from '../game/achievements.ts';
import { t, td } from '../game/i18n.ts';
import * as Stats from '../game/stats.ts';
import type { RunRow } from '../game/stats.ts';
import type { GameState, PresetId } from '../game/types.ts';
import { presetName, signed, when } from '../labels.ts';
import { CloseButton, Modal } from './Modal.tsx';

/**
 * The local leaderboard: your own top ten by score.
 *
 * Deliberately local. A shared board that could be trusted needs a server to
 * verify runs, and this game has none by design.
 */
const bestRuns = (history: RunRow[]) => history.slice().sort((a, b) => b.score - a.score).slice(0, 10);

function Runs({ runs, emptyText, ranked, onReplay }: {
  runs: RunRow[];
  emptyText: string;
  ranked: boolean;
  onReplay: (seed: string, preset: PresetId) => void;
}) {
  if (!runs.length) return <p className="history__empty">{emptyText}</p>;
  return (
    <ol className="history__list">
      {runs.map((run, i) => (
        <li
          key={`${run.at}-${run.seed}-${i}`}
          className="history__row"
          data-status={run.status}
          data-rank={ranked ? i + 1 : undefined}
        >
          {ranked && <span className="history__rank" aria-hidden="true">{i + 1}</span>}
          <span className="history__score">{signed(run.score)}</span>
          <span className="history__meta">
            <b>{run.status === 'won' ? t('rec.cleared') : t('rec.fell', { n: run.turns })}</b>
            <i>{t('rec.rowMeta', { preset: presetName(run.preset), seed: run.seed, when: when(run.at) })}</i>
          </span>
          <button type="button" className="btn btn--sm" onClick={() => onReplay(run.seed, run.preset)}>
            {t('rec.replay')}<span className="sr-only">{t('rec.replayAria', { seed: run.seed })}</span>
          </button>
        </li>
      ))}
    </ol>
  );
}

function Trophies({ state }: { state: GameState }) {
  const list = Achievements.all({ stats: Stats.all(), state, event: { type: 'view' } });
  const { unlocked, total } = Achievements.count();
  return (
    <>
      <h3>
        <span>{t('rec.trophies')}</span>{' '}
        <span className="trophy-count" id="trophyCount">{t('rec.trophyCount', { n: unlocked, total })}</span>
      </h3>
      <ul className="trophies" id="trophyList">
        {list.map((a) => (
          <li key={a.id} className="trophy-row" data-unlocked={String(a.unlocked)} data-kind={a.kind}>
            <span className="trophy-mark" aria-hidden="true">{a.unlocked ? '★' : '☆'}</span>
            <span className="trophy-body">
              <b>{td(`ach.${a.id}.title`, a.title)}</b>
              <i>{td(`ach.${a.id}.desc`, a.desc)}</i>
              {a.bar && (
                <>
                  <span className="trophy-bar"><span style={{ width: `${(a.bar.current / a.bar.goal) * 100}%` }} /></span>
                  <span className="trophy-progress">{a.bar.current} / {a.bar.goal}</span>
                </>
              )}
            </span>
            <span className="sr-only">{a.unlocked ? t('rec.unlocked') : t('rec.locked')}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

interface StatsModalProps {
  state: GameState;
  open: boolean;
  onClose: () => void;
  onReplay: (seed: string, preset: PresetId) => void;
}

export function StatsModal({ state, open, onClose, onReplay }: StatsModalProps) {
  // The record lives outside React; bumping this re-reads it after a reset.
  const [, setVersion] = useState(0);
  // Two-step clear: wiping a record is not undoable, so make it deliberate.
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) return undefined;
    const timer = window.setTimeout(() => setArmed(false), 4000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  const clearRecord = () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    // Several trophies are derived from the record, so leaving them unlocked
    // after wiping it would be incoherent.
    Stats.reset();
    Achievements.reset();
    setArmed(false);
    setVersion((v) => v + 1);
  };

  const s = Stats.all();
  const rate = Stats.winRate();
  const cells: [string, string | number][] = [
    [t('rec.runs'), s.games],
    [t('rec.won'), s.wins],
    [t('rec.winRate'), rate === null ? '—' : `${rate.toFixed(0)}%`],
    [t('rec.best'), signed(s.bestScore)],
    [t('rec.streak'), s.currentStreak],
    [t('rec.longest'), s.longestStreak],
  ];

  return (
    <Modal id="statsModal" open={open} onClose={onClose} labelledBy="statsTitle">
      <CloseButton label={t('rec.close')} />
      <h2 id="statsTitle">{t('rec.title')}</h2>
      {/* Only rendered while open, so the numbers are read fresh each time. */}
      {open && (
        <div className="modal__body">
          <dl className="scoreboard" id="scoreboard">
            {cells.map(([term, value]) => (
              <div key={term} className="scoreboard__cell"><dt>{term}</dt><dd>{value}</dd></div>
            ))}
          </dl>

          <h3 id="boardHeading">{t('rec.bestRuns')}</h3>
          <p className="field__hint">{t('rec.bestRunsHint')}</p>
          <div className="history" id="boardList">
            <Runs runs={bestRuns(s.history)} emptyText={t('rec.emptyBoard')} ranked onReplay={onReplay} />
          </div>

          <h3>{t('rec.recent')}</h3>
          <div className="history" id="historyList">
            <Runs runs={s.history} emptyText={t('rec.emptyHistory')} ranked={false} onReplay={onReplay} />
          </div>

          <Trophies state={state} />

          <p className="field__danger">
            <button type="button" className="btn btn--sm btn--ghost" data-armed={String(armed)} onClick={clearRecord}>
              {armed ? t('rec.clearConfirm') : t('rec.clear')}
            </button>
          </p>
        </div>
      )}
    </Modal>
  );
}
