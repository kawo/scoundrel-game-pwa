import * as C from '../game/config.ts';
import * as Engine from '../game/engine.ts';
import { t } from '../game/i18n.ts';
import type { GameState } from '../game/types.ts';
import { cardName, signed } from '../labels.ts';
import { StaticCard } from './Card.tsx';
import { Modal } from './Modal.tsx';

interface EndModalProps {
  state: GameState;
  open: boolean;
  onClose: () => void;
  onNew: () => void;
  onRetry: () => void;
}

export function EndModal({ state, open, onClose, onNew, onRetry }: EndModalProps) {
  const over = state.status !== 'playing';
  const won = state.status === 'won';

  return (
    <Modal
      id="endModal"
      className="modal modal--end"
      open={open && over}
      onClose={onClose}
      labelledBy="endTitle"
      result={won ? 'won' : 'lost'}
    >
      <div className="end">
        <p className="end__eyebrow" id="endEyebrow">{won ? t('end.wonEyebrow') : t('end.lostEyebrow')}</p>
        <h2 id="endTitle">
          {won
            ? t('end.wonTitle')
            : (state.killer ? t('end.lostTitle', { name: cardName(state.killer) }) : t('end.lostTitleDark'))}
        </h2>
        {/* The monster that finished you. `killer` is a full card object and is
            saved with the run, so this survives a reload on a finished game. */}
        {!won && state.killer && (
          <div className="end__card" id="endCard">
            <StaticCard card={state.killer} caption={t('end.killerCaption')} />
          </div>
        )}
        <p className="end__score">
          <span className="sr-only">{t('end.score')}</span>
          <output id="endScore">{signed(state.score ?? 0)}</output>
        </p>
        <p className="end__detail" id="endDetail">
          {won
            ? t('end.wonDetail', { n: state.health, max: C.MAX_HEALTH, turns: state.turn })
            : t('end.lostDetail', { n: Engine.remainingMonsterValue(state), turns: state.turn })}
        </p>
        <div className="end__actions">
          <button type="button" className="btn btn--primary" onClick={onNew}>{t('end.newGame')}</button>
          <button type="button" className="btn" onClick={onRetry}>{t('end.retry')}</button>
          <button type="button" className="btn btn--ghost" onClick={onClose}>{t('end.close')}</button>
        </div>
      </div>
    </Modal>
  );
}
