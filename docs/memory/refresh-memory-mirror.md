---
name: refresh-memory-mirror
description: After changing any project memory, re-sync the committed docs/memory/ mirror
metadata:
  type: feedback
---

Whenever I create, edit, or delete a memory file for this project, also update the
committed mirror under `docs/memory/` in the repo, then commit and push it.

**Why:** memory files live in `~/.claude` (outside the repo). The repo mirror at
`docs/memory/` is how these notes travel across machines and into git history —
but it's a snapshot that silently drifts if not refreshed alongside the live copy.
The maintainer asked (2026-07-18) to keep it in sync automatically.

**How to apply:**
- Mirror each live memory to `docs/memory/<name>.md` with the same content, but
  rewrite links for the new location: `[[name]]` → plain text, and
  `../../docs/X` → `../X`.
- Keep `docs/memory/README.md`'s list in sync with the live `MEMORY.md` index
  (README.md is the mirror's index; MEMORY.md itself is not mirrored).
- Then commit + push (message like "Refresh memory mirror").

See werewolves-art-pipeline and pokemon-card-layout-deferred.
