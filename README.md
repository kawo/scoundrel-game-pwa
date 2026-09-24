# Scoundrel

A solo dungeon-crawl card game, played with 44 cards: React + TypeScript + Vite.

This is a React port of the vanilla JS version in
[`kawo/zero-to-mastery` › `vibe-coding-bootcamp/scoundrel-game`](https://github.com/kawo/zero-to-mastery/tree/main/vibe-coding-bootcamp/scoundrel-game).
The game rules, translations, sounds and artwork are unchanged. See that
README for the full rules.

## Scripts

```shell
npm install
npm run dev        # dev server with hot reload
npm run build      # type-check and build to dist/
npm run preview    # serve the built dist/
npm test           # engine tests (add -- --full for the slow winnability check)
npm run lint
```

`npm test` runs the TypeScript game modules directly under Node 24, which
strips the types itself, so the tests need no test framework or build step.

## Offline / installable (PWA)

The game can be installed as an app and runs with no network at all after the
first visit. [`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/) creates a
service worker that precaches the whole build: code, styles, card art, icons
and fonts. The fonts are bundled locally from `@fontsource` (see
`src/fonts.ts`), so nothing is loaded from Google Fonts. Settings live in
`vite.config.ts`.

- The service worker only runs in production builds. To try it, run
  `npm run build && npm run preview`, then open the preview URL.
- New versions install themselves (`registerType: 'autoUpdate'`) and take
  over on the next load. Updating mid-game is safe, because the game saves
  after every card.
- The icons in `public/` (`pwa-192x192.png`, `pwa-512x512.png`,
  `maskable-512x512.png`) are made from `favicon.svg`. The maskable icon has
  extra padding so Android's round crop doesn't cut the spade.

## Layout

| Path | What it is |
| --- | --- |
| `src/game/` | Pure game logic, no React: `engine`, `config`, `rng`, `storage`, `prefs`, `stats`, `achievements`, `i18n`, plus the imperative `audio` and `particles` |
| `src/components/` | The UI: `Hud`, `Room`/`Card`, `Chronicle`, and the modals |
| `src/App.tsx` | Wiring: owns the game state, turns input into engine calls, saves |
| `src/labels.ts` | Translated text built from game data (card names, chronicle lines) |
| `src/hooks.ts` | `useLang` / `usePrefs`, which subscribe React to the game's stores |
| `src/styles.css` | The original stylesheet, unchanged |
| `public/assets/cards/` | Card illustrations |
| `tests/engine.test.mjs` | Engine, rules, i18n parity and fuzz tests |

The engine mutates the state it is given, as it did in the original. `App`
clones the state (`structuredClone`) before each action and hands the copy to
React. Saves use the same LocalStorage keys as the original.

Debug panel: press <kbd>`</kbd> or add `?debug=1`. Deal a specific dungeon with `?seed=goblin`.
