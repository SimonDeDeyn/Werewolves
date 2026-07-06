/**
 * Pure setup logic for the pass-and-play flow: the in-progress draft, role
 * balance helpers, and role distribution. No UI or storage here.
 */
import { CHARACTERS, type Character } from "../data/characters";

export type ModeratorMode = "app" | "player";

export interface SetupDraft {
  /** Player names in seating order. */
  players: string[];
  moderatorMode: ModeratorMode;
  /** Index into players who narrates (only when moderatorMode === "player"). */
  moderatorIndex: number | null;
  /** characterId -> how many copies are in the game. */
  counts: Record<string, number>;
  /** Fill any leftover seats with random passive village roles. */
  randomize: boolean;
}

export const emptyDraft = (): SetupDraft => ({
  players: [],
  moderatorMode: "app",
  moderatorIndex: null,
  counts: {},
  randomize: false,
});

/** Number of players who actually receive a role (moderator is excluded). */
export function roleSlots(draft: SetupDraft): number {
  const modTaken = draft.moderatorMode === "player" && draft.moderatorIndex !== null ? 1 : 0;
  return draft.players.length - modTaken;
}

export function totalSelected(counts: Record<string, number>): number {
  return Object.values(counts).reduce((a, b) => a + b, 0);
}

export function werewolfCount(counts: Record<string, number>): number {
  return CHARACTERS.filter((c) => c.team === "werewolf").reduce(
    (a, c) => a + (counts[c.id] ?? 0),
    0,
  );
}

/** Balanced target: roughly one werewolf per four players. */
export function recommendedWolves(players: number): number {
  return Math.max(1, Math.round(players / 4));
}

/** Passive village roles used to fill leftover seats when randomizing. */
export const PASSIVE_FILLERS: Character[] = CHARACTERS.filter(
  (c) => c.nightOrder === null && c.team === "village",
);

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Returns a human-readable reason the draft can't be distributed yet, or null. */
export function setupError(draft: SetupDraft): string | null {
  if (draft.players.length < 3) return "Add at least 3 players.";
  const slots = roleSlots(draft);
  if (slots < 3) return "Need at least 3 players receiving a role.";
  const total = totalSelected(draft.counts);
  if (total > slots) return `Too many roles (${total}) for ${slots} player${slots === 1 ? "" : "s"}.`;
  if (total < slots && !draft.randomize)
    return `Assign ${slots - total} more role${slots - total === 1 ? "" : "s"}, or turn on Randomize.`;
  const wolves = werewolfCount(draft.counts);
  if (wolves === 0) return "Add at least one werewolf.";
  if (wolves * 2 >= slots) return "Too many werewolves — the village can't win.";
  return null;
}

export interface Assignment {
  player: string;
  characterId: string;
  /** True when this seat was filled by the randomizer (shown as a "?"). */
  random: boolean;
}

/** Build the role pool (with optional passive fillers), shuffle, and deal. */
export function distribute(draft: SetupDraft): Assignment[] {
  const slots = roleSlots(draft);
  const pool: { id: string; random: boolean }[] = [];
  for (const [id, n] of Object.entries(draft.counts)) {
    for (let i = 0; i < n; i++) pool.push({ id, random: false });
  }
  if (draft.randomize && PASSIVE_FILLERS.length) {
    const countOf = (id: string) => pool.filter((p) => p.id === id).length;
    while (pool.length < slots) {
      // Only roles that still have capacity left (respecting maxCount), so a
      // unique role like the Elder is never dealt twice.
      const eligible = PASSIVE_FILLERS.filter((c) => countOf(c.id) < (c.maxCount ?? 1));
      if (!eligible.length) break;
      // Prefer roles not yet in the game, so fillers are distinct surprises;
      // only repeat (e.g. Villager) once every distinct passive is used.
      const fresh = eligible.filter((c) => countOf(c.id) === 0);
      const choices = fresh.length ? fresh : eligible;
      const pick = choices[Math.floor(Math.random() * choices.length)];
      pool.push({ id: pick.id, random: true });
    }
    // Safety net if there are somehow more seats than total filler capacity.
    while (pool.length < slots) pool.push({ id: "villager", random: true });
  }
  const dealt = shuffle(pool);
  const receivers = draft.players.filter(
    (_, i) => !(draft.moderatorMode === "player" && draft.moderatorIndex === i),
  );
  return receivers.map((player, i) => ({
    player,
    characterId: dealt[i].id,
    random: dealt[i].random,
  }));
}
