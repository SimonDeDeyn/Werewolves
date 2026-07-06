import { byId } from "../../data/characters";
import CharacterPortrait from "../../components/CharacterPortrait";
import type { Assignment } from "../../game/setup";

/** A photo pinned to the board by a nail, tilted slightly for realism. */
function PinnedPhoto({
  characterId,
  count,
  tilt,
}: {
  characterId: string;
  count: number;
  tilt: number;
}) {
  const character = byId(characterId);
  if (!character) return null;
  return (
    <div className="flex flex-col items-center" style={{ transform: `rotate(${tilt}deg)` }}>
      {/* Nail head */}
      <div
        className="z-10 -mb-1.5 h-3 w-3 rounded-full"
        style={{
          background: "radial-gradient(circle at 35% 30%, #f3ead0, #8a7358 60%, #3d3226)",
          boxShadow: "0 1px 2px rgba(0,0,0,0.6)",
        }}
      />
      {/* Polaroid-style photo */}
      <div className="relative w-full rounded-sm bg-moon-100/95 p-1.5 pb-3 shadow-[0_6px_10px_rgba(0,0,0,0.5)]">
        <CharacterPortrait character={character} className="aspect-square w-full" />
        <p className="mt-1 truncate text-center font-display text-[0.6rem] font-semibold text-night-900">
          {character.name}
        </p>
        {count > 1 && (
          <span className="absolute -top-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-blood-700 text-[0.6rem] font-bold text-moon-100 shadow">
            ×{count}
          </span>
        )}
      </div>
    </div>
  );
}

export default function NoticeBoardStep({
  assignments,
  moderatorName,
  onRestart,
  onExit,
}: {
  assignments: Assignment[];
  moderatorName: string | null;
  onRestart: () => void;
  onExit: () => void;
}) {
  const counts = new Map<string, number>();
  for (const a of assignments) counts.set(a.characterId, (counts.get(a.characterId) ?? 0) + 1);
  const roles = [...counts.entries()];

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
          {roles.map(([id, n], i) => (
            <PinnedPhoto key={id} characterId={id} count={n} tilt={(i % 3) - 1} />
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-moss-300 italic">
        These are the roles hidden among you. Next: each player privately learns their own — coming
        in the next update.
      </p>

      <div className="flex gap-3">
        <button className="btn-lantern flex-1 px-4 py-3" onClick={onRestart}>
          Re-deal
        </button>
        <button className="btn-lantern flex-1 px-4 py-3" onClick={onExit}>
          Done
        </button>
      </div>
    </div>
  );
}
