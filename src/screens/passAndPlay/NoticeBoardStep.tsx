import { useMemo } from "react";
import { byId } from "../../data/characters";
import CharacterPortrait from "../../components/CharacterPortrait";
import { shuffle, type Assignment } from "../../game/setup";

/** The metallic nail head that pins each photo to the board. */
function Nail() {
  return (
    <div
      className="z-10 -mb-1.5 h-3 w-3 rounded-full"
      style={{
        background: "radial-gradient(circle at 35% 30%, #f3ead0, #8a7358 60%, #3d3226)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.6)",
      }}
    />
  );
}

/** A revealed role photo, pinned and tilted. */
function RolePin({ characterId, tilt }: { characterId: string; tilt: number }) {
  const character = byId(characterId);
  if (!character) return null;
  return (
    <div className="flex flex-col items-center" style={{ transform: `rotate(${tilt}deg)` }}>
      <Nail />
      <div className="w-full rounded-sm bg-moon-100/95 p-1.5 pb-3 shadow-[0_6px_10px_rgba(0,0,0,0.5)]">
        <CharacterPortrait character={character} className="aspect-square w-full" />
        <p className="mt-1 truncate text-center font-display text-[0.6rem] font-semibold text-night-900">
          {character.name}
        </p>
      </div>
    </div>
  );
}

/** A randomized (hidden) role — pinned, but a mystery. */
function MysteryPin({ tilt }: { tilt: number }) {
  return (
    <div className="flex flex-col items-center" style={{ transform: `rotate(${tilt}deg)` }}>
      <Nail />
      <div className="w-full rounded-sm bg-moon-100/95 p-1.5 pb-3 shadow-[0_6px_10px_rgba(0,0,0,0.5)]">
        <div className="grid aspect-square w-full place-items-center rounded-full bg-[radial-gradient(120%_100%_at_50%_0%,#16241a,#080f0a)]">
          <span className="font-display text-3xl font-bold text-moss-300">?</span>
        </div>
        <p className="mt-1 truncate text-center font-display text-[0.6rem] font-semibold text-bark-400">
          Unknown
        </p>
      </div>
    </div>
  );
}

export default function NoticeBoardStep({
  assignments,
  moderatorName,
  onRestart,
  onReveal,
}: {
  assignments: Assignment[];
  moderatorName: string | null;
  onRestart: () => void;
  onReveal: () => void;
}) {
  // One pin per seat, shuffled so the order can't be mapped back to players.
  const cast = useMemo(
    () => shuffle(assignments.map((a) => ({ characterId: a.characterId, random: a.random }))),
    [assignments],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="text-center">
        <h2 className="font-display text-2xl font-bold tracking-wider text-moon-100">
          Tonight's cast
        </h2>
        <p className="mt-1 text-sm text-moss-200">
          {assignments.length} roles are in play
          {moderatorName ? ` · ${moderatorName} narrates` : " · the app narrates"}.
        </p>
      </div>

      {/* Cork / wood notice board */}
      <div
        className="rounded-xl border-4 p-4 shadow-inner"
        style={{
          borderColor: "#3d3226",
          background:
            "repeating-linear-gradient(115deg,#4a3b2a,#4a3b2a 6px,#463726 6px,#463726 12px)",
        }}
      >
        <div className="grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4">
          {cast.map((c, i) =>
            c.random ? (
              <MysteryPin key={i} tilt={(i % 3) - 1} />
            ) : (
              <RolePin key={i} characterId={c.characterId} tilt={(i % 3) - 1} />
            ),
          )}
        </div>
      </div>

      <p className="text-center text-xs text-moss-300 italic">
        These are the roles hidden among you — the “?” cards stay a mystery. Now pass the phone so
        everyone can privately learn their own.
      </p>

      <div className="flex gap-3">
        <button className="btn-lantern flex-1 px-4 py-3" onClick={onRestart}>
          Re-deal
        </button>
        <button className="btn-lantern flex-[2] px-4 py-3 text-lg" onClick={onReveal}>
          Begin the reveal →
        </button>
      </div>
    </div>
  );
}
