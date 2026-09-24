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
