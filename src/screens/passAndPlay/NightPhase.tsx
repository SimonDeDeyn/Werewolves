import { useMemo, useState } from "react";
import { byId } from "../../data/characters";
import type { Assignment } from "../../game/setup";
import PlayerCircle from "./PlayerCircle";
import NoticeBoard, { type BoardItem } from "./NoticeBoard";

/**
 * Moderator-run night phase. The human narrator runs the night out loud; the
 * app is a tracker: mark who was eliminated each night, then view the notice
 * board with the fallen crossed out (and their roles revealed).
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

  const [dead, setDead] = useState<string[]>([]);
  const [round, setRound] = useState(1);
  const [view, setView] = useState<"round" | "board">("round");
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

  /* ------------------------------ Round view ----------------------------- */
  if (view === "round") {
    return (
      <div className="flex flex-col items-center gap-4">
        <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
          Night {round}
        </h1>
        <p className="max-w-sm text-center text-sm text-moss-200">
          Run the night out loud, then tap anyone who was eliminated.
        </p>

        <PlayerCircle
          players={players}
          dead={dead}
          selected={pending}
          onToggle={toggle}
          centerLabel={`Night ${round}`}
        />

        <p className="text-sm text-moss-300">
          {pending.length
            ? `${pending.length} marked for elimination`
            : "No one selected — tap a player, or continue if all survived"}
        </p>

        <div className="flex w-full max-w-sm gap-3">
          <button className="btn-lantern flex-1 px-4 py-3" onClick={onExit}>
            Quit
          </button>
          <button className="btn-lantern flex-[2] px-4 py-3 text-lg" onClick={record}>
            {pending.length ? "Record & show board →" : "No deaths — continue →"}
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------ Board view ----------------------------- */
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
          Night {round} · aftermath
        </h1>
        {lastDeaths.length ? (
          <p className="mt-1 text-sm text-moss-200">
            {lastDeaths
              .map((p) => `${p} — the ${byId(roleOf[p])?.name}`)
              .join(", ")}{" "}
            fell.
          </p>
        ) : (
          <p className="mt-1 text-sm text-moss-200">Dawn breaks — everyone survived the night.</p>
        )}
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
          <button
            className="btn-lantern flex-[2] px-4 py-3 text-lg"
            onClick={() => {
              setRound((r) => r + 1);
              setView("round");
            }}
          >
            Next night →
          </button>
        )}
      </div>
    </div>
  );
}
