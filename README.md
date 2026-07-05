# Werewolves 🌲🌕

A digital **moderator/narrator companion app** for in-person games of Werewolves
(Les Loups-Garous de Thiercelieux / Ultimate Werewolf / Mafia-style games).

Instead of a human narrator and physical cards, one device runs the game:
it deals hidden roles, guides the night phase (waking each role in the right
order and collecting their choices), tracks who is alive or dead, and announces
the outcomes — so everyone gets to play.

- **Web app** — deployable to Vercel
- **Android APK** — the same codebase wrapped with Capacitor, built automatically by CI

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS 4 (dark forestry theme, Cinzel + Inter fonts) |
| Android | Capacitor 8 (`android/` is the generated native project, committed) |
| Hosting | Vercel (web) · GitHub Releases (APK) |

## Project structure

```
src/
  data/characters.ts    ← THE character config: add/edit/remove roles here
  engine/               ← pure game-state types & logic (no UI, no network)
  session/              ← session adapters: local pass-the-phone now,
                          Firebase online mode later — same interface
  screens/              ← Home, Character compendium, Game setup
  components/           ← ForestBackdrop, TeamIcon, shared UI
  theme.css             ← palette, fonts, and shared surfaces (Tailwind v4 @theme)
android/                ← Capacitor Android project (build artifacts gitignored)
.github/workflows/      ← CI build + automatic APK release
```

### Editing characters

All roles live in [`src/data/characters.ts`](src/data/characters.ts) — one
entry per character with `name`, `team` (`village` / `werewolf` / `solo`),
`nightOrder` (position in the night wake-up sequence, `null` if the role never
wakes), `description`, and `ability`. The app derives role selection, night
narration order, and the compendium from this single file. Night-order numbers
are spaced out (10, 15, 20…) so new roles can be slotted in without renumbering.

### Character art

Every character shows a **head portrait** in the Characters menu and has a
second **full-card illustration** reserved for the upcoming "reveal your role"
workflow. Until real illustrations exist, the app renders a stylized, tinted
woodcut **SVG emblem** per character (generated in code — see
[`src/components/characterMotifs.tsx`](src/components/characterMotifs.tsx)).

To use real illustrated art, drop image files named after the character `id`
into these folders — they replace the emblems automatically on the next build,
no code changes needed:

| Image | Folder | Example |
| --- | --- | --- |
| Head | `src/assets/portraits/` | `seer.webp` |
| Full card | `src/assets/cards/` | `seer.webp` |

Ready-to-run generation prompts for all 40 characters (both images each, in the
dark-forest woodcut style) are in [`docs/art-briefs.md`](docs/art-briefs.md).

## Run locally

```bash
npm install
npm run dev        # dev server on http://localhost:5173
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build locally
```

## Deploy the web app to Vercel

The app is a plain static Vite build — Vercel needs zero configuration:

1. Go to [vercel.com/new](https://vercel.com/new) and import the
   `SimonDeDeyn/Werewolves` GitHub repo.
2. Vercel auto-detects Vite (build command `npm run build`, output `dist`).
3. Deploy. Every push to `main` redeploys automatically.

## Android APK

### Automatic (recommended)

Every push to `main` triggers the **Build Android APK** workflow, which
publishes a sideloadable debug APK to a rolling GitHub Release:

> **https://github.com/SimonDeDeyn/Werewolves/releases/latest/download/werewolves.apk**

Download it on an Android phone, allow installs from unknown sources, done.

### Local build (requires Android Studio / SDK + JDK 21)

```bash
npm run android:sync   # build web app + copy into android/
npm run android:apk    # gradle assembleDebug → android/app/build/outputs/apk/debug/
npm run android:open   # or open the project in Android Studio
```

## Play modes

- **Pass & play (in progress)** — one device is the narrator; players hand the
  phone around for role reveals and night actions. Fully offline, no account.
- **Online lobby (planned)** — every player joins a lobby code on their own
  phone, backed by Firebase Realtime Database. The game engine is shared;
  only the session adapter differs (see `src/session/adapter.ts`).

## License

No license yet — all rights reserved for now.
