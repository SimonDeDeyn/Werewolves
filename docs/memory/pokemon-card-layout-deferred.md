---
name: pokemon-card-layout-deferred
description: A finished 5:7 "Pokémon-style" GameCard layout is parked in docs/, awaiting landscape card art
metadata:
  type: project
---

A complete, build-passing 5:7 trading-card redesign of `GameCard` (landscape 4:3
art window, night-order "HP" stat, auto-shrinking ability text via a `useFitText`
hook) was built on 2026-07-18, then **reverted** to the shipped 5:9 card with a
square 1:1 art window.

**Why reverted:** the square art window matches the current square 1:1 head
portraits — the only art that exists so far. The 5:7 layout needs **landscape 4:3
card illustrations** (`src/assets/cards/<id>`, e.g. 1024×768) which don't exist yet;
heads stay 1:1.

**Where the code lives:** full ready-to-apply implementation + re-apply steps in
[../pokemon-card-layout.md](../pokemon-card-layout.md) in the repo. Re-apply when the
maintainer has generated the landscape card art. Also update the Actor empty-slot
placeholder `aspect-[5/9]` → `aspect-[5/7]` in NightPhase.tsx.

See werewolves-art-pipeline for the art naming/drop-in conventions.
