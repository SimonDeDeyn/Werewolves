/**
 * Pure setup logic for the pass-and-play flow: the in-progress draft, role
 * balance helpers, and role distribution. No UI or storage here.
 */
import { CHARACTERS, SLOTLESS_IDS, type Character } from "../data/characters";

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
  /**
   * The two extra cards laid in the middle for the Thief to choose from.
   * Only meaningful when a Thief is in the cast; otherwise ignored.
   */
  middleCards: string[];
  /**
   * Three unused village cards the Actor cycles through (one random per night,
   * for three nights). Only meaningful when an Actor is in the cast.
   */
  actorCards: string[];
}

export const emptyDraft = (): SetupDraft => ({
  players: [],
  moderatorMode: "app",
  moderatorIndex: null,
  counts: {},
  randomize: false,
  middleCards: [],
  actorCards: [],
});

/**
 * Extra constraints applied when the Thief and Actor share a table: their card
 * pools must be disjoint (`exclude` holds the other role's picks) and drawn
 * strictly from unused cards (`strictUnused` drops the Villager/Werewolf repeat
 * allowance, so no card already dealt to a player can appear).
 */
export interface CardPoolOpts {
  exclude?: string[];
  strictUnused?: boolean;
}

/**
 * Roles eligible to sit in the middle for the Thief: cards NOT already dealt to
 * a player, plus plain Villager/Werewolf which may always be duplicated. With
 * `strictUnused` the duplication allowance is dropped; `exclude` removes any
 * card the Actor has already taken.
 */
export function eligibleMiddleCards(
  counts: Record<string, number>,
  { exclude = [], strictUnused = false }: CardPoolOpts = {},
): Character[] {
  const blocked = new Set(exclude);
  return CHARACTERS.filter((c) => {
    if (c.slotless || blocked.has(c.id)) return false;
    const unused = (counts[c.id] ?? 0) === 0;
    if (strictUnused) return unused;
    return c.id === "villager" || c.id === "werewolf" || unused;
  });
}

/** Two random distinct-ish eligible middle cards for the Thief. */
export function randomMiddleCards(counts: Record<string, number>, opts?: CardPoolOpts): string[] {
  const pool = eligibleMiddleCards(counts, opts);
  if (pool.length < 2) return pool.map((c) => c.id);
  const shuffled = shuffle(pool);
  return [shuffled[0].id, shuffled[1].id];
}

/**
 * Village-team roles the Actor may borrow: unused village cards (plus plain
 * Villager, which may repeat). The Actor never borrows a wolf or solo card.
 * With `strictUnused` the Villager repeat is dropped; `exclude` removes any card
 * the Thief has already taken.
 */
export function eligibleActorCards(
  counts: Record<string, number>,
  { exclude = [], strictUnused = false }: CardPoolOpts = {},
): Character[] {
  const blocked = new Set(exclude);
  return CHARACTERS.filter((c) => {
    if (c.team !== "village" || c.id === "actor" || c.slotless) return false;
    if (blocked.has(c.id)) return false;
    const unused = (counts[c.id] ?? 0) === 0;
    if (strictUnused) return unused;
    return c.id === "villager" || unused;
  });
}

/** Three random distinct eligible cards for the Actor's three nights. */
export function randomActorCards(counts: Record<string, number>, opts?: CardPoolOpts): string[] {
  const pool = eligibleActorCards(counts, opts);
  return shuffle(pool)
    .slice(0, 3)
    .map((c) => c.id);
}

/** Number of players who actually receive a role (moderator is excluded). */
export function roleSlots(draft: SetupDraft): number {
  const modTaken = draft.moderatorMode === "player" && draft.moderatorIndex !== null ? 1 : 0;
  return draft.players.length - modTaken;
}

export function totalSelected(counts: Record<string, number>): number {
  // Slotless titles (the Sheriff) are laid over a player, so they never count
  // toward the seats that must be filled.
  return Object.entries(counts).reduce(
    (a, [id, n]) => a + (SLOTLESS_IDS.has(id) ? 0 : n),
    0,
  );
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

/**
 * Curated one-tap casts. Each lists the special roles to add (in priority order)
 * after the recommended wolves; any seats left over are filled with plain
 * Villagers. Roles that need extra setup (Thief/Actor cards) or come as a block
 * (Two Sisters/Three Brothers) are deliberately left out so a preset is always
 * ready to deal.
 */
export interface CastPreset {
  id: string;
  name: string;
  blurb: string;
  /** Special roles added after the wolves, highest priority first. */
  roles: string[];
}

export const CAST_PRESETS: CastPreset[] = [
  {
    id: "beginner",
    name: "Beginner",
    blurb: "Wolves, a Seer and a Hunter — easy to teach.",
    roles: ["seer", "hunter"],
  },
  {
    id: "balanced",
    name: "Balanced",
    blurb: "A well-rounded village with the classic powers.",
    roles: ["seer", "defender", "witch", "hunter"],
  },
  {
    id: "mayhem",
    name: "Mayhem",
    blurb: "A cauldron of special roles for chaos-lovers.",
    roles: ["seer", "witch", "hunter", "cupid", "fox", "raven", "wild-child", "little-girl", "angel"],
  },
];

/**
 * Turn a preset into a counts map sized to the seats available: the recommended
 * wolves, then each special role while seats remain, then Villagers for the rest.
 */
export function buildPresetCounts(preset: CastPreset, slots: number): Record<string, number> {
  const wolves = recommendedWolves(slots);
  const counts: Record<string, number> = { werewolf: wolves };
  let used = wolves;
  for (const id of preset.roles) {
    if (used >= slots) break;
    counts[id] = 1;
    used++;
  }
  if (used < slots) counts.villager = slots - used;
  return counts;
}

/** Passive village roles used to fill leftover seats when randomizing. */
export const PASSIVE_FILLERS: Character[] = CHARACTERS.filter(
  (c) => c.nightOrder === null && c.team === "village" && !c.slotless,
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
  const hasThief = (draft.counts["thief"] ?? 0) > 0;
  const hasActor = (draft.counts["actor"] ?? 0) > 0;
  if (hasThief && draft.middleCards.filter(Boolean).length < 2)
    return "Pick two middle cards for the Thief (or hit Randomize).";
  if (hasActor && draft.actorCards.filter(Boolean).length < 3)
    return "Pick three cards for the Actor (or hit Randomize).";
  if (hasThief && hasActor) {
    const shared = new Set(draft.actorCards.filter(Boolean));
    if (draft.middleCards.some((id) => id && shared.has(id)))
      return "The Thief and Actor can't be dealt the same card.";
  }
  // A unique card set aside for the Thief/Actor pile can't also be dealt to a
  // player; Villager/Werewolf have plenty of copies, so they may repeat.
  const reserved = [...(hasThief ? draft.middleCards : []), ...(hasActor ? draft.actorCards : [])];
  for (const id of reserved) {
    if (!id || id === "villager" || id === "werewolf") continue;
    if ((draft.counts[id] ?? 0) > 0) {
      const name = CHARACTERS.find((c) => c.id === id)?.name ?? "That role";
      return `${name} can't be both dealt to a player and set aside for the Thief/Actor.`;
    }
  }
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
    // Slotless titles (the Sheriff) aren't cards — they're appointed in-game.
    if (SLOTLESS_IDS.has(id)) continue;
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
