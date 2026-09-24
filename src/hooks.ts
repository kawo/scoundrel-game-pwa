/*
 * Bridges from the game's module-level stores to React.
 *
 * Preferences and the current language live outside React (the engine tests
 * and the audio/particle modules read them too), so components subscribe with
 * useSyncExternalStore rather than copying them into state.
 */
import { useSyncExternalStore } from 'react';
import * as I18n from './game/i18n.ts';
import * as Prefs from './game/prefs.ts';

/** The current language; re-renders the caller when it changes. */
export const useLang = (): I18n.Lang =>
  useSyncExternalStore(I18n.onChange, I18n.getLang);

/** The current preferences; re-renders the caller when any of them changes. */
export const usePrefs = (): Prefs.PrefValues =>
  useSyncExternalStore(Prefs.onChange, Prefs.all);
