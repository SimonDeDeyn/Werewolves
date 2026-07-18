---
name: werewolves-art-pipeline
description: How role art is named, sized, and dropped into the Werewolves app
metadata:
  type: reference
---

Each role can show a **head portrait** (Characters menu, wake screens, notice
board, player circles) and a **full-card illustration** (the GameCard). Real art
is optional — an SVG emblem in `src/components/characterMotifs.tsx` is the fallback.

**Drop-in, no code changes:** name the image after the role's `id` (kebab-case,
from `src/data/characters.ts`) and place it. A file matching a role id replaces
that role's emblem on the next build. `.jpg`, `.png`, `.webp` all work (~0.5 MB JPGs).

| Image | Folder | Size |
| --- | --- | --- |
| Head portrait | `src/assets/portraits/<id>` | 1:1 square, ~1024² |
| Full card | `src/assets/cards/<id>` | see art-window note below |

**Art-window shape drives the card art size (this is the subtle part):**
- Current shipped GameCard = **5:9 card with a SQUARE 1:1 art window**. So card art
  should be **1:1 square** right now. Head shown `object-contain` (whole, letterboxed);
  card art shown `object-cover` (fills, may trim edges) — keep the subject centred.
- If the deferred **5:7 layout** is ever applied (see pokemon-card-layout-deferred),
  card art becomes **4:3 landscape** (~1024×768); heads stay 1:1.

**Generating art:** `docs/art-briefs.md` holds ready-to-run prompts for the whole
roster plus the global woodcut style prefix — prepend it to every prompt so new art
matches (dark storybook woodcut, muted forest palette, ink linework, no text/logo/
border). Team accents: village = warm greens & lantern-gold · werewolf = blood-red
& bone · solo = moon-gold & violet. The **character-art** skill automates the naming,
drop-in flow, and brief writing. Maintainer generates art on Leonardo.ai (Phoenix
model, was `phoenix-v1.0`), 1:1 aspect, upscaled.

Get the exact `id` from `characters.ts` before naming; when a downloaded file is
ambiguous, confirm the intended role with the maintainer rather than guess.
