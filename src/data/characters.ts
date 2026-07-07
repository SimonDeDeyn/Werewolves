/**
 * Master character configuration.
 *
 * This file is the single source of truth for every role in the game.
 * To add, remove, or tweak a character, edit this list — the app builds
 * role selection, night narration order, and the compendium from it.
 *
 * nightOrder: position in the night wake-up sequence (lower = called earlier).
 * Numbers are spaced out so new roles can be inserted without renumbering.
 * Use null for roles that never wake at night (passive or day-only powers).
 */

export type Team = "village" | "werewolf" | "solo";

export interface Character {
  /** Stable identifier used in game state — never reuse or rename casually. */
  id: string;
  name: string;
  team: Team;
  /** Night wake-up position, or null if the role is never called at night. */
  nightOrder: number | null;
  /** Wakes only on the first night (setup roles like Cupid, Thief). */
  firstNightOnly?: boolean;
  /** Power can be used only once per game. */
  oncePerGame?: boolean;
  /** Maximum copies of this role in one game (default 1). */
  maxCount?: number;
  /** Flavour text shown to players. */
  description: string;
  /** Short mechanical summary used by the narrator engine and compendium. */
  ability: string;
}

export const CHARACTERS: Character[] = [
  // ───────────────────────── Village Team ─────────────────────────
  {
    id: "villager",
    name: "Villager",
    team: "village",
    nightOrder: null,
    maxCount: 20,
    description: "An ordinary soul of the village, armed with nothing but suspicion and a vote.",
    ability: "No special power; votes during the day.",
  },
  {
    id: "seer",
    name: "Seer",
    team: "village",
    nightOrder: 40,
    description: "Peers beyond the veil each night to glimpse a neighbour's true face.",
    ability: "Each night, secretly views one player's true role.",
  },
  {
    id: "witch",
    name: "Witch",
    team: "village",
    nightOrder: 140,
    description: "Keeper of two potions: one that mends, one that ends.",
    ability:
      "Has one healing potion (can save the wolves' victim) and one poison potion (can kill any player), each usable once per game.",
  },
  {
    id: "hunter",
    name: "Hunter",
    team: "village",
    nightOrder: null,
    description: "Even in death, their finger never leaves the trigger.",
    ability: "When killed (any time, any way), immediately shoots and kills another player of choice.",
  },
  {
    id: "little-girl",
    name: "Little Girl",
    team: "village",
    nightOrder: null,
    description: "Too curious to keep her eyes shut when the wolves prowl.",
    ability:
      "May secretly peek during the werewolves' night turn; risks being caught and killed if noticed.",
  },
  {
    id: "cupid",
    name: "Cupid",
    team: "village",
    nightOrder: 20,
    firstNightOnly: true,
    description: "One arrow, two hearts, and a fate now shared.",
    ability:
      "On night one, chooses two players to fall in love; if one dies, the other dies of heartbreak. Lovers from opposing teams win only as a pair.",
  },
  {
    id: "defender",
    name: "Defender",
    team: "village",
    nightOrder: 80,
    description: "Stands watch at one door each night, shield raised against the dark.",
    ability:
      "Each night, protects one player from the werewolves; may not protect the same player two nights in a row.",
  },
  {
    id: "elder",
    name: "Elder",
    team: "village",
    nightOrder: null,
    description: "Old enough to have survived a wolf's bite before.",
    ability:
      "Survives the first werewolf attack against them; if killed by village vote instead, all villagers lose their powers.",
  },
  {
    id: "scapegoat",
    name: "Scapegoat",
    team: "village",
    nightOrder: null,
    description: "When the village cannot agree, someone must pay the price.",
    ability:
      "If a day vote ends in a tie, the Scapegoat is eliminated instead of a revote; they choose who may vote the next day.",
  },
  {
    id: "fox",
    name: "Fox",
    team: "village",
    nightOrder: 50,
    oncePerGame: true,
    description: "A sharp nose that can smell wolf on the wind — once.",
    ability:
      "Once per game, points at three adjacent players and learns if at least one is a werewolf; loses the power if the answer is no.",
  },
  {
    id: "sheriff",
    name: "Judge / Sheriff",
    team: "village",
    nightOrder: null,
    description: "Elected by the village, their word carries the weight of two.",
    ability: "Elected role; their vote counts double, or breaks ties.",
  },
  {
    id: "rusty-sword-knight",
    name: "Rusty Sword Knight",
    team: "village",
    nightOrder: null,
    description: "Their blade is dull, but its tetanus is legendary.",
    ability:
      "If killed by the wolves, infects the werewolf to their left, killing that wolf the following night.",
  },
  {
    id: "stuttering-judge",
    name: "Stuttering Judge",
    team: "village",
    nightOrder: null,
    oncePerGame: true,
    description: "Justice, delivered twice before anyone can object.",
    ability: "Once per game, can secretly call a second vote and execution on the same day.",
  },
  {
    id: "two-sisters",
    name: "Two Sisters",
    team: "village",
    nightOrder: 60,
    maxCount: 2,
    description: "Bound by blood, they trust no one but each other.",
    ability: "Know each other's identity and may communicate silently at night.",
  },
  {
    id: "three-brothers",
    name: "Three Brothers",
    team: "village",
    nightOrder: 65,
    maxCount: 3,
    description: "Three sons of the village, thick as the forest itself.",
    ability: "Know each other's identity and may communicate silently at night.",
  },
  {
    id: "wild-child",
    name: "Wild Child",
    team: "village",
    nightOrder: 70,
    firstNightOnly: true,
    description: "Raised by the woods, loyal to whoever shows them kindness.",
    ability:
      "Chooses a role model on night one; if that player dies, the Wild Child becomes a werewolf.",
  },
  {
    id: "bear-tamer",
    name: "Bear Tamer",
    team: "village",
    nightOrder: null,
    description: "The bear smells what the village cannot see.",
    ability: "Each morning, the bear growls if a werewolf sits directly next to the Bear Tamer.",
  },
  {
    id: "prince",
    name: "Prince / Princess",
    team: "village",
    nightOrder: null,
    oncePerGame: true,
    description: "Royal blood is not so easily spilled by common hands.",
    ability: "Immune to being voted out by the village once; reveals their card to be spared.",
  },
  {
    id: "servant",
    name: "Servant",
    team: "village",
    nightOrder: null,
    oncePerGame: true,
    description: "Loyal to the end — even someone else's end.",
    ability:
      "Once per game, can swap fates with someone about to die, taking their role instead.",
  },
  {
    id: "gypsy",
    name: "Gypsy",
    team: "village",
    nightOrder: 45,
    description: "Reads truths in cards and smoke, one question at a time.",
    ability:
      "Variant Seer: each night asks a yes/no question about a player instead of viewing their role directly.",
  },
  {
    id: "actor",
    name: "Actor / Double Agent",
    team: "village",
    nightOrder: 30,
    description: "A different mask for every moonrise.",
    ability:
      "Can temporarily become one of the unused character cards and use its power for a turn.",
  },
  {
    id: "village-idiot",
    name: "Village Idiot",
    team: "village",
    nightOrder: null,
    description: "Too harmless to hang, too foolish to trust with a vote.",
    ability: "If voted for execution, is spared but permanently loses voting rights.",
  },
  {
    id: "raven",
    name: "Raven",
    team: "village",
    nightOrder: 85,
    description: "A black omen lands on one rooftop each night.",
    ability:
      "Each night, curses a player, adding two extra guilty votes against them the next day.",
  },
  {
    id: "rabble-rouser",
    name: "Rabble-Rouser / Town Crier",
    team: "village",
    nightOrder: null,
    oncePerGame: true,
    description: "When they shout, the whole village listens — like it or not.",
    ability: "Once per game, can announce a special extra rule or twist for the day.",
  },
  {
    id: "grandmother",
    name: "Grandmother",
    team: "village",
    nightOrder: null,
    description: "Even from the grave, she has something to say about it.",
    ability: "Can leave clues behind after her death.",
  },
  {
    id: "rooster",
    name: "Rooster",
    team: "village",
    nightOrder: null,
    description: "Crows at dawn with news the night tried to bury.",
    ability:
      "Each morning, crows to reveal general information (e.g. \"a wolf power was used last night\") without specifics.",
  },
  {
    id: "sleepwalker",
    name: "Sleepwalker",
    team: "village",
    // Wakes last, after every other night role, so her reading reflects the
    // whole night. Kept well above the current maximum to leave room.
    nightOrder: 200,
    description: "Never sleeps in her own bed — each night she wanders into someone else's.",
    ability:
      "Each night, visits another living player (never herself, never the same one two nights running). If the wolves attack her own house she survives; if they attack the player she visited, she dies alongside them. Each morning she privately learns only whether the player she visited used a night power that night — not what it was or which role they are; a powerless player \"slept peacefully\". The visited player never learns they were visited.",
  },

  // ──────────────────────── Werewolf Team ────────────────────────
  {
    id: "werewolf",
    name: "Werewolf",
    team: "werewolf",
    nightOrder: 100,
    maxCount: 6,
    description: "By day a neighbour, by night a hunger in the dark.",
    ability: "Wakes with the other wolves each night to choose a victim collectively.",
  },
  {
    id: "big-bad-wolf",
    name: "Big Bad Wolf",
    team: "werewolf",
    nightOrder: 110,
    description: "The old terror of the forest, never satisfied with one bite.",
    ability: "Can kill a second victim on nights when no werewolf has died yet.",
  },
  {
    id: "white-werewolf",
    name: "White Werewolf",
    team: "werewolf",
    nightOrder: 120,
    description: "A lone wolf whose pack is merely prey it hasn't eaten yet.",
    ability:
      "Every other night, can also secretly kill a fellow werewolf; wins alone if only they remain.",
  },
  {
    id: "werewolf-cub",
    name: "Werewolf Cub",
    team: "werewolf",
    nightOrder: 100,
    description: "Small fangs, but the pack's fury when they fall is boundless.",
    ability:
      "Wakes with the pack. If killed, the surviving wolves kill twice the following night.",
  },
  {
    id: "accursed-wolf-father",
    name: "Accursed Wolf-Father",
    team: "werewolf",
    nightOrder: 130,
    oncePerGame: true,
    description: "His bite does not always kill — sometimes it converts.",
    ability:
      "Once per game, can turn the villager killed by the wolves into a new werewolf instead.",
  },
  {
    id: "vile-doppelganger",
    name: "Vile Doppelgänger",
    team: "werewolf",
    nightOrder: 15,
    firstNightOnly: true,
    description: "Wears a stolen face better than its own.",
    ability: "Copies another player's role at the start of the game.",
  },
  {
    id: "traitor",
    name: "Traitor",
    team: "werewolf",
    nightOrder: null,
    description: "Sleeps among the sheep, dreams with the wolves.",
    ability:
      "A villager secretly aligned with the wolves; has no powers and appears as a villager to the Seer.",
  },

  // ────────────────────── Solo / Ambiguous ──────────────────────
  {
    id: "angel",
    name: "Angel",
    team: "solo",
    nightOrder: null,
    description: "Longs for heaven so badly they'd take the gallows to get there.",
    ability:
      "Wins immediately if eliminated on the very first day or night; otherwise becomes a normal villager.",
  },
  {
    id: "thief",
    name: "Thief",
    team: "solo",
    nightOrder: 10,
    firstNightOnly: true,
    description: "Why keep your own fate when you can steal a better one?",
    ability: "On night one, secretly swaps their card with one of two extra unused roles.",
  },
  {
    id: "pyromaniac",
    name: "Pyromaniac",
    team: "solo",
    nightOrder: 150,
    description: "Patient as kindling, and just as dangerous.",
    ability:
      "Each night, douses a player's house in gasoline; can later ignite all doused houses at once, killing everyone inside.",
  },
  {
    id: "piper",
    name: "Piper",
    team: "solo",
    nightOrder: 160,
    description: "A melody drifts through the village, and none who hear it are free.",
    ability: "Charms two players each night; wins alone if every player left alive is charmed.",
  },
  {
    id: "devoted-servant",
    name: "Devoted Servant",
    team: "solo",
    nightOrder: null,
    oncePerGame: true,
    description: "Serves the dead more faithfully than the living.",
    ability:
      "Before a dead player's role is publicly revealed, can reveal themselves to take on that role once.",
  },
  {
    id: "abominable-sectarian",
    name: "Abominable Sectarian",
    team: "solo",
    nightOrder: null,
    description: "Every quarrel in the village is a hymn to their cause.",
    ability:
      "Thrives as the village divides; wins under their own sect-based condition, unaligned with wolves or village.",
  },
  {
    id: "ghost",
    name: "Ghost / Spirit",
    team: "solo",
    nightOrder: null,
    description: "Death was not the end — merely a change of address.",
    ability: "Dead players retain limited abilities, such as leaving hints or haunting the living.",
  },
];

/** Characters that wake at night, sorted by wake-up order. */
export const NIGHT_SEQUENCE: Character[] = CHARACTERS.filter(
  (c) => c.nightOrder !== null,
).sort((a, b) => (a.nightOrder ?? 0) - (b.nightOrder ?? 0));

export const byId = (id: string): Character | undefined =>
  CHARACTERS.find((c) => c.id === id);

export const byTeam = (team: Team): Character[] =>
  CHARACTERS.filter((c) => c.team === team);

export const TEAM_LABELS: Record<Team, string> = {
  village: "Village",
  werewolf: "Werewolves",
  solo: "Solo & Ambiguous",
};
