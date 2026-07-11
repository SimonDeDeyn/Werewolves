import { useMemo, useState } from "react";
import { byId, NIGHT_SEQUENCE, type Character } from "../../data/characters";
import type { Assignment } from "../../game/setup";
import CharacterPortrait from "../../components/CharacterPortrait";
import PlayerCircle from "./PlayerCircle";
import NoticeBoard, { type BoardItem } from "./NoticeBoard";
import GameCard from "../../components/GameCard";

type Phase = "night" | "day";
type View = "wake" | "select" | "board";

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
  "defender",
  "wild-child",
  "pyromaniac",
  "piper",
]);

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
  wolfFatherDone: boolean; // the Accursed Wolf-Father's convert prompt is resolved
  notes: string[]; // moderator-facing footnotes about spares, survivals, etc.
}

type ServantRole = "servant" | "devoted-servant";

const SERVANT_LABELS: Record<ServantRole, string> = {
  servant: "Servant",
  "devoted-servant": "Devoted Servant",
};

/** A full capture of the mutable game state, so any screen can be restored. */
interface Snapshot {
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
  actorUsedIdx: number[];
  actorPick: number | null;
  wolfFatherUsed: boolean;
  pending: string[];
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
  onExit,
  onPlayAgain,
}: {
  assignments: Assignment[];
  board: Assignment[];
  middleCards?: string[];
  actorCards?: string[];
  onExit: () => void;
  onPlayAgain: () => void;
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
  // Actor: which of the three fixed card positions are spent, and tonight's pick.
  // Positions stay put across nights (0/1 top row, 2 bottom-centre) so spent
  // cards leave a gap and the survivors keep their placement.
  const [actorUsedIdx, setActorUsedIdx] = useState<number[]>([]);
  const [actorPick, setActorPick] = useState<number | null>(null);
  // Accursed Wolf-Father's one-time villager-to-wolf conversion.
  const [wolfFatherUsed, setWolfFatherUsed] = useState(false);
  const [pending, setPending] = useState<string[]>([]);
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
    actorUsedIdx,
    actorPick,
    wolfFatherUsed,
    pending,
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
  });
  const pushHistory = () => setHistory((h) => [...h, snapshot()]);
  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
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
    setActorUsedIdx(prev.actorUsedIdx);
    setActorPick(prev.actorPick);
    setWolfFatherUsed(prev.wolfFatherUsed);
    setPending(prev.pending);
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
    setHistory((h) => h.slice(0, -1));
  };
  const canUndo = history.length > 0;

  const roleOf = (p: string) => roleOverride[p] ?? baseRole[p];
  const roleName = (p: string) => byId(roleOf(p))?.name ?? "?";
  // A Wild Child who turned counts as a werewolf even though their card is unchanged.
  const teamOf = (p: string) =>
    turnedWolves.includes(p) ? "werewolf" : byId(roleOf(p))?.team;

  const alive = players.filter((p) => !dead.includes(p));
  const wolvesAlive = alive.filter((p) => teamOf(p) === "werewolf").length;
  const result: "village" | "werewolf" | "pyromaniac" | "piper" | null = (() => {
    const pyros = alive.filter((p) => roleOf(p) === "pyromaniac");
    const pipers = alive.filter((p) => roleOf(p) === "piper");
    // Piper wins the moment every other living player is charmed.
    if (pipers.length) {
      const others = alive.filter((p) => !pipers.includes(p));
      if (others.length > 0 && others.every((p) => charmed.includes(p))) return "piper";
    }
    // Pyromaniac wins as the last soul standing.
    if (pyros.length && alive.every((p) => roleOf(p) === "pyromaniac")) return "pyromaniac";
    if (wolvesAlive > 0 && wolvesAlive * 2 >= alive.length) return "werewolf";
    // The village prevails only once no wolves and no solo threats remain.
    if (wolvesAlive === 0 && !pyros.length && !pipers.length) return "village";
    return null;
  })();

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

  type Prompt =
    | { kind: "servantHub" }
    | { kind: "hunter"; player: string }
    | { kind: "wolfFather" };

  /** The living, not-dying holder of the Accursed Wolf-Father, if any. */
  const wolfFatherHolder = (r: Resolution) =>
    players.find(
      (p) => roleOf(p) === "accursed-wolf-father" && !dead.includes(p) && !r.deaths.includes(p),
    ) ?? null;

  const nextPrompt = (r: Resolution): Prompt | null => {
    // Accursed Wolf-Father (a wolf power, so unaffected by the Elder's death)
    // may convert a villager the wolves slew into a new wolf, before anything else.
    if (
      r.phase === "night" &&
      !r.wolfFatherDone &&
      !wolfFatherUsed &&
      wolfFatherHolder(r) &&
      r.deaths.some((p) => teamOf(p) === "village")
    ) {
      return { kind: "wolfFather" };
    }
    // Once the Elder falls to the village, every villager power is gone.
    if (powersDisabled) return null;
    // Servants only step in after a village vote, before the condemned are revealed.
    if (r.phase === "day" && !r.servantsDone && availableServants(r).length) {
      return { kind: "servantHub" };
    }
    // A claimed player's death-power is absorbed by the Devoted Servant who took it.
    const hunter = r.deaths.find(
      (p) => roleOf(p) === "hunter" && !r.huntersFired.includes(p) && !r.claimed.includes(p),
    );
    if (hunter) return { kind: "hunter", player: hunter };
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

  const record = () => {
    pushHistory();
    const raw = pending;
    setPending([]);

    const notes: string[] = [];
    let deaths = [...raw];

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

    step({
      phase,
      deaths,
      // Only a village vote gives the servants something to intervene on.
      eliminated: phase === "day" ? deaths : [],
      claimed: [],
      usedServants: [],
      huntersFired: [],
      servantsDone: false,
      wolfFatherDone: false,
      notes,
    });
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

  /** Accursed Wolf-Father: convert a slain villager into a wolf, or let them die. */
  const wolfFatherConvert = (victim: string | null) => {
    if (!res) return;
    pushHistory();
    if (victim) {
      setTurnedWolves((w) => [...w, victim]);
      setWolfFatherUsed(true);
      step({
        ...res,
        deaths: res.deaths.filter((p) => p !== victim),
        wolfFatherDone: true,
        notes: [
          ...res.notes,
          `The Accursed Wolf-Father's bite turns ${victim} into a new werewolf.`,
        ],
      });
    } else {
      step({ ...res, wolfFatherDone: true });
    }
  };

  const toggle = (name: string) =>
    setPending((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  /* --------------------------- Night wake-up ----------------------------- */

  /** Implemented waking roles with a living holder, in order, for a given night. */
  const wakeRolesFor = (rnd: number): string[] =>
    NIGHT_SEQUENCE.filter(
      (c) =>
        IMPLEMENTED_WAKE.has(c.id) &&
        (!c.firstNightOnly || rnd === 1) &&
        // The Actor borrows a role only for its first three nights.
        !(c.id === "actor" && actorUsedIdx.length >= 3) &&
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

  /** Cupid binds the two chosen players, then the sequence moves on. */
  const confirmCupid = () => {
    setLovers([...wakePicks]);
    advanceWake();
  };

  /** Wild Child locks in their role model, then the sequence moves on. */
  const confirmWildChild = () => {
    if (wakePick) setRoleModel(wakePick);
    advanceWake();
  };

  /** Vile Doppelgänger secretly copies a player's role, then moves on. */
  const confirmDoppelganger = (doppel: string, target: string) => {
    setRoleOverride((o) => ({ ...o, [doppel]: roleOf(target) }));
    advanceWake();
  };

  /** Thief swaps their card for one of the two middle cards, then moves on. */
  const confirmThief = (thief: string, cardId: string) => {
    setRoleOverride((o) => ({ ...o, [thief]: cardId }));
    advanceWake();
  };

  /** Pyromaniac douses the picked houses in oil, then moves on. */
  const confirmSoak = () => {
    setSoaked((s) => [...s, ...wakePicks]);
    advanceWake();
  };

  /** Pyromaniac ignites — every living soaked house burns in this night's toll. */
  const confirmIgnite = () => {
    setPendingBurn(soaked.filter((p) => !dead.includes(p)));
    advanceWake();
  };

  /** Piper charms the picked players, then moves on. */
  const confirmCharm = () => {
    setCharmed((c) => [...c, ...wakePicks]);
    advanceWake();
  };

  /** Defender shields their chosen charge for the night, then moves on. */
  const confirmDefend = () => {
    if (wakePick) setProtectedPlayer(wakePick);
    advanceWake();
  };

  /** Sleepwalker locks in tonight's visit, then moves on. */
  const confirmVisit = () => {
    if (wakePick) setSleepwalkerVisit(wakePick);
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
                  return (
                    <li
                      key={c.id}
                      className={`relative flex items-center gap-3 rounded-lg border border-pine-600 bg-night-800/40 px-3 py-2 ${
                        allDead ? "opacity-60" : ""
                      }`}
                    >
                      <CharacterPortrait
                        character={c}
                        className={`h-9 w-9 shrink-0 ${allDead ? "grayscale" : ""}`}
                      />
                      <div className="min-w-0 flex-1">
                        <p
                          className={`truncate font-display text-sm ${
                            allDead ? "text-moss-400 line-through" : "text-moon-100"
                          }`}
                        >
                          {c.name}
                        </p>
                        {c.firstNightOnly && (
                          <p className="text-[0.6rem] tracking-widest text-moss-300 uppercase">
                            First night only
                          </p>
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

    if (prompt.kind === "wolfFather") {
      const victims = res.deaths.filter((p) => teamOf(p) === "village");
      return (
        <div className="flex flex-col items-center gap-4 py-2 text-center">
          <h1 className="font-display text-2xl font-bold tracking-wider text-blood-500">
            The Accursed Wolf-Father stirs
          </h1>
          <p className="max-w-sm text-sm text-moss-200">
            Once per game, instead of letting a villager the wolves slew die, the Wolf-Father may
            turn one into a new werewolf. Choose whom, or let the kill stand.
          </p>
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
          <div className="flex w-full max-w-sm gap-3">
            <button className="btn-lantern flex-1 px-4 py-3" onClick={() => wolfFatherConvert(null)}>
              Let them die
            </button>
            <button
              className="btn-lantern flex-[2] px-4 py-3 text-lg"
              disabled={!resPick}
              onClick={() => wolfFatherConvert(resPick)}
            >
              {resPick ? `Turn ${resPick} into a wolf →` : "Choose a victim"}
            </button>
          </div>
          {undoRow}
        </div>
      );
    }

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
          {referenceOverlay}
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
          {referenceOverlay}
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
          {referenceOverlay}
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
          {referenceOverlay}
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
            {referenceOverlay}
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
          {referenceOverlay}
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
          {referenceOverlay}
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
          {referenceOverlay}
        </div>
      );
    }

    // Seer — the moderator picks a player, then the app shows that player's card.
    if (roleId === "seer") {
      if (wakeShown && wakePick) {
        const seen = byId(roleOf(wakePick));
        return (
          <div className="flex flex-col items-center gap-4 py-2 text-center">
            <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
              {wakePick} is…
            </h1>
            <p className="max-w-sm text-sm text-moss-200">
              Show this to the Seer, then hide it and send them back to sleep.
            </p>
            {seen && <GameCard character={seen} initialFlipped />}
            <button className="btn-lantern px-6 py-3.5 text-lg" onClick={advanceWake}>
              Done →
            </button>
            {undoRow}
            {referenceOverlay}
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
          {referenceOverlay}
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
          {referenceOverlay}
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
          {referenceOverlay}
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

  /* --------------------------- Selection screen -------------------------- */
  if (view === "select") {
    return (
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">{label}</h1>
        {referenceButtons}
        <p className="max-w-sm text-center text-sm text-moss-200">
          {isNight
            ? "The werewolves stalk the village. Tap tonight's victim."
            : "The village gathers and votes. Tap who is sent to the gallows."}
        </p>

        <PlayerCircle
          players={players}
          dead={dead}
          selected={pending}
          soaked={soaked}
          charmed={charmed}
          defended={protectedPlayer ? [protectedPlayer] : []}
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

        <div className="flex w-full max-w-sm gap-3">
          <button className="btn-lantern flex-1 px-4 py-3" onClick={onExit}>
            Quit
          </button>
          <button className="btn-lantern flex-[2] px-4 py-3 text-lg" onClick={record}>
            {pending.length
              ? isNight
                ? "Record the kill →"
                : "Record the vote →"
              : isNight
                ? "No death — dawn →"
                : "No execution →"}
          </button>
        </div>
        {undoRow}
        {referenceOverlay}
      </div>
    );
  }

  /* --------------------------- Aftermath board --------------------------- */
  const recap = lastDeaths.length
    ? lastDeaths.map((p) => `${p} — the ${roleName(p)}`).join(", ")
    : null;

  const advance = () => {
    pushHistory();
    if (phase === "night") {
      setPhase("day");
      setView("select");
      // The night's protection / visit lapse; remember them so they can't repeat.
      setLastProtected(protectedPlayer);
      setProtectedPlayer(null);
      setLastVisit(sleepwalkerVisit);
      setSleepwalkerVisit(null);
      setActorPick(null);
    } else {
      const nextRound = round + 1;
      setPhase("night");
      setRound(nextRound);
      const q = wakeRolesFor(nextRound);
      setWakeQueue(q);
      setView(q.length ? "wake" : "select");
    }
  };

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
        {lastNotes.length > 0 && (
          <div className="mx-auto mt-2 max-w-sm space-y-1">
            {lastNotes.map((n, i) => (
              <p key={i} className="text-xs text-moss-300 italic">
                {n}
              </p>
            ))}
          </div>
        )}
        <div className="mt-3">{referenceButtons}</div>
      </div>

      <NoticeBoard items={boardItems} />

      {result ? (
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
                  : "The Piper wins"}
          </p>
          <p className="mt-1 text-sm text-moss-200">
            {result === "village"
              ? "Every werewolf has been eliminated."
              : result === "werewolf"
                ? "The wolves now equal or outnumber the village."
                : result === "pyromaniac"
                  ? "Only the arsonist is left amid the ashes."
                  : "Every soul left alive dances to the Piper's tune."}
          </p>
        </div>
      ) : null}

      {judgeAvailable && !result && (
        <button
          className="btn-lantern w-full px-4 py-2.5 text-sm"
          onClick={secondVote}
        >
          ⚖ Stuttering Judge: call a second vote →
        </button>
      )}

      <div className="flex gap-3">
        {result ? (
          <>
            <button className="btn-lantern flex-1 px-4 py-3" onClick={onExit}>
              Main menu
            </button>
            <button className="btn-lantern flex-[2] px-4 py-3 text-lg" onClick={onPlayAgain}>
              Play again →
            </button>
          </>
        ) : (
          <>
            <button className="btn-lantern flex-1 px-4 py-3" onClick={onExit}>
              Quit
            </button>
            <button className="btn-lantern flex-[2] px-4 py-3 text-lg" onClick={advance}>
              {isNight ? "Continue to day →" : `Begin night ${round + 1} →`}
            </button>
          </>
        )}
      </div>
      {undoRow}
      {referenceOverlay}
    </div>
  );
}
