import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { byId, NIGHT_SEQUENCE, type Character } from "../../data/characters";
import type { Assignment } from "../../game/setup";
import { clearGame, saveGame } from "../../game/persistence";
import CharacterPortrait from "../../components/CharacterPortrait";
import PlayerCircle from "./PlayerCircle";
import NoticeBoard, { type BoardItem } from "./NoticeBoard";
import GameCard from "../../components/GameCard";

type Phase = "night" | "day";
/**
 * Screens of the loop. After the pack names its victim on "select", the night's
 * wolf interludes run in the real wake order — the Wolf-Father's bite (105), the
 * White Werewolf's betrayal (120), then the Witch's potions (140) — before the
 * deaths are resolved.
 */
type View =
  | "wake"
  | "select"
  | "wolfFather"
  | "whiteWolf"
  | "witch"
  | "hunter"
  | "transition"
  | "board";

/**
 * Roles with an implemented night wake-up step. When a night begins the app
 * walks the moderator through these in nightOrder (respecting firstNightOnly)
 * before the werewolves' victim is recorded. Grows as more roles are wired in.
 */
const IMPLEMENTED_WAKE = new Set<string>([
  "sleepwalker",
  "thief",
  "vile-doppelganger",
  "actor",
  "cupid",
  "seer",
  "gypsy",
  "fox",
  "defender",
  "raven",
  "two-sisters",
  "three-brothers",
  "wild-child",
  "pyromaniac",
  "piper",
]);

/**
 * Atmospheric flavor lines for the day/night transition beat. One is chosen per
 * transition by a stable index off the round number, so the same beat never
 * re-rolls its text on a re-render but each dawn/dusk reads a little different.
 */
const WAKE_TEXTS = [
  "Dawn spills over the rooftops. Everyone opens their eyes — time to talk, to accuse, and to vote.",
  "Cockcrow cuts the mist. The village stirs, counts its own, and begins to whisper.",
  "Grey light seeps between the shutters. Neighbours rise, wary of the faces around them.",
  "Morning finds the square empty of wolves — but not of suspicion. Let the talking begin.",
  "The lanterns are cold and the night is spent. Villagers gather, eyes searching for a lie.",
  "First light breaks the spell of the dark wood. Doors open; accusations sharpen.",
  "The bell tolls the hour. Sleep falls away and the village turns to judge its own.",
  "Frost lifts off the thatch as the sun climbs. Time to name a name before dusk returns.",
  "The forest quiets and the village wakes uneasy, each soul weighing the one beside them.",
  "Daybreak. The survivors blink into the light and reckon with what the night has taken.",
];

const SLEEP_TEXTS = [
  "Doors are barred and lanterns snuffed. The village lies down as the dark wood stirs awake.",
  "The last candle gutters out. Close your eyes — the creatures of the night are waking.",
  "Shutters latch and the square falls silent. Sleep now, while the forest begins to prowl.",
  "A cold wind walks the empty lanes. The village dreams; something else does not.",
  "Night settles over the rooftops like a held breath. Lay your head down and trust no one.",
  "The moon climbs above the pines. One by one the windows go dark — and the hunt begins.",
  "Fires are banked and the last voices hush. The wood leans close as the village sleeps.",
  "Darkness pools between the houses. Close your eyes; the ones who wake mean you harm.",
  "The bell rings the village to bed. Beyond the fence, yellow eyes open in the dark.",
  "Silence falls thick as fog. The village surrenders to sleep — and the night takes over.",
];

/**
 * In-progress elimination resolution. The Servant and Devoted Servant may only
 * intervene on village (day) eliminations, via a shared "who intervenes?" hub;
 * the Hunter fires on any death.
 */
interface Resolution {
  phase: Phase;
  deaths: string[]; // everyone dying this phase so far (grows/shrinks as powers resolve)
  eliminated: string[]; // village-condemned players — the servants' target pool
  claimed: string[]; // eliminated players already resolved by a servant
  usedServants: string[]; // servant holders (players) who have already intervened this round
  huntersFired: string[]; // Hunters who have already taken their shot
  servantsDone: boolean; // the intervene hub has been dismissed
  notes: string[]; // moderator-facing footnotes about spares, survivals, etc.
}

type ServantRole = "servant" | "devoted-servant";

const SERVANT_LABELS: Record<ServantRole, string> = {
  servant: "Servant",
  "devoted-servant": "Devoted Servant",
};

/** A small rolled-parchment glyph for the aftermath scroll toggle. */
function ScrollGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M7 3h9a2 2 0 0 1 2 2v12a2 2 0 0 0 2 2H9a2 2 0 0 1-2-2V3Z" />
      <path d="M7 3a2 2 0 0 0-2 2v2h2" />
      <path d="M10 8h5M10 12h5" />
    </svg>
  );
}

/**
 * The aftermath "scroll" — a moderator's private account of everything the app
 * knows happened this phase. Closed by default; the moderator unfurls it to
 * refresh their memory, then decides what (if anything) to tell the table.
 */
