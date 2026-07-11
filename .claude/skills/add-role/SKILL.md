---
name: add-role
description: Wire a Werewolves role into gameplay — the characters.ts entry, a night wake step or death-trigger resolution, any setup extras, the Undo snapshot, role/team overrides, win conditions, and the board. Use when adding a playable role or changing a role's in-game behavior.
---

# Adding / wiring a role

The role catalogue is data-driven; the behavior lives mostly in `NightPhase.tsx`.
Work through only the steps a given role actually needs.

## 1. Catalogue entry (always)

Add or edit the entry in `src/data/characters.ts` `CHARACTERS`:
`id` (stable kebab-case), `name`, `team` (`village` | `werewolf` | `solo`),
`nightOrder` (lower wakes earlier; `null` = never wakes), optional `firstNightOnly`,
`oncePerGame`, `maxCount`, `groupSize` (deals as a block, e.g. Two Sisters), plus
`description` and `ability`. `NIGHT_SEQUENCE` and the compendium derive automatically.
Keep night-order numbers spaced (…, 40, 45, 50, …) so roles slot in without renumbering.

## 2. If the role WAKES with an app-guided action

In `src/screens/passAndPlay/NightPhase.tsx`:

- Add the id to `IMPLEMENTED_WAKE`.
- Add a render branch in the wake section (`if (roleId === "<id>") { ... }`) — mirror an
  existing one (Seer = single target + reveal a card; Cupid = multi-select; Thief = pick a
  card; Pyromaniac/Piper = per-night pick with running totals). Use `wakePick` /
  `wakePicks` / `wakeShown` for scratch selection and `advanceWake()` to move on.
- Add a `confirm…` handler that commits the choice into game state, then calls `advanceWake()`.
- Roles that alter later deaths write into state consumed by `record()` (see step 4).

## 3. If the role acts AFTER a death (trigger / resolution prompt)

Death resolution runs in `record()` → `step()` → `nextPrompt()` → `commit()`.

- Automatic effects (Elder survives first bite, Prince/Idiot dodge a vote, Knight infection,
  Pyromaniac ignite, Cupid heartbreak) are applied inside `record()`/`commit()` on the `deaths`
  array, pushing a moderator-facing string into `notes`.
- Interactive triggers (Hunter shot, Servant intervene hub, Accursed Wolf-Father convert) add a
  `Prompt` kind, a case in `nextPrompt()`, a render branch, and a handler that calls `step()`
  with an updated `Resolution`. Add per-round flags to the `Resolution` interface if needed.

## 4. Role / team / board overrides

- **Secret role change** (Thief swap, Doppelgänger copy, Devoted Servant takeover): set
  `roleOverride[player]`. `roleOf()` then reflects it; the board still shows the original card.
- **Shown fallen but playing on** (Devoted Servant): also add the player to `revealedDead`.
- **Team change while keeping the card** (Wild Child / Wolf-Father → wolf): add to
  `turnedWolves`; `teamOf()` counts them for the win check while the board card is unchanged.

## 5. New game state → Undo (mandatory)

Any new `useState` that holds game state MUST be added to the `Snapshot` interface,
`snapshot()`, and `undo()` in `NightPhase.tsx`, or Undo silently corrupts. Reset per-night
state (e.g. protection, visit) in `advance()` when moving night → day.

## 6. Win conditions

Solo factions (Pyromaniac, Piper) live in the `result` computation in `NightPhase.tsx`.
Extend that block; keep existing village/werewolf logic intact for games without the new role.

## 7. Setup extras (extra cards, etc.)

For roles needing pre-game data (Thief middle cards, Actor's borrowed cards):
add a field to `SetupDraft` in `src/game/setup.ts` (+ an eligibility/randomize helper and a
`setupError` check), a picker in `RoleSelectStep.tsx` (reuse `CardPicker`), then pass it
through `PassAndPlayFlow.tsx` into `NightPhase`.

## 8. Art

Drop a head portrait at `src/assets/portraits/<id>.jpg` — see the **character-art** skill.
Without one, the generated SVG emblem is used automatically.

## Verify

Run `npm run build` (`tsc -b` + Vite). Do not start a dev server or test in a live app —
the maintainer does functional testing.
