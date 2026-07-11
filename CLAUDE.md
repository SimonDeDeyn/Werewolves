# CLAUDE.md

Behavioral contract for working in this repo. Read it every session; follow it exactly.

## Project

- Digital companion app for in-person **Les Loups-Garous de Thiercelieux (Werewolves)**: one device narrates — deals hidden roles, walks the moderator through the night, tracks life/death, announces outcomes.
- One codebase, **two build targets**: a **web app** (Vercel, static Vite build) and an **Android APK** (Capacitor wraps `dist/`).
- The full role roster (base game + expansions) lives in `src/data/characters.ts` — the single source of truth for role selection, night order, and the compendium.
- Current focus is the **pass-and-play (player-narrated)** flow. "App narrates" (no human moderator) and online lobby are future phases; the seam already exists (`src/session/adapter.ts`).

## Tech stack

- React 19 + TypeScript (strict), Vite 8, Tailwind CSS 4 (`@theme` tokens in `src/theme.css`).
- Capacitor 8 for Android — `android/` is committed generated output; `capacitor.config.ts` sets `webDir: dist`.
- Fonts: Cinzel (display) + Inter (body) via `@fontsource`.
- No router and no state library — screens switch via local `useState` state machines.

## Commands

- `npm run build` — `tsc -b` + Vite build. **This is your verification gate**: run it to confirm a change compiles.
- `npm run android:sync` / `android:apk` / `android:open` — Capacitor sync / debug APK / open Android Studio.
- `npm run dev` / `preview` — **Never run these** (see Testing).
- CI runs `npm run build` on every push/PR; pushing to `main` also builds and publishes a rolling debug APK release.

## Testing — strict

- **The maintainer does all manual and functional testing.** Never start a dev server, run `npm run dev`/`preview`, open localhost, drive the app, or take screenshots to "check" UI or behavior. Never spin up or interact with a live app to verify anything — the maintainer checks that and reports back.
- To verify your own work, run `npm run build` (or `tsc -b`) and reason about the code. That is the only verification you perform.
- There is **no test runner configured**. Running automated unit/logic tests is allowed when it genuinely helps — if so, add Vitest (fits Vite), run it **non-interactively with output captured**, then reason from the result. Never add a runner or write tests speculatively.

## Layout at a glance

- `src/data/characters.ts` — role catalogue (single source of truth); `NIGHT_SEQUENCE` derives from it.
- `src/engine/types.ts` — pure game-state types (no UI, no network).
- `src/game/setup.ts` — cast-selection draft, validation, role dealing.
- `src/session/adapter.ts` — `SessionAdapter` seam (`LocalSession` now, online later).
- `src/screens/` — top-level screens; `screens/passAndPlay/` holds the game flow.
  - `PassAndPlayFlow.tsx` — the setup → reveal → night step machine.
  - `NightPhase.tsx` — the moderator game loop: night wake sequence, day vote, death resolution, notice board, Undo. Large and central.
- `src/components/` — shared UI (`GameCard`, `CharacterPortrait`, `PlayerCircle`, `ForestBackdrop`, `TeamIcon`, `characterMotifs`).
- `src/assets/portraits/<id>.jpg`, `src/assets/cards/<id>.jpg` — per-role art keyed by role id.
- `docs/art-briefs.md` — art prompts. `.github/workflows/` — CI + APK release.

## Dual-target rule (web + Android)

- Every change must work in **both** the web build and the Android WebView; both ship the identical static `dist/`.
- Keep the app a **plain static client build**: no server-only/Node APIs, no SSR, no backend calls except behind the `SessionAdapter` seam.
- Never use browser features unavailable in the Android WebView. Respect device safe areas — apply insets with the existing Tailwind `env(safe-area-inset-*)` pattern; never let interactive content sit under the status bar or home indicator.

## Visual theme rule

- The look is **dark, forestry, woodcut-inspired** (nighttime village in the woods). Keep every screen and any generated art in this style.
- Always style with the `@theme` tokens in `src/theme.css` (`night-*`, `pine-*`, `moss-*`, `bark-*`, `moon-*`, `blood-*`). Reuse them; never scatter new raw hex through components. Headings use `font-display` (Cinzel); body uses Inter.
- Generated character art must match the dark-forest woodcut style — use the **character-art** skill.

## Conventions — follow existing code, don't invent

- Role ids are stable **kebab-case** strings. Never rename or reuse one casually; art, board, wake order, and overrides all key off the id.
- Match the surrounding comment density: files carry a short purpose-of-file doc comment and explain non-obvious mechanics. Do the same.
- In `NightPhase.tsx`, **all mutable game state is threaded through the `Snapshot` type + `snapshot()` + `undo()`** so the Undo button can step back one screen. Any new game state you add MUST be added to all three, or Undo silently breaks.
- Prefer small pure helpers and function components; the only class is `LocalSession`.
- Never commit, push, or trigger builds unless asked. Pushing to `main` publishes a public APK.

## Out of scope — do not build or suggest

- The homebrew roles **Innkeeper, Changeling, Hollow Man** are intentionally deferred until core playtesting is done. Never implement, scaffold, or suggest them unless the maintainer explicitly asks.

## Skills

- **add-role** — wiring a role into `characters.ts`, the night wake sequence, death resolution, setup extras, the Undo snapshot, and the board.
- **character-art** — portrait/card naming, the drop-in flow, and dark-forest-woodcut art-brief generation.