function NightScroll({
  open,
  onToggle,
  lines,
  isNight,
  announced,
  onToggleLine,
}: {
  open: boolean;
  onToggle: () => void;
  lines: string[];
  isNight: boolean;
  /** Indices of lines the moderator has marked as told to the whole table. */
  announced: number[];
  onToggleLine: (i: number) => void;
}) {
  const shared = lines.length ? announced.filter((i) => i < lines.length).length : 0;
  return (
    <div className="mx-auto mt-3 w-full max-w-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-bark-400 bg-night-800/70 px-4 py-2 text-sm text-moon-200 transition-colors hover:border-moon-200"
      >
        <ScrollGlyph />
        {open ? "Roll up the scroll" : `Unfurl ${isNight ? "the night's" : "the day's"} scroll`}
      </button>
      {open && (
        <div className="mt-2 rounded-lg border border-bark-400 bg-gradient-to-b from-bark-600/50 to-night-900/70 p-4 text-left">
          <div className="mb-2 flex items-baseline justify-between gap-2">
            <p className="font-display text-xs tracking-[0.3em] text-bark-300 uppercase">
              {isNight ? "The night's account" : "The day's account"}
            </p>
            <span className="text-[0.65rem] tracking-wide text-moss-400">
              {shared}/{lines.length} told
            </span>
          </div>
          <p className="mb-2 text-[0.7rem] text-moss-400 italic">
            Tap a line once you've announced it to the table.
          </p>
          <ul className="space-y-1">
            {lines.map((line, i) => {
              const on = announced.includes(i);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onToggleLine(i)}
                    className={`flex w-full items-start gap-2 rounded-md border px-2 py-1.5 text-left text-sm leading-snug transition-colors ${
                      on
                        ? "border-moss-400/60 bg-moss-400/10 text-moon-100"
                        : "border-transparent text-moss-300 hover:border-bark-400/60"
                    }`}
                  >
                    <span
                      aria-hidden
                      className={`mt-px grid h-4 w-4 shrink-0 place-items-center rounded-full border text-[0.6rem] ${
                        on
                          ? "border-moss-400 bg-moss-400/20 text-moss-200"
                          : "border-pine-600 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span>{line}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/** A full capture of the mutable game state, so any screen can be restored. */
export interface Snapshot {
  dead: string[];
  round: number;
  phase: Phase;
  view: View;
  wakeQueue: string[];
  wakePick: string | null;
  wakePicks: string[];
  wakeShown: boolean;
  lovers: string[];
  roleModel: string | null;
  turnedWolves: string[];
  soaked: string[];
  charmed: string[];
  pendingBurn: string[];
  protectedPlayer: string | null;
  lastProtected: string | null;
  sleepwalkerVisit: string | null;
  lastVisit: string | null;
  seerViews: string[];
  actorUsedIdx: number[];
  actorPick: number | null;
  wolfFatherUsed: boolean;
  witchHealUsed: boolean;
  witchPoisonUsed: boolean;
  witchHeal: string | null;
  witchPoison: string | null;
  pending: string[];
  pendingHunters: string[];
  lastAttacked: string[];
  lastDeaths: string[];
  lastNotes: string[];
  roleOverride: Record<string, string>;
  revealedDead: string[];
  res: Resolution | null;
  resPick: string | null;
  servantChoosing: ServantRole | null;
  devotedReveal: { servant: string; target: string } | null;
  powersDisabled: boolean;
  infectedPending: string[];
  princeUsed: string[];
  idiotSpared: string[];
  elderSurvived: string[];
  judgeUsed: boolean;
  foxDone: string[];
  ravenCursed: string | null;
  packEnraged: boolean;
  whiteWolfKill: string | null;
  wolfFatherTarget: string | null;
  angelWon: boolean;
  wolfSorcery: boolean;
  wolfKillCount: number;
  nightLog: string[];
}

/**
 * Moderator-run game loop. Nights (the werewolves' kill) and days (the village
 * vote) alternate, each with a selection screen and an aftermath notice board.
 * After deaths are recorded, an elimination resolver walks the moderator
 * through on-death triggers before the board is shown.
 */
export default function NightPhase({
  assignments,
  board,
  middleCards = [],
  actorCards = [],
  resume,
  onMainMenu,
  onSameVillage,
  onNewVillage,
  onRedeal,
}: {
  assignments: Assignment[];
  board: Assignment[];
  middleCards?: string[];
  actorCards?: string[];
  /** A saved Snapshot to restore into on mount (resuming an interrupted game). */
  resume?: Snapshot;
  /** Leave for the app's home screen. The game is saved and can be resumed. */
  onMainMenu: () => void;
  /** Abandon this game, keep the players, and rebuild the cast. */
  onSameVillage: () => void;
  /** Abandon this game and start again from the player names. */
  onNewVillage: () => void;
  /** Keep the same cast, but shuffle and deal the roles afresh. */
  onRedeal: () => void;
}) {
  const players = useMemo(() => assignments.map((a) => a.player), [assignments]);
  const baseRole = useMemo(
    () => Object.fromEntries(assignments.map((a) => [a.player, a.characterId])),
    [assignments],
  );

  // Night-1 wake queue (roles that wake, are in play, and are implemented).
  const initialWakeQueue = NIGHT_SEQUENCE.filter(
    (c) => IMPLEMENTED_WAKE.has(c.id) && players.some((p) => baseRole[p] === c.id),
  ).map((c) => c.id);

  const [dead, setDead] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("night");
  const [view, setView] = useState<View>(initialWakeQueue.length ? "wake" : "select");
  // Roles still owed a wake-up prompt this night, in order.
  const [wakeQueue, setWakeQueue] = useState<string[]>(initialWakeQueue);
  // Per-step scratch for the current wake prompt (e.g. the Seer's chosen target).
  const [wakePick, setWakePick] = useState<string | null>(null);
  const [wakePicks, setWakePicks] = useState<string[]>([]);
  const [wakeShown, setWakeShown] = useState(false);

  // Cupid's two lovers — if one dies, the other dies of heartbreak.
  const [lovers, setLovers] = useState<string[]>([]);
  // Wild Child's role model, and any Wild Children who have turned werewolf.
  const [roleModel, setRoleModel] = useState<string | null>(null);
  const [turnedWolves, setTurnedWolves] = useState<string[]>([]);
  // Pyromaniac's soaked houses and Piper's charmed players (solo win tracking).
  const [soaked, setSoaked] = useState<string[]>([]);
  const [charmed, setCharmed] = useState<string[]>([]);
  // Soaked houses the Pyromaniac ignited this night — burned in at record time.
  const [pendingBurn, setPendingBurn] = useState<string[]>([]);
  // Defender's charge this night, and last night's (can't be repeated).
  const [protectedPlayer, setProtectedPlayer] = useState<string | null>(null);
  const [lastProtected, setLastProtected] = useState<string | null>(null);
  // Sleepwalker's visit this night, and last night's (can't be repeated).
  const [sleepwalkerVisit, setSleepwalkerVisit] = useState<string | null>(null);
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  // Players the Seer glimpsed this night, so the scroll can recount it. Cleared
  // when the night ends.
  const [seerViews, setSeerViews] = useState<string[]>([]);
  // Moderator-facing account of what each waking role actually did this night, so
  // the scroll can recount powers that leave no trace in the death toll (the
  // Defender's shield, the Fox's sniff, the Raven's omen…). Cleared at daybreak.
  const [nightLog, setNightLog] = useState<string[]>([]);
  const logNight = (line: string) => setNightLog((l) => [...l, line]);
  // Fox holders who have spent their power (a sniff that turned up no wolves).
  const [foxDone, setFoxDone] = useState<string[]>([]);
  // The Raven's cursed player: carries two extra guilty votes into the coming
  // day, badged "+2" on the vote circle, then clears when the next night falls.
  const [ravenCursed, setRavenCursed] = useState<string | null>(null);
  // The pack is owed a double kill next night because a Werewolf Cub was slain.
  const [packEnraged, setPackEnraged] = useState(false);
  // The fellow wolf the White Werewolf marks on their off-night kill (folds into
  // the night's deaths, then clears).
  const [whiteWolfKill, setWhiteWolfKill] = useState<string | null>(null);
  // Who the Accursed Wolf-Father bit tonight. The bite only takes hold at dawn:
  // if anything pulls them out of death first (the Witch's brew, the Defender's
  // shield) the convert simply lives on and his one-shot power is wasted.
  const [wolfFatherTarget, setWolfFatherTarget] = useState<string | null>(null);
  // The Angel achieved their wish — eliminated on the very first day or night.
  const [angelWon, setAngelWon] = useState(false);
  // What the wolves did this night, so the Rooster can crow a fitting (but still
  // unspecific) omen at dawn: whether a hidden dark power fired (White Werewolf's
  // strike or the Wolf-Father's bite), and how many the pack marked for death.
  const [wolfSorcery, setWolfSorcery] = useState(false);
  const [wolfKillCount, setWolfKillCount] = useState(0);
  // Actor: which of the three fixed card positions are spent, and tonight's pick.
  // Positions stay put across nights (0/1 top row, 2 bottom-centre) so spent
  // cards leave a gap and the survivors keep their placement.
  const [actorUsedIdx, setActorUsedIdx] = useState<number[]>([]);
  const [actorPick, setActorPick] = useState<number | null>(null);
  // Accursed Wolf-Father's one-time villager-to-wolf conversion.
  const [wolfFatherUsed, setWolfFatherUsed] = useState(false);
  // The Witch's two once-per-game potions, and her picks on the current night.
  const [witchHealUsed, setWitchHealUsed] = useState(false);
  const [witchPoisonUsed, setWitchPoisonUsed] = useState(false);
  const [witchHeal, setWitchHeal] = useState<string | null>(null);
  const [witchPoison, setWitchPoison] = useState<string | null>(null);
  const [pending, setPending] = useState<string[]>([]);
  // Hunters slain in the night who owe a public shot once the village wakes —
  // resolved on the dawn board, not silently at night. Emptied as each fires.
  const [pendingHunters, setPendingHunters] = useState<string[]>([]);
  // Who the night's kill marked (before saves) / who the day condemned — kept so
  // the aftermath scroll can report the attack even when the target survived.
  const [lastAttacked, setLastAttacked] = useState<string[]>([]);
  const [lastDeaths, setLastDeaths] = useState<string[]>([]);
  const [lastNotes, setLastNotes] = useState<string[]>([]);

  // A Devoted Servant / Doppelgänger re-points their player to a new secret role.
  const [roleOverride, setRoleOverride] = useState<Record<string, string>>({});
  // Players shown fallen on the board under their own card despite playing on
  // in secret (the Devoted Servant). The Doppelgänger stays alive, so is absent.
  const [revealedDead, setRevealedDead] = useState<string[]>([]);

  // Elder's death by the village vote strips every villager of their powers.
  const [powersDisabled, setPowersDisabled] = useState(false);
  // Werewolves the Rusty Sword Knight has infected — they die the following night.
  const [infectedPending, setInfectedPending] = useState<string[]>([]);
  // Once-only survivals: Prince/Idiot dodge a vote, Elder shrugs off a wolf attack.
  const [princeUsed, setPrinceUsed] = useState<string[]>([]);
  const [idiotSpared, setIdiotSpared] = useState<string[]>([]);
  const [elderSurvived, setElderSurvived] = useState<string[]>([]);
  // The Stuttering Judge's one-time second vote (called from the day board).
  const [judgeUsed, setJudgeUsed] = useState(false);

  // Read-only moderator reference overlay: night wake order or the full roster.
  const [reference, setReference] = useState<"wake" | "roster" | null>(null);
  // Whether the aftermath "scroll" (full account of the night) is unfurled, and
  // which of its lines the moderator has marked as announced to the table. Both
  // are ephemeral view state (reset each board), so they stay out of the Snapshot.
  const [scrollOpen, setScrollOpen] = useState(false);
  const [announced, setAnnounced] = useState<number[]>([]);
  // The in-game hamburger menu, its confirmation prompt for the destructive
  // options, and the "revisit your cards" pass-around. All pure view state: the
  // revisit is an overlay rather than a `view`, so it never disturbs the game.
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ text: string; onYes: () => void } | null>(
    null,
  );
  const [revisitOpen, setRevisitOpen] = useState(false);
  const [revisitPlayer, setRevisitPlayer] = useState<string | null>(null);
  const [revisitShown, setRevisitShown] = useState(false);

  const [res, setRes] = useState<Resolution | null>(null);
  const [resPick, setResPick] = useState<string | null>(null);
  // Which servant is currently picking a target from the intervene hub.
  const [servantChoosing, setServantChoosing] = useState<ServantRole | null>(null);
  // Devoted Servant's private card reveal, shown before the swap is finalised.
  const [devotedReveal, setDevotedReveal] = useState<{
    servant: string;
    target: string;
  } | null>(null);

  // Screen history — one snapshot per transition, so Undo restores the last screen.
  const [history, setHistory] = useState<Snapshot[]>([]);
  // When resuming a saved game we hydrate on mount before writing any save back,
  // so the fresh-mount default state never clobbers the stored game. A brand-new
  // game is "hydrated" from the start.
  const [hydrated, setHydrated] = useState(!resume);

  const snapshot = (): Snapshot => ({
    dead,
    round,
    phase,
    view,
    wakeQueue,
    wakePick,
    wakePicks,
    wakeShown,
    lovers,
    roleModel,
    turnedWolves,
    soaked,
    charmed,
    pendingBurn,
    protectedPlayer,
    lastProtected,
    sleepwalkerVisit,
    lastVisit,
    seerViews,
    actorUsedIdx,
    actorPick,
    wolfFatherUsed,
    witchHealUsed,
    witchPoisonUsed,
    witchHeal,
    witchPoison,
    pending,
    pendingHunters,
    lastAttacked,
    lastDeaths,
    lastNotes,
    roleOverride,
    revealedDead,
    res,
    resPick,
    servantChoosing,
    devotedReveal,
    powersDisabled,
    infectedPending,
    princeUsed,
    idiotSpared,
    elderSurvived,
    judgeUsed,
    foxDone,
    ravenCursed,
    packEnraged,
    whiteWolfKill,
    wolfFatherTarget,
    angelWon,
    wolfSorcery,
    wolfKillCount,
    nightLog,
  });
  const pushHistory = () => setHistory((h) => [...h, snapshot()]);
  // Push every field of a Snapshot back into live state — shared by Undo (steps
  // back one screen) and resume-on-mount (restores a saved game).
  const restore = (prev: Snapshot) => {
    setDead(prev.dead);
    setRound(prev.round);
    setPhase(prev.phase);
    setView(prev.view);
    setWakeQueue(prev.wakeQueue);
    setWakePick(prev.wakePick);
    setWakePicks(prev.wakePicks);
    setWakeShown(prev.wakeShown);
    setLovers(prev.lovers);
    setRoleModel(prev.roleModel);
    setTurnedWolves(prev.turnedWolves);
    setSoaked(prev.soaked);
    setCharmed(prev.charmed);
    setPendingBurn(prev.pendingBurn);
    setProtectedPlayer(prev.protectedPlayer);
    setLastProtected(prev.lastProtected);
    setSleepwalkerVisit(prev.sleepwalkerVisit);
    setLastVisit(prev.lastVisit);
    setSeerViews(prev.seerViews);
    setActorUsedIdx(prev.actorUsedIdx);
    setActorPick(prev.actorPick);
    setWolfFatherUsed(prev.wolfFatherUsed);
    setWitchHealUsed(prev.witchHealUsed);
    setWitchPoisonUsed(prev.witchPoisonUsed);
    setWitchHeal(prev.witchHeal);
    setWitchPoison(prev.witchPoison);
    setPendingHunters(prev.pendingHunters);
    setPending(prev.pending);
    setLastAttacked(prev.lastAttacked);
    setLastDeaths(prev.lastDeaths);
    setLastNotes(prev.lastNotes);
    setRoleOverride(prev.roleOverride);
    setRevealedDead(prev.revealedDead);
    setRes(prev.res);
    setResPick(prev.resPick);
    setServantChoosing(prev.servantChoosing);
    setDevotedReveal(prev.devotedReveal);
    setPowersDisabled(prev.powersDisabled);
    setInfectedPending(prev.infectedPending);
    setPrinceUsed(prev.princeUsed);
    setIdiotSpared(prev.idiotSpared);
    setElderSurvived(prev.elderSurvived);
    setJudgeUsed(prev.judgeUsed);
    setFoxDone(prev.foxDone);
    setRavenCursed(prev.ravenCursed);
    setPackEnraged(prev.packEnraged);
    setWhiteWolfKill(prev.whiteWolfKill);
    setWolfFatherTarget(prev.wolfFatherTarget);
    setAngelWon(prev.angelWon);
    setWolfSorcery(prev.wolfSorcery);
    setWolfKillCount(prev.wolfKillCount);
    setNightLog(prev.nightLog);
  };
  const undo = () => {
    if (!history.length) return;
    restore(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
  };
  const canUndo = history.length > 0;

  const roleOf = (p: string) => roleOverride[p] ?? baseRole[p];
  const roleName = (p: string) => byId(roleOf(p))?.name ?? "?";
  // A Wild Child who turned counts as a werewolf even though their card is unchanged.
  const teamOf = (p: string) =>
    turnedWolves.includes(p) ? "werewolf" : byId(roleOf(p))?.team;

  // How a player reads to inspection powers.
  //  - Anyone who has actually become a wolf (the Wolf-Father's convert, a turned
  //    Wild Child) reads as a plain Werewolf, whatever card they still hold.
  //  - The Traitor sides with the wolves but has no fangs, so they read as an
  //    ordinary Villager and the Fox smells nothing on them.
  const observedRole = (p: string) =>
    turnedWolves.includes(p) ? "werewolf" : roleOf(p) === "traitor" ? "villager" : roleOf(p);
  /** The role name an inspection actually revealed — the disguise, not the truth. */
  const observedName = (p: string) => byId(observedRole(p))?.name ?? "?";
  const readsAsWolf = (p: string) => teamOf(p) === "werewolf" && roleOf(p) !== "traitor";

  // How many victims the wolves may take tonight: one, plus the Big Bad Wolf's
  // bonus (while the pack is still whole) and the Werewolf Cub's posthumous rage.
  const bigBadActive =
    players.some((p) => roleOf(p) === "big-bad-wolf" && !dead.includes(p)) &&
    !dead.some((p) => readsAsWolf(p));
  const nightKillCap = 1 + (bigBadActive ? 1 : 0) + (packEnraged ? 1 : 0);

  // The Bear Tamer's bear growls at dawn if either of its keeper's nearest living
  // neighbours (around the seating circle) is a werewolf. The Traitor has no wolf
  // scent, and a turned Wild Child does — both handled by readsAsWolf.
  const bearGrowls = (): boolean => {
    const n = players.length;
    const nearestLiving = (start: number, step: number): string | null => {
      for (let k = 1; k < n; k++) {
        const cand = players[(((start + step * k) % n) + n) % n];
        if (!dead.includes(cand)) return cand;
      }
      return null;
    };
    return players.some((p, i) => {
      if (roleOf(p) !== "bear-tamer" || dead.includes(p)) return false;
      const left = nearestLiving(i, -1);
      const right = nearestLiving(i, 1);
      return [left, right].some((q) => q !== null && q !== p && readsAsWolf(q));
    });
  };

  // Who (if anyone) has won given a hypothetical set of dead players. Pulled out
  // so a Hunter's morning shot can be checked for a game-ending result on the spot.
  const winnerFor = (
    deadList: string[],
  ): "village" | "werewolf" | "pyromaniac" | "piper" | "white-werewolf" | "angel" | null => {
    // The Angel's wish, granted the moment they fall on the first day or night,
    // ends the game outright — checked before every other faction.
    if (angelWon) return "angel";
    const live = players.filter((p) => !deadList.includes(p));
    const wolves = live.filter((p) => teamOf(p) === "werewolf").length;
    const pyros = live.filter((p) => roleOf(p) === "pyromaniac");
    const pipers = live.filter((p) => roleOf(p) === "piper");
    // The White Werewolf's private victory: outlast every other soul, pack included.
    if (live.length === 1 && roleOf(live[0]) === "white-werewolf") return "white-werewolf";
    // Piper wins the moment every other living player is charmed.
    if (pipers.length) {
      const others = live.filter((p) => !pipers.includes(p));
      if (others.length > 0 && others.every((p) => charmed.includes(p))) return "piper";
    }
    // Pyromaniac wins as the last soul standing.
    if (pyros.length && live.every((p) => roleOf(p) === "pyromaniac")) return "pyromaniac";
    if (wolves > 0 && wolves * 2 >= live.length) return "werewolf";
    // The village prevails only once no wolves and no solo threats remain.
    if (wolves === 0 && !pyros.length && !pipers.length) return "village";
    return null;
  };
  const result = winnerFor(dead);

  // Restore a saved game once, before first paint, so there's no flash of the
  // fresh-deal default state. useLayoutEffect + the mount-only deps run it once.
  useLayoutEffect(() => {
    if (resume) {
      restore(resume);
      setHydrated(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save the game to localStorage on every change, so a killed app or a
  // locked phone can resume mid-night. A finished game (someone has won) clears
  // the slot instead — there's nothing left to resume.
  const persisted = JSON.stringify({ assignments, board, middleCards, actorCards, state: snapshot() });
  useEffect(() => {
    if (!hydrated) return;
    if (result) clearGame();
    else saveGame(JSON.parse(persisted));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [persisted, hydrated, result]);

  const boardItems: BoardItem[] = board.map((a) => {
    // A Devoted Servant / Doppelgänger keeps their ORIGINAL card on the board,
    // never the secret role they took on. The Servant also shows as fallen
    // (they revealed and "left"); the Doppelgänger plays on visibly alive.
    const overridden = roleOverride[a.player] !== undefined;
    const shownDead = dead.includes(a.player) || revealedDead.includes(a.player);
    return {
      characterId: overridden ? baseRole[a.player] : roleOf(a.player),
      hidden: a.random && !shownDead,
      dead: shownDead,
    };
  });

  /* ------------------------ Elimination resolution ----------------------- */

  /** The living, not-yet-used holder of a servant role, if any. */
  const servantHolder = (roleId: ServantRole, r: Resolution) =>
    players.find(
      (p) =>
        !dead.includes(p) &&
        !r.deaths.includes(p) &&
        !r.usedServants.includes(p) &&
        // A servant bound by Cupid loves too deeply to serve anyone else.
        !lovers.includes(p) &&
        roleOf(p) === roleId,
    ) ?? null;

  /** Village-condemned players a servant may still act on (not already claimed). */
  const servantTargets = (r: Resolution) =>
    r.eliminated.filter((p) => !r.claimed.includes(p));

  /** Servant roles that can still intervene this round (holder alive, targets left). */
  const availableServants = (r: Resolution): ServantRole[] =>
    servantTargets(r).length
      ? (["servant", "devoted-servant"] as const).filter((id) => servantHolder(id, r))
      : [];

  /** The nearest living werewolf to a player's left (walking around the circle). */
  const wolfToLeftOf = (player: string, dyingNow: string[]): string | null => {
    const i = players.indexOf(player);
    if (i < 0) return null;
    for (let s = 1; s < players.length; s++) {
      const cand = players[(i + s) % players.length];
      if (dead.includes(cand) || dyingNow.includes(cand)) continue;
      if (byId(roleOf(cand))?.team === "werewolf") return cand;
    }
    return null;
  };

  type Prompt = { kind: "servantHub" } | { kind: "hunter"; player: string };

  const nextPrompt = (r: Resolution): Prompt | null => {
    // Once the Elder falls to the village, every villager power is gone.
    if (powersDisabled) return null;
    // Servants only step in after a village vote, before the condemned are revealed.
    if (r.phase === "day" && !r.servantsDone && availableServants(r).length) {
      return { kind: "servantHub" };
    }
    // The Hunter fires at once only when felled by a waking village (the day
    // vote). A Hunter slain in the night takes their shot in the morning instead
    // (queued in commit, resolved on the dawn board), so it plays out in public.
    const hunter = r.deaths.find(
      (p) => roleOf(p) === "hunter" && !r.huntersFired.includes(p) && !r.claimed.includes(p),
    );
    if (r.phase === "day" && hunter) return { kind: "hunter", player: hunter };
    return null;
  };

  /** Cupid: a lover's death drags their partner along by heartbreak. */
  const expandLovers = (deaths: string[]): string[] => {
    if (lovers.length !== 2) return deaths;
    const [a, b] = lovers;
    const out = [...deaths];
    const pull = (x: string) => {
      if (!out.includes(x) && !dead.includes(x)) out.push(x);
    };
    if (out.includes(a)) pull(b);
    if (out.includes(b)) pull(a);
    return out;
  };

  const commit = (r: Resolution) => {
    setDead((d) => [...d, ...r.deaths]);
    setLastDeaths(r.deaths);
    // Hunters slain in the night owe a shot come morning — queue them for the
    // dawn board rather than firing silently before the village wakes.
    if (r.phase === "night") {
      const fallen = r.deaths.filter((p) => roleOf(p) === "hunter");
      if (fallen.length) setPendingHunters((h) => [...h, ...fallen]);
    }
    let notes = r.notes;
    // The Elder felled by the village's own vote strips every villager of power.
    if (r.phase === "day" && !powersDisabled && r.deaths.some((p) => roleOf(p) === "elder")) {
      setPowersDisabled(true);
      notes = [...notes, "The Elder dies by the village's hand — every villager power is undone."];
    }
    // Lovers always fall together in the same round (see expandLovers).
    if (lovers.length === 2 && lovers.every((p) => r.deaths.includes(p))) {
      notes = [...notes, `${lovers[0]} and ${lovers[1]} were lovers — heartbreak takes them both.`];
    }
    // Wild Child: their role model's real death turns them werewolf.
    if (roleModel && r.deaths.includes(roleModel)) {
      const cubs = players.filter(
        (p) =>
          roleOf(p) === "wild-child" &&
          !dead.includes(p) &&
          !r.deaths.includes(p) &&
          !turnedWolves.includes(p),
      );
      if (cubs.length) {
        setTurnedWolves((w) => [...w, ...cubs]);
        notes = [
          ...notes,
          `${cubs.join(" & ")}'s role model has fallen — the Wild Child turns werewolf.`,
        ];
      }
    }
    // A Werewolf Cub slain (any way) whips the surviving pack into a double kill
    // on the following night.
    if (r.deaths.some((p) => roleOf(p) === "werewolf-cub")) {
      setPackEnraged(true);
      notes = [
        ...notes,
        "The Werewolf Cub has fallen — the pack will take two victims next night.",
      ];
    }
    // The Angel's wish is granted if they are eliminated on the first day or night.
    if (round === 1 && r.deaths.some((p) => roleOf(p) === "angel")) {
      setAngelWon(true);
    }
    setLastNotes(notes);
    setRes(null);
    setResPick(null);
    setView("board");
  };

  const step = (r: Resolution) => {
    const deaths = expandLovers(r.deaths);
    const rr = deaths.length === r.deaths.length ? r : { ...r, deaths };
    if (nextPrompt(rr)) {
      setRes(rr);
      setResPick(null);
    } else {
      commit(rr);
    }
  };

  /**
   * Resolve the phase's deaths. Choices made during the post-kill interludes are
   * passed in rather than read from state, because a step that falls straight
   * through to record() in the same event hasn't had its setState applied yet.
   * An omitted field means "nothing fresh — use what's already in state".
   */
  const record = (opts?: {
    witch?: { heal: string | null; poison: string | null };
    fatherTarget?: string | null;
    whiteKill?: string | null;
  }) => {
    pushHistory();
    const witch = opts?.witch;
    const father = opts?.fatherTarget !== undefined ? opts.fatherTarget : wolfFatherTarget;
    const white = opts?.whiteKill !== undefined ? opts.whiteKill : whiteWolfKill;
    const raw = pending;
    setPending([]);
    // Remember who was marked this phase (wolves' victims / the condemned) so the
    // scroll can recount the attack even for those who ended up surviving.
    setLastAttacked(raw);

    const notes: string[] = [];
    let deaths = [...raw];

    // The Witch's healing potion pulls one of the wolves' victims back before any
    // other night power resolves.
    if (witch?.heal) {
      deaths = deaths.filter((p) => p !== witch.heal);
      setWitchHealUsed(true);
      notes.push(`The Witch's healing brew pulls ${witch.heal} back from the brink.`);
    }

    if (phase === "night") {
      // The Defender's shield turns the wolves away from their charge (wolves only).
      if (protectedPlayer && deaths.includes(protectedPlayer)) {
        deaths = deaths.filter((p) => p !== protectedPlayer);
        notes.push(`The Defender's shield turned the wolves away from ${protectedPlayer}.`);
      }

      // The Elder secretly shrugs off the wolves' first attack — before the
      // Sleepwalker reads the room, so a surviving Elder isn't counted as slain.
      if (!powersDisabled) {
        const elder = deaths.find((p) => roleOf(p) === "elder" && !elderSurvived.includes(p));
        if (elder) {
          deaths = deaths.filter((p) => p !== elder);
          setElderSurvived((s) => [...s, elder]);
          notes.push(
            `${elder} is the Elder and secretly survives the wolves' first bite — keep it quiet.`,
          );
        }
      }

      // Sleepwalker: away in an empty bed, or caught at the house she visited.
      const sw = players.find((p) => roleOf(p) === "sleepwalker" && !dead.includes(p));
      if (sw && sleepwalkerVisit) {
        if (deaths.includes(sw)) {
          deaths = deaths.filter((p) => p !== sw);
          notes.push("The Sleepwalker was out wandering — the wolves found her bed empty.");
        }
        if (deaths.includes(sleepwalkerVisit) && !deaths.includes(sw)) {
          deaths = [...deaths, sw];
          notes.push(
            `The Sleepwalker was caught at ${sleepwalkerVisit}'s house and slain alongside them.`,
          );
        }
        notes.push(
          byId(roleOf(sleepwalkerVisit))?.nightOrder != null
            ? `The Sleepwalker senses ${sleepwalkerVisit} acted suspiciously in the night.`
            : `The Sleepwalker found ${sleepwalkerVisit} sleeping soundly.`,
        );
      }

      // The Accursed Wolf-Father's bite. It only takes hold on a victim the wolves
      // actually killed: anything that pulled them out of death first (the Witch's
      // brew, the Defender's shield, the Elder's hide) purges the bite and wastes
      // his one-shot power. A convert keeps their own card and every power that
      // goes with it — only their allegiance changes, so turnedWolves is enough.
      if (father) {
        if (deaths.includes(father)) {
          deaths = deaths.filter((p) => p !== father);
          setTurnedWolves((w) => [...w, father]);
          notes.push(
            `The Accursed Wolf-Father's bite turns ${father} into a werewolf — they keep the ${roleName(
              father,
            )}'s powers but now hunt with the pack.`,
          );
        } else {
          notes.push(
            `${father} was pulled from death before the Wolf-Father's bite took hold — his power is wasted.`,
          );
        }
        setWolfFatherTarget(null);
      }

      // A Rusty Sword Knight slain by the wolves infects the wolf to their left.
      if (!powersDisabled) {
        const knight = deaths.find((p) => roleOf(p) === "rusty-sword-knight");
        if (knight) {
          const wolf = wolfToLeftOf(knight, deaths);
          if (wolf) {
            setInfectedPending((q) => [...q, wolf]);
            notes.push(
              "The Rusty Sword Knight's rusty blade cuts the wolf to their left — they will die by the next dawn.",
            );
          }
        }
      }

      // The Knight's infection from a prior night lands now.
      const due = infectedPending.filter((p) => !dead.includes(p) && !deaths.includes(p));
      if (due.length) {
        deaths = [...deaths, ...due];
        due.forEach((p) =>
          notes.push(`${p} — the ${roleName(p)} — dies of the Rusty Sword Knight's infection.`),
        );
      }
      if (infectedPending.length) setInfectedPending([]);

      // Houses the Pyromaniac set alight this night burn down now.
      const burn = pendingBurn.filter((p) => !dead.includes(p) && !deaths.includes(p));
      if (burn.length) {
        deaths = [...deaths, ...burn];
        burn.forEach((p) =>
          notes.push(`${p} — the ${roleName(p)} — burns in the Pyromaniac's fire.`),
        );
      }
      if (pendingBurn.length) {
        setPendingBurn([]);
        setSoaked([]);
      }

      // The White Werewolf's private kill of a fellow wolf lands now — a guaranteed
      // strike its victim can't be shielded from.
      if (white && !dead.includes(white) && !deaths.includes(white)) {
        deaths = [...deaths, white];
        notes.push(`The White Werewolf turned on ${white} — devoured by its own kind.`);
      }
      if (whiteWolfKill) setWhiteWolfKill(null);

      // The Werewolf Cub's avenging double-kill (if any) is spent this night.
      if (packEnraged) setPackEnraged(false);

      // How many the pack marked tonight: 0 = they held off, 1 = a plain attack,
      // more = the Big Bad Wolf's bonus or the Cub's rampage. The Rooster crows
      // a different omen for each at dawn.
      setWolfKillCount(raw.length);
    } else if (!powersDisabled) {
      // Day vote — the Prince and Village Idiot may dodge the noose once.
      const prince = deaths.find((p) => roleOf(p) === "prince" && !princeUsed.includes(p));
      if (prince) {
        deaths = deaths.filter((p) => p !== prince);
        setPrinceUsed((s) => [...s, prince]);
        notes.push(`${prince} reveals the Prince's crest — royal blood is spared the noose.`);
      }
      const idiot = deaths.find((p) => roleOf(p) === "village-idiot" && !idiotSpared.includes(p));
      if (idiot) {
        deaths = deaths.filter((p) => p !== idiot);
        setIdiotSpared((s) => [...s, idiot]);
        notes.push(
          `${idiot} is exposed as the Village Idiot — spared, but stripped of their vote for good.`,
        );
      }
    }

    // The Witch's poison is a direct kill — immune to the wolf-only protections
    // above, but it still triggers heartbreak, the Hunter, and the like.
    if (witch?.poison) {
      setWitchPoisonUsed(true);
      if (!deaths.includes(witch.poison)) deaths = [...deaths, witch.poison];
      notes.push(`The Witch's poison takes ${witch.poison}.`);
    }

    step({
      phase,
      deaths,
      // Only a village vote gives the servants something to intervene on.
      eliminated: phase === "day" ? deaths : [],
      claimed: [],
      usedServants: [],
      huntersFired: [],
      servantsDone: false,
      notes,
    });
  };

  /* ---------------------- Post-kill night interludes --------------------- */
  /*
   * Once the pack names its victim, the night's remaining powers answer it in the
   * real wake order: the Wolf-Father's bite (105), the White Werewolf's betrayal
   * (120), then the Witch's potions (140). Each `to…` step either shows its screen
   * or hands straight on to the next; the last one resolves the deaths. A fresh
   * choice is threaded along as an argument, since its setState hasn't landed yet.
   */

  const beginKill = () => toWolfFather();

  const toWolfFather = () => {
    // A wolf power, so the Elder's death doesn't disable it. He can only bite
    // someone the pack actually marked, and only a villager — never his own kind.
    const ready =
      !wolfFatherUsed &&
      players.some((p) => roleOf(p) === "accursed-wolf-father" && !dead.includes(p));
    if (isNight && ready && pending.some((p) => teamOf(p) === "village")) {
      pushHistory();
      setResPick(null);
      setView("wolfFather");
      return;
    }
    toWhiteWolf();
  };

  /** Wolf-Father bites a marked villager (or lets the kill stand), then moves on. */
  const confirmWolfFather = (victim: string | null) => {
    if (victim) {
      setWolfFatherTarget(victim);
      setWolfFatherUsed(true); // spent even if the bite is later purged
      setWolfSorcery(true);
    }
    toWhiteWolf(victim);
  };

  const toWhiteWolf = (fatherTarget?: string | null) => {
    const holder = players.some((p) => roleOf(p) === "white-werewolf" && !dead.includes(p));
    const prey = players.some(
      (p) => !dead.includes(p) && roleOf(p) !== "white-werewolf" && readsAsWolf(p),
    );
    // Every other night only, and only while there's a packmate left to eat.
    if (isNight && round % 2 === 0 && holder && prey) {
      pushHistory();
      setWakePick(null);
      setView("whiteWolf");
      return;
    }
    toWitch(fatherTarget);
  };

  /** White Werewolf marks a fellow wolf to devour (or spares them), then moves on. */
  const confirmWhiteWolf = () => {
    setWhiteWolfKill(wakePick);
    if (wakePick) setWolfSorcery(true);
    toWitch(undefined, wakePick);
  };

  const toWitch = (fatherTarget?: string | null, whiteKill?: string | null) => {
    if (isNight && !powersDisabled) {
      const witch = players.find((p) => roleOf(p) === "witch" && !dead.includes(p));
      if (witch && (!witchHealUsed || !witchPoisonUsed)) {
        pushHistory();
        setWitchHeal(null);
        setWitchPoison(null);
        setView("witch");
        return;
      }
    }
    record({ fatherTarget, whiteKill });
  };

  /** Witch confirms her potions; the picks fold into the night's resolution. */
  const confirmWitch = () => {
    record({ witch: { heal: witchHeal, poison: witchPoison } });
    setWitchHeal(null);
    setWitchPoison(null);
  };

  /** Servant: dies in place of a condemned player, sparing them. */
  const doSelfSacrifice = (servant: string, protect: string) => {
    if (!res) return;
    pushHistory();
    setServantChoosing(null);
    step({
      ...res,
      deaths: [...res.deaths.filter((p) => p !== protect), servant],
      claimed: [...res.claimed, protect],
      usedServants: [...res.usedServants, servant],
    });
  };

  /** Devoted Servant: choose whose role to inherit — the reveal comes next. */
  const doDevotedPick = (servant: string, target: string) => {
    pushHistory();
    setDevotedReveal({ servant, target });
    setServantChoosing(null);
  };

  const devotedConfirm = () => {
    if (!res || !devotedReveal) return;
    pushHistory();
    const { servant, target } = devotedReveal;
    setRoleOverride((o) => ({ ...o, [servant]: roleOf(target) }));
    setRevealedDead((r) => [...r, servant]); // shown fallen on the board
    setDevotedReveal(null);
    step({
      ...res,
      claimed: [...res.claimed, target],
      usedServants: [...res.usedServants, servant],
    });
  };

  /** No (further) servant wants to step in — move past the hub. */
  const servantsContinue = () => {
    if (!res) return;
    pushHistory();
    setServantChoosing(null);
    step({ ...res, servantsDone: true });
  };

  const hunterShoot = (hunter: string, target: string | null) => {
    if (!res) return;
    pushHistory();
    const deaths = target ? [...res.deaths, target] : res.deaths;
    step({ ...res, deaths, huntersFired: [...res.huntersFired, hunter] });
  };

  /**
   * A night-slain Hunter fires in the morning, in front of the woken village.
   * The victim (and any lover pulled with them) dies now; a Hunter caught this
   * way joins the queue to fire next. Once the queue empties, the day proper
   * begins — unless the shot itself ended the game.
   */
  const morningShot = (target: string | null) => {
    pushHistory();
    const [shooter, ...restQueue] = pendingHunters;
    let queue = restQueue;
    const newDeaths: string[] = [];
    const notes: string[] = [];
    if (target && !dead.includes(target)) {
      newDeaths.push(target);
      notes.push(`${shooter} — the Hunter — takes ${target} down with a dying shot.`);
      // A lover of the target dies of heartbreak alongside them.
      if (lovers.length === 2) {
        const [a, b] = lovers;
        const partner = target === a ? b : target === b ? a : null;
        if (partner && !dead.includes(partner) && !newDeaths.includes(partner)) {
          newDeaths.push(partner);
          notes.push(`${partner} dies of heartbreak, bound to ${target}.`);
        }
      }
      // Any Hunter felled by this shot fires next, still in the morning.
      queue = [...queue, ...newDeaths.filter((p) => roleOf(p) === "hunter")];
      // A slain role model turns the Wild Child, exactly as in the night resolution.
      if (roleModel && newDeaths.includes(roleModel)) {
        const cubs = players.filter(
          (p) =>
            roleOf(p) === "wild-child" &&
            !dead.includes(p) &&
            !newDeaths.includes(p) &&
            !turnedWolves.includes(p),
        );
        if (cubs.length) {
          setTurnedWolves((w) => [...w, ...cubs]);
          notes.push(
            `${cubs.join(" & ")}'s role model has fallen — the Wild Child turns werewolf.`,
          );
        }
      }
    } else {
      notes.push(`${shooter} — the Hunter — holds their fire.`);
    }
    if (newDeaths.some((p) => roleOf(p) === "werewolf-cub")) setPackEnraged(true);
    const angelNow = round === 1 && newDeaths.some((p) => roleOf(p) === "angel");
    if (angelNow) setAngelWon(true);
    if (newDeaths.length) setDead((d) => [...d, ...newDeaths]);
    setLastDeaths((prev) => [...prev, ...newDeaths]);
    setLastNotes((prev) => [...prev, ...notes]);
    setPendingHunters(queue);
    setResPick(null);
    if (queue.length) {
      setView("hunter"); // the next queued Hunter fires
    } else if (angelNow || winnerFor([...dead, ...newDeaths])) {
      setView("board"); // the shot ended the game — show the dawn board's result
    } else {
      beginDay(); // no one left to fire; the day proper begins
    }
  };

  const toggle = (name: string) =>
    setPending((p) =>
      p.includes(name)
        ? p.filter((x) => x !== name)
        : // At night the wolves may mark only as many victims as they're owed;
          // by day the count is unbounded (ties are settled at the table).
          isNight && p.length >= nightKillCap
          ? p
          : [...p, name],
    );

  /* --------------------------- Night wake-up ----------------------------- */

  /** Implemented waking roles with a living holder, in order, for a given night. */
  const wakeRolesFor = (rnd: number): string[] =>
    NIGHT_SEQUENCE.filter(
      (c) =>
        IMPLEMENTED_WAKE.has(c.id) &&
        (!c.firstNightOnly || rnd === 1) &&
        // The Actor borrows a role only for its first three nights.
        !(c.id === "actor" && actorUsedIdx.length >= 3) &&
        // A Fox whose sniff came up empty has lost the power for good.
        !(
          c.id === "fox" &&
          players
            .filter((p) => !dead.includes(p) && roleOf(p) === "fox")
            .every((p) => foxDone.includes(p))
        ) &&
        players.some((p) => !dead.includes(p) && roleOf(p) === c.id),
    ).map((c) => c.id);

  /** Finish the current wake prompt and move to the next role, or the kill. */
  const advanceWake = () => {
    pushHistory();
    const rest = wakeQueue.slice(1);
    setWakeQueue(rest);
    setWakePick(null);
    setWakePicks([]);
    setWakeShown(false);
    if (!rest.length) setView("select");
  };

  /** Open the day: switch phase, let the night's powers lapse, show the vote. */
  const beginDay = () => {
    setPhase("day");
    setView("select");
    // The night's protection / visit lapse; remember them so they can't repeat.
    setLastProtected(protectedPlayer);
    setProtectedPlayer(null);
    setLastVisit(sleepwalkerVisit);
    setSleepwalkerVisit(null);
    setSeerViews([]);
    setNightLog([]);
    setActorPick(null);
  };

  /**
   * Leave the "village wakes / sleeps" transition and actually begin the next
   * phase — day discussion after a night, or the next night's wake sequence.
   */
  const enterNextPhase = () => {
    pushHistory();
    if (phase === "night") {
      beginDay();
    } else {
      const nextRound = round + 1;
      setPhase("night");
      setRound(nextRound);
      // Last night's Raven curse lapses as the new night begins.
      setRavenCursed(null);
      // A fresh night: reset the Rooster's tally of what the wolves get up to.
      setWolfSorcery(false);
      setWolfKillCount(0);
      const q = wakeRolesFor(nextRound);
      setWakeQueue(q);
      setView(q.length ? "wake" : "select");
    }
  };

  /**
   * The transition's Continue button. A Hunter felled in the night takes their
   * shot now — after the village has woken — before the day proper begins.
   */
  const leaveTransition = () => {
    if (phase === "night" && pendingHunters.length) {
      pushHistory();
      setResPick(null);
      setView("hunter");
    } else {
      enterNextPhase();
    }
  };

  /** Cupid binds the two chosen players, then the sequence moves on. */
  const confirmCupid = () => {
    setLovers([...wakePicks]);
    logNight(`Cupid's arrow bound ${wakePicks.join(" and ")} as lovers.`);
    advanceWake();
  };

  /** Wild Child locks in their role model, then the sequence moves on. */
  const confirmWildChild = () => {
    if (wakePick) {
      setRoleModel(wakePick);
      logNight(`The Wild Child took ${wakePick} as their role model.`);
    }
    advanceWake();
  };

  /** Vile Doppelgänger secretly copies a player's role, then moves on. */
  const confirmDoppelganger = (doppel: string, target: string) => {
    setRoleOverride((o) => ({ ...o, [doppel]: roleOf(target) }));
    logNight(`The Vile Doppelgänger stole ${target}'s face — the ${roleName(target)}.`);
    advanceWake();
  };

  /** Thief swaps their card for one of the two middle cards, then moves on. */
  const confirmThief = (thief: string, cardId: string) => {
    setRoleOverride((o) => ({ ...o, [thief]: cardId }));
    logNight(`The Thief traded their card for the ${byId(cardId)?.name ?? "?"}.`);
    advanceWake();
  };

  /** Pyromaniac douses the picked houses in oil, then moves on. */
  const confirmSoak = () => {
    setSoaked((s) => [...s, ...wakePicks]);
    logNight(`The Pyromaniac doused ${wakePicks.join(" and ")} in oil.`);
    advanceWake();
  };

  /** Pyromaniac ignites — every living soaked house burns in this night's toll. */
  const confirmIgnite = () => {
    setPendingBurn(soaked.filter((p) => !dead.includes(p)));
    logNight("The Pyromaniac struck a match — every soaked house went up at once.");
    advanceWake();
  };

  /** Piper charms the picked players, then moves on. */
  const confirmCharm = () => {
    setCharmed((c) => [...c, ...wakePicks]);
    logNight(`The Piper's tune charmed ${wakePicks.join(" and ")}.`);
    advanceWake();
  };

  /** Defender shields their chosen charge for the night, then moves on. */
  const confirmDefend = () => {
    if (wakePick) {
      setProtectedPlayer(wakePick);
      logNight(`The Defender kept watch over ${wakePick}'s door.`);
    }
    advanceWake();
  };

  /** Seer's glimpse is logged for the aftermath scroll, then moves on. */
  const confirmSeer = () => {
    if (wakePick) setSeerViews((v) => [...v, wakePick]);
    advanceWake();
  };

  /** Sleepwalker locks in tonight's visit, then moves on. */
  const confirmVisit = () => {
    if (wakePick) setSleepwalkerVisit(wakePick);
    advanceWake();
  };

  /** The Gypsy's yes/no question is answered; log who she asked about, then move on. */
  const confirmGypsy = () => {
    if (wakePick) {
      logNight(`The Gypsy asked after ${wakePick} — you saw the ${observedName(wakePick)}.`);
    }
    advanceWake();
  };

  /**
   * Fox's sniff is resolved. A miss (no wolves among the three) spends the
   * power for every living Fox, so they wake no more. A hit keeps it.
   */
  const confirmFox = (anyWolf: boolean) => {
    if (!anyWolf) {
      const holders = players.filter((p) => !dead.includes(p) && roleOf(p) === "fox");
      setFoxDone((d) => [...d, ...holders.filter((p) => !d.includes(p))]);
    }
    logNight(
      anyWolf
        ? `The Fox sniffed at ${wakePicks.join(", ")} and caught the scent of wolf.`
        : `The Fox sniffed at ${wakePicks.join(", ")} and found nothing — the power is spent.`,
    );
    advanceWake();
  };

  /** Raven curses tonight's target — two extra votes fall on them come day. */
  const confirmRaven = () => {
    setRavenCursed(wakePick);
    logNight(`The Raven's omen settled on ${wakePick} — two extra votes at the trial.`);
    advanceWake();
  };

  /**
   * Actor turns over one of the still-unused card positions — the first card
   * they flip is the role they play tonight. The position is then spent for the
   * rest of the game so it can't be chosen again.
   */
  const pickActor = (idx: number) => {
    pushHistory();
    setActorPick(idx);
    setActorUsedIdx((u) => [...u, idx]);
    logNight(`The Actor took up the ${byId(actorCards[idx])?.name ?? "?"}'s mask for the night.`);
  };

  const isNight = phase === "night";
  const label = `${isNight ? "Night" : "Day"} ${round}`;

  // Shown on every in-game screen (except the very first) — steps back one screen.
  const undoRow = canUndo ? (
    <div className="flex justify-center">
      <button
        type="button"
        onClick={undo}
        className="rounded-full border border-pine-600 px-4 py-1.5 text-sm text-moss-300 hover:border-moss-400 hover:text-moon-100"
      >
        ↶ Undo
      </button>
    </div>
  ) : null;

  /** Stuttering Judge secretly forces a second vote on the same day. */
  const judgeAvailable =
    !isNight &&
    !powersDisabled &&
    !judgeUsed &&
    players.some((p) => !dead.includes(p) && roleOf(p) === "stuttering-judge");
  const secondVote = () => {
    pushHistory();
    setJudgeUsed(true);
    setPending([]);
    setView("select"); // stay on the same day, run another vote
  };

  /* -------------------- Moderator reference overlays --------------------- */
  // Only the roles actually in play, in wake-up order.
  const wakingRoles = NIGHT_SEQUENCE.filter((c) =>
    players.some((p) => roleOf(p) === c.id),
  );
  const referenceButtons = (
    <div className="flex justify-center gap-2">
      <button
        type="button"
        onClick={() => setReference("wake")}
        className="rounded-full border border-pine-600 px-3 py-1 text-xs text-moss-300 hover:border-moss-400 hover:text-moon-100"
      >
        ☾ Wake order
      </button>
      <button
        type="button"
        onClick={() => setReference("roster")}
        className="rounded-full border border-pine-600 px-3 py-1 text-xs text-moss-300 hover:border-moss-400 hover:text-moon-100"
      >
        ☰ Roster
      </button>
      <button
        type="button"
        onClick={() => setMenuOpen(true)}
        aria-label="Game menu"
        className="rounded-full border border-pine-600 px-3 py-1 text-xs text-moss-300 hover:border-moss-400 hover:text-moon-100"
      >
        ≡ Menu
      </button>
    </div>
  );
  const referenceOverlay = reference ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setReference(null)}
    >
      <div
        className="panel flex max-h-[82vh] w-full max-w-sm flex-col p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex gap-2">
          {(["wake", "roster"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setReference(tab)}
              className={`flex-1 rounded-full border px-3 py-1.5 text-sm ${
                reference === tab
                  ? "border-moon-200 bg-pine-500 text-moon-100"
                  : "border-pine-600 text-moss-300 hover:border-moss-400"
              }`}
            >
              {tab === "wake" ? "Wake order" : "Roster"}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {reference === "wake" ? (
            <ol className="flex flex-col gap-2">
              {wakingRoles.length ? (
                wakingRoles.map((c) => {
                  // Struck through once no holder of this role is still alive.
                  const allDead = !players.some(
                    (p) => roleOf(p) === c.id && !dead.includes(p),
                  );
                  // A living Fox who has sniffed out no wolves keeps his card but
                  // no longer wakes — flag the spent power so the moderator knows.
                  const foxSpent =
                    c.id === "fox" &&
                    !allDead &&
                    players
                      .filter((p) => roleOf(p) === "fox" && !dead.includes(p))
                      .every((p) => foxDone.includes(p));
                  return (
                    <li
                      key={c.id}
                      className={`relative flex items-center gap-3 rounded-lg border border-pine-600 bg-night-800/40 px-3 py-2 ${
                        allDead || foxSpent ? "opacity-60" : ""
                      }`}
                    >
                      <CharacterPortrait
                        character={c}
                        className={`h-9 w-9 shrink-0 ${allDead || foxSpent ? "grayscale" : ""}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-display text-sm ${
                            allDead ? "text-moss-400 line-through" : "text-moon-100"
                          }`}
                        >
                          {c.name}
                        </p>
                        {foxSpent ? (
                          <p className="text-[0.6rem] tracking-widest text-bark-300 uppercase">
                            Power spent
                          </p>
                        ) : (
                          c.firstNightOnly && (
                            <p className="text-[0.6rem] tracking-widest text-moss-300 uppercase">
                              First night only
                            </p>
                          )
                        )}
                      </div>
                      <span className="font-display text-xs text-moss-400">#{c.nightOrder}</span>
                      {allDead && (
                        <span className="pointer-events-none absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 rounded bg-blood-500/70" />
                      )}
                    </li>
                  );
                })
              ) : (
                <p className="text-center text-sm text-moss-300">No roles wake at night.</p>
              )}
            </ol>
          ) : (
            <ul className="flex flex-col gap-2">
              {players.map((p) => {
                const c = byId(roleOf(p));
                const isDead = dead.includes(p);
                return (
                  <li
                    key={p}
                    className="flex items-center gap-3 rounded-lg border border-pine-600 bg-night-800/40 px-3 py-2"
                  >
                    {c && (
                      <CharacterPortrait
                        character={c}
                        className={`h-9 w-9 shrink-0 ${isDead ? "opacity-50" : ""}`}
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p
                        className={`truncate font-display text-sm ${
                          isDead ? "text-moss-400 line-through" : "text-moon-100"
                        }`}
                      >
                        {p}
                      </p>
                      <p className="truncate text-xs text-moss-300">{c?.name ?? "?"}</p>
                    </div>
                    {isDead && <span className="text-xs text-blood-500">dead</span>}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          className="btn-lantern mt-3 w-full px-4 py-2"
          onClick={() => setReference(null)}
        >
          Close
        </button>
      </div>
    </div>
  ) : null;

  /* ------------------------------ Game menu ------------------------------ */
  // The three ways to start afresh. Each abandons the running game, so they ask
  // first; shared by the in-game hamburger and the end-of-game board.
  const restartOptions: { label: string; desc: string; run: () => void }[] = [
    {
      label: "Start over with the same village",
      desc: "Keep everyone at the table and pick the cast again.",
      run: onSameVillage,
    },
    {
      label: "Start over with another village",
      desc: "Back to the player names to set up a different table.",
      run: onNewVillage,
    },
    {
      label: "Re-deal the roles",
      desc: "Same cast, shuffled and handed out afresh.",
      run: onRedeal,
    },
  ];

  // The menu stays open underneath, so cancelling the prompt drops you back into
  // it rather than out to the game screen.
  const askThen = (label: string, run: () => void) =>
    setConfirmAction({ text: `${label}? The game in progress will be lost.`, onYes: run });

  const openRevisit = () => {
    setMenuOpen(false);
    setRevisitPlayer(null);
    setRevisitShown(false);
    setRevisitOpen(true);
  };

  const menuOverlay = menuOpen ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={() => setMenuOpen(false)}
    >
      <div className="panel w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
        <p className="mb-3 text-center font-display text-xs tracking-[0.3em] text-moss-300 uppercase">
          Menu
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={openRevisit}
            className="rounded-lg border border-moss-400/60 bg-night-800/60 p-3 text-left transition-colors hover:border-moss-400"
          >
            <p className="font-display text-sm text-moon-100">Revisit your cards</p>
            <p className="mt-0.5 text-[0.7rem] text-moss-300">
              Pass the phone round so anyone who forgot can peek again.
            </p>
          </button>
          {restartOptions.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => askThen(o.label, o.run)}
              className="rounded-lg border border-pine-600 bg-night-800/40 p-3 text-left transition-colors hover:border-moss-400"
            >
              <p className="font-display text-sm text-moon-100">{o.label}</p>
              <p className="mt-0.5 text-[0.7rem] text-moss-300">{o.desc}</p>
            </button>
          ))}
          {/* Not destructive: the night is saved, so it can be picked up again. */}
          <button
            type="button"
            onClick={onMainMenu}
            className="rounded-lg border border-pine-600 bg-night-800/40 p-3 text-left transition-colors hover:border-moss-400"
          >
            <p className="font-display text-sm text-moon-100">Main menu</p>
            <p className="mt-0.5 text-[0.7rem] text-moss-300">
              Leave the game — it's saved, so you can resume it from the home screen.
            </p>
          </button>
        </div>
        <button
          type="button"
          className="btn-lantern mt-3 w-full px-4 py-2"
          onClick={() => setMenuOpen(false)}
        >
          Close
        </button>
      </div>
    </div>
  ) : null;

  const confirmDialog = confirmAction ? (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
      onClick={() => setConfirmAction(null)}
    >
      <div className="panel max-w-xs p-5 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-moon-100">{confirmAction.text}</p>
        <div className="mt-4 flex gap-3">
          <button className="btn-lantern flex-1 px-4 py-2.5" onClick={() => setConfirmAction(null)}>
            Cancel
          </button>
          <button
            className="btn-lantern flex-1 px-4 py-2.5"
            onClick={() => {
              const yes = confirmAction.onYes;
              setConfirmAction(null);
              yes();
            }}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  ) : null;

  /* -------------------------- Revisit your cards ------------------------- */
  // A pass-the-phone refresher for anyone who forgot their role. It shows the
  // player's CURRENT card, so a Thief's swap or a Doppelgänger's copy reads true.
  const revisitCard = revisitPlayer ? byId(roleOf(revisitPlayer)) : undefined;
  const revisitOverlay = revisitOpen ? (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-night-950/95 p-4 backdrop-blur">
      <div className="mx-auto flex min-h-[calc(100dvh-2rem)] max-w-sm flex-col items-center justify-center gap-5 text-center">
        {!revisitPlayer ? (
          <>
            <h2 className="font-display text-2xl font-bold tracking-wider text-moon-100">
              Revisit your cards
            </h2>
            <p className="max-w-xs text-sm text-moss-200">Who needs to see their card again?</p>
            <div className="flex flex-wrap justify-center gap-2">
              {players
                .filter((p) => !dead.includes(p))
                .map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setRevisitPlayer(p);
                      setRevisitShown(false);
                    }}
                    className="rounded-full border border-pine-600 px-3 py-1.5 text-sm text-moss-200 hover:border-moss-400 hover:text-moon-100"
                  >
                    {p}
                  </button>
                ))}
            </div>
            <button className="btn-lantern px-6 py-3 text-sm" onClick={() => setRevisitOpen(false)}>
              ← Done looking
            </button>
          </>
        ) : !revisitShown ? (
          <>
            <p className="text-sm tracking-[0.3em] text-moss-300 uppercase">Another look</p>
            <div>
              <p className="text-sm text-moss-200">Pass the phone to</p>
              <h2 className="font-display text-4xl font-bold tracking-wider text-moon-100">
                {revisitPlayer}
              </h2>
            </div>
            <p className="max-w-xs text-xs text-moss-300 italic">
              Make sure no one else can see the screen.
            </p>
            <button className="btn-lantern px-6 py-4 text-lg" onClick={() => setRevisitShown(true)}>
              I'm {revisitPlayer} — show my card
            </button>
            <button
              className="text-xs text-moss-300 underline-offset-2 hover:text-moon-200 hover:underline"
              onClick={() => setRevisitPlayer(null)}
            >
              ← Someone else
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-moss-200">
              <span className="text-moon-100">{revisitPlayer}</span>, here is your card
            </p>
            {revisitCard && (
              <GameCard key={`revisit-${revisitPlayer}`} character={revisitCard} initialFlipped />
            )}
            {turnedWolves.includes(revisitPlayer) && (
              <p className="max-w-xs text-xs text-blood-300 italic">
                You keep this card and its powers — but you hunt with the wolves now.
              </p>
            )}
            <button
              className="btn-lantern px-6 py-3.5 text-lg"
              onClick={() => setRevisitPlayer(null)}
            >
              Hide &amp; done
            </button>
          </>
        )}
      </div>
    </div>
  ) : null;

  /** Every overlay that can float above the current screen. */
  const overlays = (
    <>
      {referenceOverlay}
      {menuOverlay}
      {confirmDialog}
      {revisitOverlay}
    </>
  );

  /* ----------------------------- Resolve view ---------------------------- */
  if (res) {
    // Devoted Servant's private reveal comes before the swap is finalised.
    if (devotedReveal) {
      const character = byId(roleOf(devotedReveal.target));
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            {devotedReveal.servant}'s new role
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Hand the phone to <span className="text-moon-100">{devotedReveal.servant}</span> —
            they take over this role from here on. Keep it hidden from the rest of the table.
          </p>
          {character && <GameCard character={character} initialFlipped />}
          <button className="btn-lantern px-6 py-3.5 text-lg" onClick={devotedConfirm}>
            Got it →
          </button>
          {undoRow}
        </div>
      );
    }

    // A servant has been picked from the hub and is choosing whom to act on.
    // Targets stay anonymous (names only) — the reveal happens on the card screen.
    if (servantChoosing) {
      const holder = servantHolder(servantChoosing, res)!;
      const isDevoted = servantChoosing === "devoted-servant";
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            {SERVANT_LABELS[servantChoosing]}
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            <span className="text-moon-100">{holder}</span>{" "}
            {isDevoted
              ? "reveals and takes over the role of one of the condemned, playing on in their place. Whose?"
              : "sacrifices themselves to save one of the condemned, dying in their place. Who is spared?"}
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {servantTargets(res).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setResPick(t)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  resPick === t
                    ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                    : "border-pine-600 text-moss-200 hover:border-moss-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            className="btn-lantern w-full max-w-sm px-4 py-3 text-lg"
            disabled={!resPick}
            onClick={() =>
              resPick &&
              (isDevoted ? doDevotedPick(holder, resPick) : doSelfSacrifice(holder, resPick))
            }
          >
            {resPick
              ? isDevoted
                ? `Take ${resPick}'s role →`
                : `Save ${resPick} →`
              : "Choose a player"}
          </button>
          {undoRow}
        </div>
      );
    }

    const prompt = nextPrompt(res)!;

    if (prompt.kind === "servantHub") {
      const available = availableServants(res);
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            Does a servant want to intervene?
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Before the condemned are revealed, a Servant or Devoted Servant may step forward.
          </p>
          <div className="flex w-full max-w-sm flex-col gap-3">
            {(["servant", "devoted-servant"] as const).map((id) => {
              // Only offer a servant the game was actually dealt.
              if (!players.some((p) => baseRole[p] === id)) return null;
              const canAct = available.includes(id);
              const steppedIn = players.some(
                (p) => baseRole[p] === id && res.usedServants.includes(p),
              );
              return (
                <button
                  key={id}
                  type="button"
                  disabled={!canAct}
                  onClick={() => {
                    pushHistory();
                    setServantChoosing(id);
                    setResPick(null);
                  }}
                  className={`rounded-lg border px-4 py-3 text-left ${
                    canAct
                      ? "border-pine-600 text-moon-100 hover:border-moss-400"
                      : "cursor-not-allowed border-pine-700 text-moss-400 opacity-50"
                  }`}
                >
                  <span className="font-display text-lg">{SERVANT_LABELS[id]}</span>
                  <span className="block text-xs text-moss-300">
                    {canAct
                      ? id === "devoted-servant"
                        ? "Reveal and take over a condemned player's role"
                        : "Sacrifice yourself to save a condemned player"
                      : steppedIn
                        ? "Already stepped in"
                        : "Unavailable"}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            className="btn-lantern w-full max-w-sm px-4 py-3 text-lg"
            onClick={servantsContinue}
          >
            No one intervenes →
          </button>
          {undoRow}
        </div>
      );
    }

    // prompt.kind === "hunter"
    const targets = players.filter(
      (p) => !dead.includes(p) && !res.deaths.includes(p) && p !== prompt.player,
    );
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wider text-blood-500">
          The Hunter falls
        </h1>
        <p className="max-w-sm text-sm text-moss-200">
          <span className="text-moon-100">{prompt.player}</span> was the Hunter — with their dying
          breath they may take one player down. Choose a target, or hold fire.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {targets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setResPick(t)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                resPick === t
                  ? "border-blood-500 bg-blood-700/40 text-moon-100 ring-2 ring-blood-500"
                  : "border-pine-600 text-moss-200 hover:border-moss-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex w-full max-w-sm gap-3">
          <button
            className="btn-lantern flex-1 px-4 py-3"
            onClick={() => hunterShoot(prompt.player, null)}
          >
            Hold fire
          </button>
          <button
            className="btn-lantern flex-[2] px-4 py-3 text-lg"
            disabled={!resPick}
            onClick={() => hunterShoot(prompt.player, resPick)}
          >
            {resPick ? `Take ${resPick} down →` : "Choose a target"}
          </button>
        </div>
        {undoRow}
      </div>
    );
  }

  /* ---------------------------- Wake sequence ---------------------------- */
  if (view === "wake" && wakeQueue.length) {
    const roleId = wakeQueue[0];
    const role = byId(roleId);
    const holders = players.filter((p) => !dead.includes(p) && roleOf(p) === roleId);
    const holderLabel = holders.join(" & ");
    const pickBtn = (t: string) =>
      `rounded-full border px-3 py-1.5 text-sm ${
        wakePick === t
          ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
          : "border-pine-600 text-moss-200 hover:border-moss-400"
      }`;

    // Sleepwalker — visits a living player (not herself, not last night's house).
    if (roleId === "sleepwalker") {
      const targets = players.filter(
        (p) => !dead.includes(p) && !holders.includes(p) && p !== lastVisit,
      );
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Sleepwalker wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. Whose house does she wander
            into tonight? She cannot visit the same house two nights running.
          </p>
          {referenceButtons}
          <div className="flex flex-wrap justify-center gap-2">
            {targets.map((t) => (
              <button key={t} type="button" onClick={() => setWakePick(t)} className={pickBtn(t)}>
                {t}
              </button>
            ))}
          </div>
          <button
            className="btn-lantern w-full max-w-sm px-4 py-3 text-lg"
            disabled={!wakePick}
            onClick={confirmVisit}
          >
            {wakePick ? `Visit ${wakePick} →` : "Choose a house"}
          </button>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Defender — shields one living player (may be self) from the wolves only.
    if (roleId === "defender") {
      const targets = players.filter((p) => !dead.includes(p) && p !== lastProtected);
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Defender wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. Whom do they shield from the
            wolves tonight? Not the same person twice in a row — and they may guard themselves.
          </p>
          {referenceButtons}
          <div className="flex flex-wrap justify-center gap-2">
            {targets.map((t) => (
              <button key={t} type="button" onClick={() => setWakePick(t)} className={pickBtn(t)}>
                {t}
              </button>
            ))}
          </div>
          <button
            className="btn-lantern w-full max-w-sm px-4 py-3 text-lg"
            disabled={!wakePick}
            onClick={confirmDefend}
          >
            {wakePick ? `Shield ${wakePick} →` : "Choose whom to guard"}
          </button>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Gypsy — a spiritualist: she names a player and asks a single yes/no
    // question about them. Their card is shown to the moderator (not the Gypsy)
    // so the answer can be given truthfully with a nod or a shake.
    if (roleId === "gypsy") {
      if (wakeShown && wakePick) {
        const seen = byId(observedRole(wakePick));
        return (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
              {wakePick} is…
            </h1>
            <p className="max-w-sm text-sm text-moss-200">
              For your eyes only — glance at this, then answer the Gypsy's yes/no question with a
              nod or a shake. Don't show her the card.
            </p>
            {seen && <GameCard character={seen} initialFlipped />}
            <button className="btn-lantern px-6 py-3.5 text-lg" onClick={confirmGypsy}>
              Done →
            </button>
            {undoRow}
            {overlays}
          </div>
        );
      }
      const targets = players.filter((p) => !dead.includes(p) && !holders.includes(p));
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Gypsy wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. She points to one player and
            asks a single yes/no question about them — reveal their card to yourself so you can
            answer truthfully.
          </p>
          {referenceButtons}
          <div className="flex flex-wrap justify-center gap-2">
            {targets.map((t) => (
              <button key={t} type="button" onClick={() => setWakePick(t)} className={pickBtn(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex w-full max-w-sm gap-3">
            <button className="btn-lantern flex-1 px-4 py-3" onClick={advanceWake}>
              Skip
            </button>
            <button
              className="btn-lantern flex-[2] px-4 py-3 text-lg"
              disabled={!wakePick}
              onClick={() => setWakeShown(true)}
            >
              {wakePick ? `Reveal ${wakePick}'s card →` : "Choose a player"}
            </button>
          </div>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Fox — points at up to three players; the app reveals whether at least one
    // is a werewolf. A miss (no wolves) spends the power for the rest of the game.
    if (roleId === "fox") {
      if (wakeShown) {
        const anyWolf = wakePicks.some(readsAsWolf);
        return (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
              {anyWolf ? "The scent of wolf" : "No wolves here"}
            </h1>
            <div className="text-5xl">{anyWolf ? "🐺" : "🚫"}</div>
            <p className="max-w-sm text-sm text-moss-200">
              {anyWolf
                ? "At least one of the three is a werewolf. Give the Fox a nod — the nose stays keen for another night."
                : "Not a wolf among them. The Fox's nose fails — shake your head; the power is spent for the rest of the game."}
            </p>
            <button
              className="btn-lantern px-6 py-3.5 text-lg"
              onClick={() => confirmFox(anyWolf)}
            >
              Done →
            </button>
            {undoRow}
            {overlays}
          </div>
        );
      }
      const targets = players.filter((p) => !dead.includes(p));
      const toggleFox = (name: string) =>
        setWakePicks((ps) =>
          ps.includes(name)
            ? ps.filter((x) => x !== name)
            : ps.length < 3
              ? [...ps, name]
              : ps,
        );
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Fox wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. They point at a group of up
            to three neighbours — you'll learn whether at least one is a werewolf.
          </p>
          {referenceButtons}
          <div className="flex flex-wrap justify-center gap-2">
            {targets.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleFox(t)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  wakePicks.includes(t)
                    ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                    : "border-pine-600 text-moss-200 hover:border-moss-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex w-full max-w-sm gap-3">
            <button className="btn-lantern flex-1 px-4 py-3" onClick={advanceWake}>
              Skip
            </button>
            <button
              className="btn-lantern flex-[2] px-4 py-3 text-lg"
              disabled={!wakePicks.length}
              onClick={() => setWakeShown(true)}
            >
              {wakePicks.length ? `Sniff ${wakePicks.length} →` : "Choose up to three"}
            </button>
          </div>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Raven — curses one player, who carries two extra guilty votes into the
    // coming day (badged "+2" on the vote circle).
    if (roleId === "raven") {
      const targets = players.filter((p) => !dead.includes(p) && !holders.includes(p));
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Raven wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. On whose rooftop does the
            black bird settle? They face two extra votes at the coming day's trial.
          </p>
          {referenceButtons}
          <div className="flex flex-wrap justify-center gap-2">
            {targets.map((t) => (
              <button key={t} type="button" onClick={() => setWakePick(t)} className={pickBtn(t)}>
                {t}
              </button>
            ))}
          </div>
          <div className="flex w-full max-w-sm gap-3">
            <button className="btn-lantern flex-1 px-4 py-3" onClick={advanceWake}>
              Skip
            </button>
            <button
              className="btn-lantern flex-[2] px-4 py-3 text-lg"
              disabled={!wakePick}
              onClick={confirmRaven}
            >
              {wakePick ? `Curse ${wakePick} →` : "Choose a player"}
            </button>
          </div>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Two Sisters / Three Brothers — a silent first-night greeting so the
    // siblings can recognise one another. No choice to make; just wake and move on.
    if (roleId === "two-sisters" || roleId === "three-brothers") {
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            {role?.name ?? "The siblings"} wake
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            <span className="text-moon-100">{holderLabel}</span> can wake up to greet each other,
            then return to sleep.
          </p>
          {referenceButtons}
          <button className="btn-lantern px-6 py-3.5 text-lg" onClick={advanceWake}>
            Continue →
          </button>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Actor — turns over one of three fixed cards (the first they flip is
    // tonight's role). Spent positions stay empty so the rest keep their place.
    if (roleId === "actor") {
      const picked = actorPick !== null;
      // A single card position in the 2-over-1 pyramid: spent → empty slot,
      // otherwise a face-down card the Actor can turn over (until one is chosen).
      const actorSlot = (i: number) => {
        const c = byId(actorCards[i]);
        if (!c || (actorUsedIdx.includes(i) && actorPick !== i)) {
          return (
            <div
              className="aspect-[5/9] w-[38vw] max-w-[140px] rounded-2xl border-2 border-dashed border-pine-600/40"
              aria-hidden
            />
          );
        }
        const isPick = actorPick === i;
        return (
          <GameCard
            character={c}
            className="w-[38vw] max-w-[140px]"
            flipped={!isPick}
            onClick={picked ? undefined : () => pickActor(i)}
            disabled={picked && !isPick}
          />
        );
      };
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            {picked ? `${holderLabel} borrows…` : "The Actor wakes"}
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            {picked ? (
              "Tonight the Actor plays this role — show it to them and run its power. Come dawn they are the Actor once more."
            ) : (
              <>
                Wake <span className="text-moon-100">{holderLabel}</span>. They turn over one card —
                the first one they flip is the role they play tonight.
              </>
            )}
          </p>
          {!picked && referenceButtons}
          <div className="flex flex-col items-center gap-3">
            <div className="flex justify-center gap-3">
              {actorSlot(0)}
              {actorSlot(1)}
            </div>
            <div className="flex justify-center">{actorSlot(2)}</div>
          </div>
          {picked && (
            <button className="btn-lantern mt-1 px-6 py-3.5 text-lg" onClick={advanceWake}>
              Done →
            </button>
          )}
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Thief — swap into one of the two middle cards, or keep the Thief
    // (first night only). The board keeps their Thief card.
    if (roleId === "thief") {
      const thief = holders[0];
      const cards = middleCards
        .map((id) => byId(id))
        .filter((c): c is Character => Boolean(c));
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Thief wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{thief}</span>. Two cards lie in the middle — they
            may swap into one, or keep the Thief.
          </p>
          {referenceButtons}
          <div className="flex flex-row items-start justify-center gap-4">
            {cards.map((c, i) => (
              // gap-5 keeps the button clear of the card's bottom edge as it
              // magnifies past its box during the 3D flip.
              <div key={i} className="flex flex-col items-center gap-5">
                <GameCard character={c} initialFlipped className="w-[42vw] max-w-[160px]" />
                <button
                  className="btn-lantern px-4 py-2 text-sm"
                  onClick={() => confirmThief(thief, c.id)}
                >
                  Choose this role →
                </button>
              </div>
            ))}
          </div>
          <button className="btn-lantern px-6 py-3 text-lg" onClick={advanceWake}>
            Keep the Thief →
          </button>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Vile Doppelgänger — copy a player's role (first night only). The board
    // keeps their Doppelgänger card; they play on secretly as the copied role.
    if (roleId === "vile-doppelganger") {
      const doppel = holders[0];
      if (wakeShown && wakePick) {
        const seen = byId(roleOf(wakePick));
        return (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
              {wakePick} is…
            </h1>
            <p className="max-w-sm text-sm text-moss-200">
              <span className="text-moon-100">{doppel}</span> studies this card and takes on the
              role — but stays the Doppelgänger to the village.
            </p>
            {seen && <GameCard character={seen} initialFlipped />}
            <button
              className="btn-lantern px-6 py-3.5 text-lg"
              onClick={() => confirmDoppelganger(doppel, wakePick)}
            >
              Become the {seen?.name} →
            </button>
            {undoRow}
            {overlays}
          </div>
        );
      }
      const targets = players.filter((p) => !dead.includes(p) && !holders.includes(p));
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Vile Doppelgänger wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. Whose role will they steal?
          </p>
          {referenceButtons}
          <div className="flex flex-wrap justify-center gap-2">
            {targets.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setWakePick(t)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  wakePick === t
                    ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                    : "border-pine-600 text-moss-200 hover:border-moss-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex w-full max-w-sm gap-3">
            <button className="btn-lantern flex-1 px-4 py-3" onClick={advanceWake}>
              Skip
            </button>
            <button
              className="btn-lantern flex-[2] px-4 py-3 text-lg"
              disabled={!wakePick}
              onClick={() => setWakeShown(true)}
            >
              {wakePick ? `Reveal ${wakePick}'s card →` : "Choose a player"}
            </button>
          </div>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Cupid — bind two players as lovers (first night only).
    if (roleId === "cupid") {
      const living = players.filter((p) => !dead.includes(p));
      const toggleLover = (name: string) =>
        setWakePicks((ps) =>
          ps.includes(name)
            ? ps.filter((x) => x !== name)
            : ps.length < 2
              ? [...ps, name]
              : ps,
        );
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            Cupid wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. Choose two players to fall
            in love — if one dies, the other dies of heartbreak.
          </p>
          {referenceButtons}
          <div className="flex flex-wrap justify-center gap-2">
            {living.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleLover(t)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  wakePicks.includes(t)
                    ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                    : "border-pine-600 text-moss-200 hover:border-moss-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            className="btn-lantern w-full max-w-sm px-4 py-3 text-lg"
            disabled={wakePicks.length !== 2}
            onClick={confirmCupid}
          >
            {wakePicks.length === 2
              ? `Bind ${wakePicks[0]} & ${wakePicks[1]} →`
              : `Choose two lovers (${wakePicks.length}/2)`}
          </button>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Wild Child — choose a role model whose death turns the child werewolf.
    if (roleId === "wild-child") {
      const targets = players.filter((p) => !dead.includes(p) && !holders.includes(p));
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Wild Child wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. Choose their role model —
            if that player ever dies, the Wild Child joins the wolves.
          </p>
          {referenceButtons}
          <div className="flex flex-wrap justify-center gap-2">
            {targets.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setWakePick(t)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  wakePick === t
                    ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                    : "border-pine-600 text-moss-200 hover:border-moss-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <button
            className="btn-lantern w-full max-w-sm px-4 py-3 text-lg"
            disabled={!wakePick}
            onClick={confirmWildChild}
          >
            {wakePick ? `Set ${wakePick} as role model →` : "Choose a role model"}
          </button>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Seer — the moderator picks a player, then the app shows that player's card.
    if (roleId === "seer") {
      if (wakeShown && wakePick) {
        const seen = byId(observedRole(wakePick));
        return (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
              {wakePick} is…
            </h1>
            <p className="max-w-sm text-sm text-moss-200">
              Show this to the Seer, then hide it and send them back to sleep.
            </p>
            {seen && <GameCard character={seen} initialFlipped />}
            <button className="btn-lantern px-6 py-3.5 text-lg" onClick={confirmSeer}>
              Done →
            </button>
            {undoRow}
            {overlays}
          </div>
        );
      }
      const targets = players.filter((p) => !dead.includes(p) && !holders.includes(p));
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Seer wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. Whose true face do they
            wish to glimpse?
          </p>
          {referenceButtons}
          <div className="flex flex-wrap justify-center gap-2">
            {targets.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setWakePick(t)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  wakePick === t
                    ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                    : "border-pine-600 text-moss-200 hover:border-moss-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex w-full max-w-sm gap-3">
            <button className="btn-lantern flex-1 px-4 py-3" onClick={advanceWake}>
              Skip
            </button>
            <button
              className="btn-lantern flex-[2] px-4 py-3 text-lg"
              disabled={!wakePick}
              onClick={() => setWakeShown(true)}
            >
              {wakePick ? `Reveal ${wakePick}'s card →` : "Choose a player"}
            </button>
          </div>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Pyromaniac — soak up to 2 houses (max 6), or ignite all soaked houses.
    if (roleId === "pyromaniac") {
      const livingSoaked = soaked.filter((p) => !dead.includes(p));
      const remaining = Math.min(2, 6 - soaked.length);
      const soakable = players.filter(
        (p) => !dead.includes(p) && !soaked.includes(p) && !holders.includes(p),
      );
      const toggleSoak = (name: string) =>
        setWakePicks((ps) =>
          ps.includes(name)
            ? ps.filter((x) => x !== name)
            : ps.length < remaining
              ? [...ps, name]
              : ps,
        );
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Pyromaniac wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>.{" "}
            {remaining > 0
              ? `Douse up to ${remaining} more house${remaining === 1 ? "" : "s"} in oil (max 6)`
              : "All six houses are soaked"}
            , or set the soaked houses alight.
          </p>
          {referenceButtons}
          {soaked.length > 0 && (
            <p className="text-xs text-moss-300">Soaked: {livingSoaked.join(", ") || "—"}</p>
          )}
          {remaining > 0 && (
            <div className="flex flex-wrap justify-center gap-2">
              {soakable.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => toggleSoak(t)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    wakePicks.includes(t)
                      ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                      : "border-pine-600 text-moss-200 hover:border-moss-400"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}
          <div className="flex w-full max-w-sm flex-col gap-3">
            <button
              className="btn-lantern px-4 py-3 text-lg"
              disabled={!wakePicks.length}
              onClick={confirmSoak}
            >
              {wakePicks.length
                ? `Soak ${wakePicks.length} house${wakePicks.length === 1 ? "" : "s"} →`
                : "Douse houses in oil"}
            </button>
            {livingSoaked.length > 0 && (
              <button
                className="rounded-lg border border-blood-500 bg-blood-700/30 px-4 py-3 text-lg text-moon-100 hover:bg-blood-700/50"
                onClick={confirmIgnite}
              >
                🔥 Ignite {livingSoaked.length} soaked house{livingSoaked.length === 1 ? "" : "s"} →
              </button>
            )}
            <button className="btn-lantern px-4 py-2" onClick={advanceWake}>
              Do nothing tonight
            </button>
          </div>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Piper — charm up to two players; wins when every living player is charmed.
    if (roleId === "piper") {
      const charmable = players.filter(
        (p) => !dead.includes(p) && !charmed.includes(p) && !holders.includes(p),
      );
      const toggleCharm = (name: string) =>
        setWakePicks((ps) =>
          ps.includes(name)
            ? ps.filter((x) => x !== name)
            : ps.length < 2
              ? [...ps, name]
              : ps,
        );
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Piper wakes
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Wake <span className="text-moon-100">{holderLabel}</span>. Charm up to two players —
            win alone once every living player is under the spell.
          </p>
          {referenceButtons}
          {charmed.length > 0 && (
            <p className="text-xs text-moss-300">
              Charmed: {charmed.filter((p) => !dead.includes(p)).join(", ") || "—"}
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-2">
            {charmable.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => toggleCharm(t)}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  wakePicks.includes(t)
                    ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                    : "border-pine-600 text-moss-200 hover:border-moss-400"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex w-full max-w-sm gap-3">
            <button className="btn-lantern flex-1 px-4 py-3" onClick={advanceWake}>
              Skip
            </button>
            <button
              className="btn-lantern flex-[2] px-4 py-3 text-lg"
              disabled={!wakePicks.length}
              onClick={confirmCharm}
            >
              {wakePicks.length ? `Charm ${wakePicks.length} →` : "Charm players"}
            </button>
          </div>
          {undoRow}
          {overlays}
        </div>
      );
    }

    // Unknown/unhandled role — skip gracefully (shouldn't happen).
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
          {role?.name ?? "A role"} wakes
        </h1>
        <button className="btn-lantern px-6 py-3.5 text-lg" onClick={advanceWake}>
          Continue →
        </button>
        {undoRow}
      </div>
    );
  }

  /* ---------------------------- Hunter's shot ---------------------------- */
  if (view === "hunter") {
    const shooter = pendingHunters[0];
    const targets = players.filter((p) => !dead.includes(p));
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wider text-blood-500">
          The Hunter takes aim
        </h1>
        <p className="mx-auto max-w-sm text-sm text-moss-200">
          Morning finds <span className="text-moon-100">{shooter}</span> dead — the Hunter. With a
          last breath they take one soul down in front of the whole village. Choose a target, or
          hold fire.
        </p>
        {referenceButtons}
        <div className="flex flex-wrap justify-center gap-2">
          {targets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setResPick(t)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                resPick === t
                  ? "border-blood-500 bg-blood-700/40 text-moon-100 ring-2 ring-blood-500"
                  : "border-pine-600 text-moss-200 hover:border-moss-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex w-full max-w-sm gap-3">
          <button className="btn-lantern flex-1 px-4 py-3" onClick={() => morningShot(null)}>
            Hold fire
          </button>
          <button
            className="btn-lantern flex-[2] px-4 py-3 text-lg"
            disabled={!resPick}
            onClick={() => morningShot(resPick)}
          >
            {resPick ? `Take ${resPick} down →` : "Choose a target"}
          </button>
        </div>
        {undoRow}
        {overlays}
      </div>
    );
  }

  /* --------------------- The Accursed Wolf-Father's bite ------------------ */
  if (view === "wolfFather") {
    const victims = pending.filter((p) => teamOf(p) === "village");
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wider text-blood-500">
          The Accursed Wolf-Father stirs
        </h1>
        <p className="max-w-sm text-sm text-moss-200">
          Once per game, rather than let the pack's victim die, he may turn one into a new
          werewolf. They keep their own card and every power that goes with it, but hunt with the
          pack from now on — and the Seer will read them as a Werewolf.
        </p>
        {referenceButtons}
        <div className="flex flex-wrap justify-center gap-2">
          {victims.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setResPick(v)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                resPick === v
                  ? "border-blood-500 bg-blood-700/40 text-moon-100 ring-2 ring-blood-500"
                  : "border-pine-600 text-moss-200 hover:border-moss-400"
              }`}
            >
              {v} · {roleName(v)}
            </button>
          ))}
        </div>
        <p className="max-w-sm text-xs text-moss-400 italic">
          The bite only takes hold at dawn — if the Witch heals them tonight, they live on as
          themselves and this power is wasted.
        </p>
        <div className="flex w-full max-w-sm gap-3">
          <button className="btn-lantern flex-1 px-4 py-3" onClick={() => confirmWolfFather(null)}>
            Let them die
          </button>
          <button
            className="btn-lantern flex-[2] px-4 py-3 text-lg"
            disabled={!resPick}
            onClick={() => confirmWolfFather(resPick)}
          >
            {resPick ? `Turn ${resPick} into a wolf →` : "Choose a victim"}
          </button>
        </div>
        {undoRow}
        {overlays}
      </div>
    );
  }

  /* -------------------- The White Werewolf's betrayal --------------------- */
  if (view === "whiteWolf") {
    const holders = players.filter((p) => !dead.includes(p) && roleOf(p) === "white-werewolf");
    const prey = players.filter((p) => !dead.includes(p) && !holders.includes(p) && readsAsWolf(p));
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
          The White Werewolf wakes
        </h1>
        <p className="max-w-sm text-sm text-moss-200">
          Wake <span className="text-moon-100">{holders.join(" & ")}</span>. Once every two nights
          they may turn on their own — choose a fellow wolf to devour, or spare them tonight.
        </p>
        {referenceButtons}
        <div className="flex flex-wrap justify-center gap-2">
          {prey.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setWakePick(t)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                wakePick === t
                  ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                  : "border-pine-600 text-moss-200 hover:border-moss-400"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <div className="flex w-full max-w-sm gap-3">
          <button
            className="btn-lantern flex-1 px-4 py-3"
            onClick={() => {
              setWakePick(null);
              toWitch(undefined, null);
            }}
          >
            Spare them
          </button>
          <button
            className="btn-lantern flex-[2] px-4 py-3 text-lg"
            disabled={!wakePick}
            onClick={confirmWhiteWolf}
          >
            {wakePick ? `Devour ${wakePick} →` : "Choose a wolf"}
          </button>
        </div>
        {undoRow}
        {overlays}
      </div>
    );
  }

  /* ----------------------------- Witch potions --------------------------- */
  if (view === "witch") {
    const victims = pending;
    const poisonPool = players.filter((p) => !dead.includes(p));
    const canHeal = !witchHealUsed;
    const canPoison = !witchPoisonUsed;
    return (
      <div className="flex flex-col gap-4">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            The Witch wakes
          </h1>
          <p className="mx-auto max-w-sm text-sm text-moss-200">
            Wake the Witch and show her the night's victim. She may spend her healing brew, her
            poison — both, or neither.
          </p>
          <div className="mt-3">{referenceButtons}</div>
        </div>

        {/* Upper half — the healing potion revives a victim of the wolves. */}
        <div className="rounded-lg border border-moss-400/50 bg-night-800/40 p-4">
          <p className="mb-2 text-center text-xs tracking-[0.2em] text-moss-300 uppercase">
            Struck by the wolves
          </p>
          {victims.length ? (
            <div className="flex flex-wrap justify-center gap-2">
              {victims.map((v) => (
                <button
                  key={v}
                  type="button"
                  disabled={!canHeal}
                  onClick={() => setWitchHeal((h) => (h === v ? null : v))}
                  className={`rounded-full border px-3 py-1.5 text-sm disabled:opacity-40 ${
                    witchHeal === v
                      ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                      : "border-pine-600 text-moss-200 hover:border-moss-400"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-center text-sm text-moss-400 italic">
              The wolves took no one tonight.
            </p>
          )}
          <p className="mt-2 text-center text-xs text-moss-400">
            {!canHeal
              ? "Her healing potion is already spent."
              : witchHeal
                ? `She revives ${witchHeal} with the life potion.`
                : "Tap a victim to revive them — the healing potion works only once."}
          </p>
          {wolfFatherTarget && victims.includes(wolfFatherTarget) && (
            <p className="mt-1 text-center text-xs text-blood-300 italic">
              For your eyes only: the Wolf-Father bit {wolfFatherTarget}. Healing them purges the
              bite and wastes his power; leave them and they rise as a werewolf.
            </p>
          )}
        </div>

        {/* Lower half — the poison potion kills anyone she names. */}
        <div className="rounded-lg border border-blood-700/60 bg-night-800/40 p-4">
          <p className="mb-2 text-center text-xs tracking-[0.2em] text-blood-500 uppercase">
            The death potion
          </p>
          {canPoison ? (
            <>
              <div className="flex flex-wrap justify-center gap-2">
                {poisonPool.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setWitchPoison((p) => (p === t ? null : t))}
                    className={`rounded-full border px-3 py-1.5 text-sm ${
                      witchPoison === t
                        ? "border-blood-500 bg-blood-700/40 text-moon-100 ring-2 ring-blood-500"
                        : "border-pine-600 text-moss-200 hover:border-moss-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-center text-xs text-moss-400">
                {witchPoison
                  ? `She poisons ${witchPoison} — they die at dawn.`
                  : "Tap someone to poison, or leave it — the poison works only once."}
              </p>
            </>
          ) : (
            <p className="text-center text-sm text-moss-400 italic">
              Her poison potion is already spent.
            </p>
          )}
        </div>

        <button className="btn-lantern w-full px-4 py-3 text-lg" onClick={confirmWitch}>
          {witchHeal || witchPoison ? "Seal her choices →" : "She stays her hand →"}
        </button>
        {undoRow}
        {overlays}
      </div>
    );
  }

  /* --------------------------- Selection screen -------------------------- */
  if (view === "select") {
    return (
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">{label}</h1>
        {referenceButtons}
        <p className="max-w-sm text-center text-sm text-moss-200">
          {isNight
            ? nightKillCap > 1
              ? `The werewolves stalk the village. Tap tonight's victims — up to ${nightKillCap}.`
              : "The werewolves stalk the village. Tap tonight's victim."
            : "The village gathers and votes. Tap who is sent to the gallows."}
        </p>
        {isNight && nightKillCap > 1 && (
          <p className="-mt-2 max-w-sm text-center text-xs text-blood-300">
            {packEnraged && bigBadActive
              ? "The pack rages for the fallen cub and the Big Bad Wolf still hunts — two extra victims tonight."
              : packEnraged
                ? "The pack avenges the Werewolf Cub — a second victim tonight."
                : "The Big Bad Wolf takes a second victim while the pack is whole."}
          </p>
        )}

        <PlayerCircle
          players={players}
          dead={dead}
          selected={pending}
          soaked={soaked}
          charmed={charmed}
          defended={protectedPlayer ? [protectedPlayer] : []}
          cursed={phase === "day" && ravenCursed ? [ravenCursed] : []}
          onToggle={toggle}
          centerLabel={label}
        />

        <p className="text-sm text-moss-300">
          {pending.length
            ? `${pending.length} marked`
            : isNight
              ? "No one selected — tap the victim, or continue if none died"
              : "No one selected — tap the condemned, or continue with no vote"}
        </p>

        <button className="btn-lantern w-full max-w-sm px-4 py-3 text-lg" onClick={beginKill}>
          {pending.length
            ? isNight
              ? "Record the kill →"
              : "Record the vote →"
            : isNight
              ? "No death — dawn →"
              : "No execution →"}
        </button>
        {undoRow}
        {overlays}
      </div>
    );
  }

  /* -------------------------- Village day/night ------------------------- */
  // A brief atmospheric beat between the aftermath board and the next phase.
  if (view === "transition") {
    const wakingUp = phase === "night"; // the night just ended — dawn breaks
    const flavor = wakingUp
      ? WAKE_TEXTS[round % WAKE_TEXTS.length]
      : SLEEP_TEXTS[(round + 1) % SLEEP_TEXTS.length];
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-12 text-center">
        <p className="font-display text-xs tracking-[0.4em] text-moss-300 uppercase">
          {wakingUp ? `Dawn · day ${round}` : `Dusk · night ${round + 1}`}
        </p>
        <h1 className="font-display text-3xl font-bold tracking-wider text-moon-100">
          {wakingUp ? "The village wakes up" : "The village goes to sleep"}
        </h1>
        <p className="max-w-sm text-sm text-moss-200">{flavor}</p>
        <button className="btn-lantern px-6 py-3.5 text-lg" onClick={leaveTransition}>
          {wakingUp ? "Continue to day →" : "Continue to the night →"}
        </button>
        {undoRow}
      </div>
    );
  }

  /* --------------------------- Aftermath board --------------------------- */
  const recap = lastDeaths.length
    ? lastDeaths.map((p) => `${p} — the ${roleName(p)}`).join(", ")
    : null;

  // Join names as "A", "A and B", or "A, B and C" for the scroll's prose.
  const listNames = (names: string[]) =>
    names.length <= 1
      ? names.join("")
      : `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;

  // The dawn omens — public signs the whole village witnesses, so they appear both
  // as banners on the board and as lines in the scroll.
  const growl = isNight && bearGrowls();
  const crows = isNight && players.some((p) => roleOf(p) === "rooster" && !dead.includes(p));
  const bearOmen = "The bear growled — a werewolf sits beside the Bear Tamer.";
  const roosterOmen = wolfSorcery
    ? "The rooster crows — a wolf's dark power stirred in the night."
    : wolfKillCount > 1
      ? "The rooster crows — the pack hunted more than once tonight."
      : wolfKillCount >= 1
        ? "The rooster crows — the werewolves hunted in the night."
        : "The rooster crows — the wolves did not strike last night.";

  // Everything the app knows happened this phase, for the scroll. Order retells the
  // night as it played out: what each waking role did, the wolves' attack, who fell
  // (with their role), the mechanical footnotes, then the omens the village wakes to.
  const scrollLines: string[] = [];
  if (isNight) {
    for (const p of seerViews) {
      scrollLines.push(`The Seer read ${p}'s fate — the ${observedName(p)}.`);
    }
    for (const l of nightLog) scrollLines.push(l);
    scrollLines.push(
      lastAttacked.length
        ? `The werewolves set upon ${listNames(lastAttacked)}.`
        : "The werewolves prowled but marked no victim.",
    );
  } else if (lastAttacked.length) {
    scrollLines.push(`The village condemned ${listNames(lastAttacked)}.`);
  }
  if (lastDeaths.length) {
    for (const p of lastDeaths) scrollLines.push(`${p} fell — the ${roleName(p)}.`);
  } else {
    scrollLines.push(
      isNight ? "When dawn broke, everyone still drew breath." : "No one was sent to the gallows.",
    );
  }
  for (const n of lastNotes) scrollLines.push(n);
  if (growl) scrollLines.push(bearOmen);
  if (crows) scrollLines.push(roosterOmen);

  // From the aftermath board, step through the "village wakes / sleeps" screen
  // before the next phase actually begins.
  const advance = () => {
    pushHistory();
    setScrollOpen(false);
    setAnnounced([]);
    setView("transition");
  };

  // A Hunter slain in the night still owes a morning shot: hold the board (and
  // any premature win) until they fire, since their shot can change the outcome.
  const pendingShot = isNight && pendingHunters.length > 0;
  const shownResult = pendingShot ? null : result;


  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
          {isNight ? `Night ${round} · dawn` : `Day ${round} · dusk`}
        </h1>
        <p className="mt-1 text-sm text-moss-200">
          {recap
            ? isNight
              ? `${recap} did not survive the night.`
              : `The village executed ${recap}.`
            : isNight
              ? "Dawn breaks — everyone survived the night."
              : "The village spares everyone today."}
        </p>
        <NightScroll
          open={scrollOpen}
          onToggle={() => setScrollOpen((o) => !o)}
          lines={scrollLines}
          isNight={isNight}
          announced={announced}
          onToggleLine={(i) =>
            setAnnounced((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]))
          }
        />
        <div className="mt-3">{referenceButtons}</div>
      </div>

      {growl && (
        <div className="rounded-lg border border-bark-400 bg-bark-500/15 px-4 py-3 text-center">
          <p className="font-display text-sm tracking-wide text-bark-200">🐻 {bearOmen}</p>
        </div>
      )}

      {crows && (
        <div className="rounded-lg border border-moon-400/40 bg-night-800/50 px-4 py-3 text-center">
          <p className="font-display text-sm tracking-wide text-moon-200">🐓 {roosterOmen}</p>
        </div>
      )}

      <NoticeBoard items={boardItems} />

      {shownResult ? (
        <div
          className="rounded-lg border p-4 text-center"
          style={{
            borderColor:
              result === "village" ? "#557a5c" : result === "werewolf" ? "#93392f" : "#8a6d3b",
            background: "rgba(10,18,12,0.6)",
          }}
        >
          <p className="font-display text-xl font-bold tracking-wider text-moon-100">
            {result === "village"
              ? "The village survives"
              : result === "werewolf"
                ? "The werewolves win"
                : result === "pyromaniac"
                  ? "The Pyromaniac wins"
                  : result === "white-werewolf"
                    ? "The White Werewolf wins"
                    : result === "angel"
                      ? "The Angel wins"
                      : "The Piper wins"}
          </p>
          <p className="mt-1 text-sm text-moss-200">
            {result === "village"
              ? "Every werewolf has been eliminated."
              : result === "werewolf"
                ? "The wolves now equal or outnumber the village."
                : result === "pyromaniac"
                  ? "Only the arsonist is left amid the ashes."
                  : result === "white-werewolf"
                    ? "The lone white wolf has outlasted every other soul."
                    : result === "angel"
                      ? "Martyred on the first day — the Angel got their wish."
                      : "Every soul left alive dances to the Piper's tune."}
          </p>
        </div>
      ) : null}

      {judgeAvailable && !result && !pendingShot && (
        <button
          className="btn-lantern w-full px-4 py-2.5 text-sm"
          onClick={secondVote}
        >
          ⚖ Stuttering Judge: call a second vote →
        </button>
      )}

      {shownResult ? (
        // The game is over, so nothing is left to lose — these run without asking.
        <div className="flex flex-col gap-2">
          {restartOptions.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={o.run}
              className="rounded-lg border border-pine-600 bg-night-800/40 p-3 text-left transition-colors hover:border-moss-400"
            >
              <p className="font-display text-sm text-moon-100">{o.label}</p>
              <p className="mt-0.5 text-[0.7rem] text-moss-300">{o.desc}</p>
            </button>
          ))}
          <button className="btn-lantern mt-1 px-4 py-3" onClick={onMainMenu}>
            Quit to the main menu
          </button>
        </div>
      ) : (
        <button className="btn-lantern w-full px-4 py-3 text-lg" onClick={advance}>
          Continue →
        </button>
      )}
      {undoRow}
      {overlays}
    </div>
  );
}
