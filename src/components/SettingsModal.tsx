import { useState, type FormEvent } from 'react';
import * as C from '../game/config.ts';
import { LANGS, getLang, t } from '../game/i18n.ts';
import type { PrefKey, PrefValues } from '../game/prefs.ts';
import { presetBlurb, presetName } from '../labels.ts';
import { CloseButton, Modal } from './Modal.tsx';

interface Choice {
  id: string;
  name: string;
  blurb: string;
}

/**
 * One radio group. Real <input type="radio"> rather than buttons with
 * aria-checked, so arrow-key behaviour and the accessibility tree come from
 * the browser instead of being re-implemented here.
 */
function ChoiceGroup({ name, options, current, onPick }: {
  name: string;
  options: Choice[];
  current: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="choices">
      {options.map((opt) => {
        const id = `${name}-${opt.id}`;
        return (
          <label key={opt.id} className="choice" htmlFor={id}>
            <input
              type="radio"
              id={id}
              name={name}
              value={opt.id}
              checked={opt.id === current}
              onChange={() => onPick(opt.id)}
            />
            <span className="choice__body">
              <b>{opt.name}</b>
              {opt.blurb && <i>{opt.blurb}</i>}
            </span>
          </label>
        );
      })}
    </div>
  );
}

function Switch({ id, checked, title, blurb, onToggle }: {
  id: string;
  checked: boolean;
  title: string;
  blurb: string;
  onToggle: (on: boolean) => void;
}) {
  return (
    <label className="switch">
      <input type="checkbox" id={id} checked={checked} onChange={(e) => onToggle(e.target.checked)} />
      <span className="switch__box" aria-hidden="true" />
      <span className="switch__text"><b>{title}</b><i>{blurb}</i></span>
    </label>
  );
}

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  prefs: PrefValues;
  onLang: (lang: string) => void;
  onPref: <K extends PrefKey>(key: K, value: PrefValues[K]) => void;
  onSeed: (seed: string) => void;
  onReset: () => void;
}

export function SettingsModal({ open, onClose, prefs, onLang, onPref, onSeed, onReset }: SettingsModalProps) {
  const [seed, setSeed] = useState('');

  const submitSeed = (event: FormEvent) => {
    event.preventDefault();
    onSeed(seed.trim());
  };

  return (
    <Modal id="settingsModal" open={open} onClose={onClose} labelledBy="settingsTitle">
      <CloseButton label={t('set.close')} />
      <h2 id="settingsTitle">{t('set.title')}</h2>
      <div className="modal__body">

        <fieldset className="field">
          <legend>{t('set.language')}</legend>
          <p className="field__hint">{t('set.languageHint')}</p>
          <ChoiceGroup
            name="lang"
            options={Object.entries(LANGS).map(([id, meta]) => ({ id, name: meta.label, blurb: '' }))}
            current={getLang()}
            onPick={onLang}
          />
        </fieldset>

        <fieldset className="field">
          <legend>{t('set.ruleset')}</legend>
          <p className="field__hint">{t('set.rulesetHint')}</p>
          <ChoiceGroup
            name="preset"
            options={Object.values(C.PRESETS).map((preset) => ({
              id: preset.id, name: presetName(preset.id), blurb: presetBlurb(preset.id),
            }))}
            current={prefs.preset}
            onPick={(id) => { if (C.isPreset(id)) onPref('preset', id); }}
          />
        </fieldset>

        <fieldset className="field">
          <legend>{t('set.motion')}</legend>
          <p className="field__hint">{t('set.motionHint')}</p>
          <ChoiceGroup
            name="motion"
            options={[
              { id: 'system', name: t('set.motionSystem'), blurb: t('set.motionSystemBlurb') },
              { id: 'reduced', name: t('set.motionReduced'), blurb: t('set.motionReducedBlurb') },
              { id: 'full', name: t('set.motionFull'), blurb: t('set.motionFullBlurb') },
            ]}
            current={prefs.motion}
            onPick={(id) => onPref('motion', id as PrefValues['motion'])}
          />
        </fieldset>

        <fieldset className="field">
          <legend>{t('set.feel')}</legend>
          <Switch id="soundToggle" checked={prefs.sound} title={t('set.sound')} blurb={t('set.soundBlurb')}
            onToggle={(on) => onPref('sound', on)} />
          <Switch id="particlesToggle" checked={prefs.particles} title={t('set.particles')} blurb={t('set.particlesBlurb')}
            onToggle={(on) => onPref('particles', on)} />
        </fieldset>

        <fieldset className="field">
          <legend>{t('set.help')}</legend>
          <Switch id="showThreatToggle" checked={prefs.showThreat} title={t('set.threat')} blurb={t('set.threatBlurb')}
            onToggle={(on) => onPref('showThreat', on)} />
          <Switch id="coachToggle" checked={prefs.coach} title={t('set.coach')} blurb={t('set.coachBlurb')}
            onToggle={(on) => onPref('coach', on)} />
        </fieldset>

        <fieldset className="field">
          <legend>{t('set.seed')}</legend>
          <p className="field__hint">{t('set.seedHint')}</p>
          <form className="seed-form" id="settingsSeedForm" onSubmit={submitSeed}>
            <label className="sr-only" htmlFor="settingsSeedInput">{t('hud.seed')}</label>
            <input
              id="settingsSeedInput"
              name="seed"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={t('set.seedPlaceholder')}
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
            />
            <button className="btn btn--sm" type="submit">{t('set.seedGo')}</button>
          </form>
        </fieldset>

        <p className="field__danger">
          <button type="button" className="btn btn--sm btn--ghost" onClick={onReset}>{t('set.reset')}</button>
        </p>
      </div>
    </Modal>
  );
}
