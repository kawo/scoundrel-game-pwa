import { t } from '../game/i18n.ts';
import { CloseButton, Modal } from './Modal.tsx';
import { Html } from './Text.tsx';

export function RulesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal id="rulesModal" open={open} onClose={onClose} labelledBy="rulesTitle">
      <CloseButton label={t('rules.close')} />
      <h2 id="rulesTitle">{t('rules.title')}</h2>
      <div className="modal__body prose">
        <Html as="p" k="rules.lead" />

        <h3>{t('rules.deck')}</h3>
        <ul>
          <Html as="li" k="rules.deckMonsters" />
          <Html as="li" k="rules.deckWeapons" />
          <Html as="li" k="rules.deckPotions" />
        </ul>

        <h3>{t('rules.each')}</h3>
        <p>{t('rules.eachLead')}</p>
        <ul>
          <Html as="li" k="rules.avoid" />
          <Html as="li" k="rules.face" />
        </ul>

        <h3>{t('rules.cards')}</h3>
        <ul>
          <Html as="li" k="rules.cardWeapon" />
          <Html as="li" k="rules.cardPotion" />
          <Html as="li" k="rules.cardMonster" />
        </ul>

        <h3>{t('rules.weaponRule')}</h3>
        <Html as="p" k="rules.weaponLead" />
        <div className="example">
          <Html as="p" k="rules.exLead" />
          <ol>
            <Html as="li" k="rules.ex1" />
            <Html as="li" k="rules.ex2" />
            <Html as="li" k="rules.ex3" />
            <Html as="li" k="rules.ex4" />
          </ol>
        </div>

        <h3>{t('rules.score')}</h3>
        <ul>
          <Html as="li" k="rules.scoreWon" />
          <Html as="li" k="rules.scoreLost" />
        </ul>

        <h3>{t('rules.keyboard')}</h3>
        <ul className="keys">
          <Html as="li" k="rules.k1" />
          <Html as="li" k="rules.k2" />
          <Html as="li" k="rules.k3" />
          <Html as="li" k="rules.k4" />
          <Html as="li" k="rules.k5" />
        </ul>
      </div>
    </Modal>
  );
}
