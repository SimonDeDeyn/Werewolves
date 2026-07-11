---
name: character-art
description: Add or regenerate a role's portrait/card art, and write dark-forest-woodcut art-brief prompts. Use when dropping in new character images, renaming/assigning art to a role, or generating image prompts.
---

# Character art

Every role can show a **head portrait** (Characters menu, wake screens, notice board)
and a **full-card illustration** (the Pokémon-style role card). Real art is optional —
a stylized SVG emblem (`src/components/characterMotifs.tsx`) is rendered as a fallback.

## Drop-in flow (no code changes)

Name each image after the role's `id` (from `src/data/characters.ts`) and place it:

| Image | Folder | Example |
| --- | --- | --- |
| Head portrait | `src/assets/portraits/` | `seer.jpg` |
| Full card | `src/assets/cards/` | `seer.jpg` |

`.jpg`, `.png`, and `.webp` all work. A file matching a role id automatically replaces that
role's emblem on the next build. Recommended sizes: heads ~512² (square), cards 768×1024 (3:4).

- Get the exact `id` from `characters.ts` before naming — art keys off it. When a downloaded
  file's description is ambiguous, confirm the intended role with the maintainer rather than guess.
- `GameCard` shows a bare head portrait with `object-contain` (whole face visible, letterboxed)
  and real full-card art with `object-cover` (fills the window). Head portraits should center the
  face; don't crop tight.

## Generating new art

`docs/art-briefs.md` holds ready-to-run prompts (both images) for the whole roster and the
global style prefix. **Prepend that global style to every prompt** so new art matches:

> Hand-drawn woodcut / dark storybook illustration, muted forest palette of deep greens,
> black and muted brown with pale moonlight and warm lantern accents, heavy ink linework,
> textured engraving shading, mysterious tense nighttime-village-in-the-woods mood,
> no text, no logos, no border.

- Head prompts add: `head-and-shoulders portrait, centred, facing viewer, plain dark forest vignette`.
- Card prompts add: `full-body character, dynamic pose, atmospheric forest scene, full trading-card illustration`.
- Team accents: **village** warm greens & lantern-gold · **werewolf** blood-red & bone · **solo** eerie moon-gold & violet.

When adding a role not yet in `docs/art-briefs.md`, write its two briefs in the same format
and append them under the correct team section.
