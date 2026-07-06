import { byTeam, TEAM_LABELS, type Character, type Team } from "../../data/characters";
import CharacterPortrait from "../../components/CharacterPortrait";
import {
  recommendedWolves,
  roleSlots,
  setupError,
  totalSelected,
  werewolfCount,
  type SetupDraft,
} from "../../game/setup";

const TEAM_ORDER: Team[] = ["village", "werewolf", "solo"];
const TEAM_ACCENT: Record<Team, string> = {
  village: "text-moss-300",
  werewolf: "text-blood-500",
  solo: "text-moon-400",
};

function StepBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="grid h-8 w-8 place-items-center rounded-full border border-moss-400/50 bg-night-800 text-lg leading-none text-moon-100 transition-colors hover:border-moon-200 disabled:opacity-30"
    >
      {label}
    </button>
  );
}

function RoleBar({
  character,
  count,
  onInc,
  onDec,
}: {
  character: Character;
  count: number;
  onInc: () => void;
  onDec: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${
        count > 0 ? "border-moss-400/60 bg-night-700/60" : "border-pine-600 bg-night-800/40"
      }`}
    >
      <CharacterPortrait character={character} className="h-10 w-10 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-sm text-moon-100">{character.name}</p>
        <p className="truncate text-[0.65rem] tracking-wide text-moss-300 uppercase">
          {character.nightOrder !== null ? "wakes at night" : "passive"}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StepBtn label="−" onClick={onDec} disabled={count === 0} />
        <span className="w-5 text-center font-display text-moon-100">{count}</span>
        <StepBtn label="+" onClick={onInc} disabled={count >= (character.maxCount ?? 1)} />
      </div>
    </div>
  );
}

export default function RoleSelectStep({
  draft,
  setDraft,
  onBack,
  onDistribute,
}: {
  draft: SetupDraft;
  setDraft: (d: SetupDraft) => void;
  onBack: () => void;
  onDistribute: () => void;
}) {
  const slots = roleSlots(draft);
  const total = totalSelected(draft.counts);
  const wolves = werewolfCount(draft.counts);
  const recWolves = recommendedWolves(slots);
  const error = setupError(draft);

  const setCount = (id: string, next: number) =>
    setDraft({ ...draft, counts: { ...draft.counts, [id]: Math.max(0, next) } });

  return (
    <div className="flex flex-col gap-4">
      {/* Live tally */}
      <div className="panel sticky top-2 z-10 flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex gap-4 text-sm">
          <span className="text-moss-200">
            Roles{" "}
            <b className={total > slots ? "text-blood-500" : "text-moon-100"}>{total}</b>
            <span className="text-moss-400"> / {slots}</span>
          </span>
          <span className="text-moss-200" title={`Recommended: ${recWolves}`}>
            Wolves{" "}
            <b className={wolves * 2 >= slots ? "text-blood-500" : "text-moon-100"}>{wolves}</b>
            <span className="text-moss-400"> · rec {recWolves}</span>
          </span>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-moss-200 select-none">
          <input
            type="checkbox"
            checked={draft.randomize}
            onChange={(e) => setDraft({ ...draft, randomize: e.target.checked })}
            className="h-4 w-4 accent-moss-400"
          />
          Randomize leftovers
        </label>
      </div>

      {draft.randomize && (
        <p className="-mt-1 text-xs text-moss-300 italic">
          Empty seats are filled with random passive village roles — unannounced at night, for
          extra mystery.
        </p>
      )}

      {TEAM_ORDER.map((team) => (
        <section key={team}>
          <h3
            className={`mb-2 border-b border-pine-600 pb-1 font-display text-sm tracking-[0.2em] uppercase ${TEAM_ACCENT[team]}`}
          >
            {TEAM_LABELS[team]}
          </h3>
          <div className="flex flex-col gap-2">
            {byTeam(team).map((c) => (
              <RoleBar
                key={c.id}
                character={c}
                count={draft.counts[c.id] ?? 0}
                onInc={() => setCount(c.id, (draft.counts[c.id] ?? 0) + 1)}
                onDec={() => setCount(c.id, (draft.counts[c.id] ?? 0) - 1)}
              />
            ))}
          </div>
        </section>
      ))}

      <div className="sticky bottom-2 z-10 flex flex-col gap-2">
        {error && (
          <p className="rounded-md border border-blood-700 bg-night-900/90 px-3 py-2 text-center text-xs text-blood-500 backdrop-blur">
            {error}
          </p>
        )}
        <div className="flex gap-3">
          <button className="btn-lantern flex-1 px-4 py-3" onClick={onBack}>
            ← Back
          </button>
          <button
            className="btn-lantern flex-[2] px-4 py-3 text-lg"
            onClick={onDistribute}
            disabled={!!error}
          >
            Deal the roles
          </button>
        </div>
      </div>
    </div>
  );
}
