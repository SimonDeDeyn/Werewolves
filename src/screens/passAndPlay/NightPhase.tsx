import { useMemo, useState } from "react";
import { byId } from "../../data/characters";
import type { Assignment } from "../../game/setup";
import PlayerCircle from "./PlayerCircle";
import NoticeBoard, { type BoardItem } from "./NoticeBoard";

type Phase = "night" | "day";
type View = "select" | "board";

/**
 * Moderator-run game loop. The human narrator runs each phase out loud; the app
 * tracks eliminations. Nights (the werewolves' kill) and days (the village
 * vote) alternate, each with a selection screen and an aftermath notice board
 * where the fallen are crossed out and their roles revealed.
 */
export default function NightPhase({
  assignments,
  board,
  onExit,
}: {
  assignments: Assignment[];
  board: Assignment[];
  onExit: () => void;
}) {
  const players = useMemo(() => assignments.map((a) => a.player), [assignments]);
  const roleOf = useMemo(
    () => Object.fromEntries(assignments.map((a) => [a.player, a.characterId])),
    [assignments],
  );

  const [phase, setPhase] = useState<Phase>("night");
  const [round, setRound] = useState(1);
  const [view, setView] = useState<View>("select");
  const [dead, setDead] = useState<string[]>([]);
  const [pending, setPending] = useState<string[]>([]);
  const [lastDeaths, setLastDeaths] = useState<string[]>([]);

  const teamOf = (player: string) => byId(roleOf[player])?.team;
  const alive = players.filter((p) => !dead.includes(p));
  const wolvesAlive = alive.filter((p) => teamOf(p) === "werewolf").length;
  const result: "village" | "werewolf" | null =
    wolvesAlive === 0 ? "village" : wolvesAlive * 2 >= alive.length ? "werewolf" : null;

  const boardItems: BoardItem[] = board.map((a) => ({
    characterId: a.characterId,
    hidden: a.random && !dead.includes(a.player),
    dead: dead.includes(a.player),
  }));

  const toggle = (name: string) =>
    setPending((p) => (p.includes(name) ? p.filter((x) => x !== name) : [...p, name]));

  const record = () => {
    setDead((d) => [...d, ...pending]);
    setLastDeaths(pending);
    setPending([]);
    setView("board");
  };

  const advance = () => {
    if (phase === "night") {
      setPhase("day");
    } else {
      setPhase("night");
      setRound((r) => r + 1);
    }
    setView("select");
  };

  const isNight = phase === "night";
  const label = `${isNight ? "Night" : "Day"} ${round}`;

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
    ? lastDeaths.map((p) => `${p} — the ${byId(roleOf[p])?.name}`).join(", ")
    : null;

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
        <button className="btn-lantern flex-1 px-4 py-3" onClick={onExit}>
          {result ? "Done" : "Quit"}
        </button>
        {!result && (
          <button className="btn-lantern flex-[2] px-4 py-3 text-lg" onClick={advance}>
            {isNight ? "Continue to day →" : `Begin night ${round + 1} →`}
          </button>
        )}
      </div>
    </div>
  );
}
