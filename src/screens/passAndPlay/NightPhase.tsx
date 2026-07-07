import { useMemo, useState } from "react";
import { byId } from "../../data/characters";
import type { Assignment } from "../../game/setup";
import PlayerCircle from "./PlayerCircle";
import NoticeBoard, { type BoardItem } from "./NoticeBoard";

type Phase = "night" | "day";
type View = "select" | "board";

/** Roles whose whole card is taken over when the Servant steps in. */
const SERVANT_ROLES = ["servant", "devoted-servant"];

/** In-progress elimination resolution (Hunter shots, Servant swap). */
interface Resolution {
  deaths: string[]; // players dying this phase (grows as Hunters fire)
  hunters: string[]; // Hunters still owed a shot (FIFO)
  servantDone: boolean;
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
  onExit,
  onPlayAgain,
}: {
  assignments: Assignment[];
  board: Assignment[];
  onExit: () => void;
  onPlayAgain: () => void;
}) {
  const players = useMemo(() => assignments.map((a) => a.player), [assignments]);
  const baseRole = useMemo(
    () => Object.fromEntries(assignments.map((a) => [a.player, a.characterId])),
    [assignments],
  );

  const [dead, setDead] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<Phase>("night");
  const [view, setView] = useState<View>("select");
  const [pending, setPending] = useState<string[]>([]);
  const [lastDeaths, setLastDeaths] = useState<string[]>([]);

  // Servant swaps re-point a player to a different role; track spent swaps.
  const [roleOverride, setRoleOverride] = useState<Record<string, string>>({});
  const [servantUsed, setServantUsed] = useState<string[]>([]);

  const [res, setRes] = useState<Resolution | null>(null);
  const [resPick, setResPick] = useState<string | null>(null);

  const roleOf = (p: string) => roleOverride[p] ?? baseRole[p];
  const roleName = (p: string) => byId(roleOf(p))?.name ?? "?";

  const alive = players.filter((p) => !dead.includes(p));
  const wolvesAlive = alive.filter((p) => byId(roleOf(p))?.team === "werewolf").length;
  const result: "village" | "werewolf" | null =
    wolvesAlive === 0 ? "village" : wolvesAlive * 2 >= alive.length ? "werewolf" : null;

  const boardItems: BoardItem[] = board.map((a) => {
    const overridden = roleOverride[a.player] !== undefined;
    const isDead = dead.includes(a.player);
    return {
      characterId: roleOf(a.player),
      hidden: a.random && !overridden && !isDead,
      dead: isDead,
    };
  });

  /* ------------------------ Elimination resolution ----------------------- */

  const findLivingServant = (deaths: string[]) =>
    players.find(
      (p) =>
        !dead.includes(p) &&
        !deaths.includes(p) &&
        !servantUsed.includes(p) &&
        SERVANT_ROLES.includes(roleOf(p)),
    ) ?? null;

  type Prompt = { kind: "hunter"; player: string } | { kind: "servant"; servant: string };

  const nextPrompt = (r: Resolution): Prompt | null => {
    if (r.hunters.length) return { kind: "hunter", player: r.hunters[0] };
    if (!r.servantDone && r.deaths.length) {
      const s = findLivingServant(r.deaths);
      if (s) return { kind: "servant", servant: s };
    }
    return null;
  };

  const commit = (deaths: string[]) => {
    setDead((d) => [...d, ...deaths]);
    setLastDeaths(deaths);
    setRes(null);
    setResPick(null);
    setView("board");
  };

  const step = (r: Resolution) => {
    if (nextPrompt(r)) {
      setRes(r);
      setResPick(null);
    } else {
      commit(r.deaths);
    }
  };

  const record = () => {
    const deaths = pending;
    const hunters = deaths.filter((p) => roleOf(p) === "hunter");
    setPending([]);
    step({ deaths, hunters, servantDone: false });
  };

  const hunterShoot = (target: string | null) => {
    if (!res) return;
    let { deaths } = res;
    let hunters = res.hunters.slice(1);
    if (target) {
      deaths = [...deaths, target];
      if (roleOf(target) === "hunter" && !hunters.includes(target)) hunters = [...hunters, target];
    }
    step({ ...res, deaths, hunters });
  };

  const servantSwap = (dyingPlayer: string | null, servant: string) => {
    if (!res) return;
    if (dyingPlayer) {
      setRoleOverride((o) => ({ ...o, [servant]: roleOf(dyingPlayer) }));
      setServantUsed((u) => [...u, servant]);
    }
    step({ ...res, servantDone: true });
  };

  const toggle = (name: string) =>
    setPending((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const isNight = phase === "night";
  const label = `${isNight ? "Night" : "Day"} ${round}`;

  /* ----------------------------- Resolve view ---------------------------- */
  if (res) {
    const prompt = nextPrompt(res)!;

    if (prompt.kind === "hunter") {
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
            <button className="btn-lantern flex-1 px-4 py-3" onClick={() => hunterShoot(null)}>
              Hold fire
            </button>
            <button
              className="btn-lantern flex-[2] px-4 py-3 text-lg"
              disabled={!resPick}
              onClick={() => hunterShoot(resPick)}
            >
              {resPick ? `Take ${resPick} down →` : "Choose a target"}
            </button>
          </div>
        </div>
      );
    }

    // Servant swap
    return (
      <div className="flex flex-col items-center gap-4 py-2 text-center">
        <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
          The Servant steps in?
        </h1>
        <p className="max-w-sm text-sm text-moss-200">
          <span className="text-moon-100">{prompt.servant}</span> may reveal and take over a role
          from the fallen, playing on as that character. Choose whose, or stay hidden.
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {res.deaths.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setResPick(d)}
              className={`rounded-full border px-3 py-1.5 text-sm ${
                resPick === d
                  ? "border-moon-200 bg-pine-500 text-moon-100 ring-2 ring-moss-400"
                  : "border-pine-600 text-moss-200 hover:border-moss-400"
              }`}
            >
              {d} · {roleName(d)}
            </button>
          ))}
        </div>
        <div className="flex w-full max-w-sm gap-3">
          <button
            className="btn-lantern flex-1 px-4 py-3"
            onClick={() => servantSwap(null, prompt.servant)}
          >
            Stay hidden
          </button>
          <button
            className="btn-lantern flex-[2] px-4 py-3 text-lg"
            disabled={!resPick}
            onClick={() => servantSwap(resPick, prompt.servant)}
          >
            {resPick ? `Take ${roleName(resPick)} →` : "Choose a role"}
          </button>
        </div>
      </div>
    );
  }

  /* --------------------------- Selection screen -------------------------- */
  if (view === "select") {
    return (
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">{label}</h1>
        <p className="max-w-sm text-center text-sm text-moss-200">
          {isNight
            ? "The werewolves stalk the village. Tap tonight's victim."
            : "The village gathers and votes. Tap who is sent to the gallows."}
        </p>

        <PlayerCircle
          players={players}
          dead={dead}
          selected={pending}
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
      </div>
    );
  }

  /* --------------------------- Aftermath board --------------------------- */
  const recap = lastDeaths.length
    ? lastDeaths.map((p) => `${p} — the ${roleName(p)}`).join(", ")
    : null;

  const advance = () => {
    if (phase === "night") {
      setPhase("day");
    } else {
      setPhase("night");
      setRound((r) => r + 1);
    }
    setView("select");
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
      </div>

      <NoticeBoard items={boardItems} />

      {result ? (
        <div
          className="rounded-lg border p-4 text-center"
          style={{
            borderColor: result === "village" ? "#557a5c" : "#93392f",
            background: "rgba(10,18,12,0.6)",
          }}
        >
          <p className="font-display text-xl font-bold tracking-wider text-moon-100">
            {result === "village" ? "The village survives" : "The werewolves win"}
          </p>
          <p className="mt-1 text-sm text-moss-200">
            {result === "village"
              ? "Every werewolf has been eliminated."
              : "The wolves now equal or outnumber the village."}
          </p>
        </div>
      ) : null}

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
    </div>
  );
}
