import { t } from '../game/i18n.ts';
import { Modal } from './Modal.tsx';
import { Html } from './Text.tsx';

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
  onRules: () => void;
}

/** First visit only: a three-point primer instead of the full rules. */
export function WelcomeModal({ open, onClose, onStart, onRules }: WelcomeModalProps) {
  return (
    <Modal
      id="welcomeModal"
      className="modal modal--welcome"
      open={open}
      onClose={onClose}
      labelledBy="welcomeTitle"
      closeOnBackdrop={false}
    >
      <p className="end__eyebrow">{t('welcome.eyebrow')}</p>
      <h2 id="welcomeTitle">{t('welcome.title')}</h2>
      <div className="modal__body prose">
        <p>{t('welcome.lead')}</p>
        <ol className="welcome__steps">
          <Html as="li" k="welcome.s1" />
          <Html as="li" k="welcome.s2" />
          <Html as="li" k="welcome.s3" />
        </ol>
        <p className="welcome__note">{t('welcome.note')}</p>
      </div>
      <div className="end__actions">
        <button type="button" className="btn btn--primary" onClick={onStart}>{t('welcome.start')}</button>
        <button type="button" className="btn" onClick={onRules}>{t('welcome.rules')}</button>
      </div>
    </Modal>
  );
}
