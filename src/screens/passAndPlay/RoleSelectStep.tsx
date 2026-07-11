import type { Dispatch, SetStateAction } from "react";
import { byId, byTeam, TEAM_LABELS, type Character, type Team } from "../../data/characters";
import CharacterPortrait from "../../components/CharacterPortrait";
import {
  eligibleActorCards,
  eligibleMiddleCards,
  randomActorCards,
  randomMiddleCards,
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
  locked = false,
  onInc,
  onDec,
}: {
  character: Character;
  count: number;
  /** Reserved as a Thief/Actor card — can't also be dealt to a player. */
  locked?: boolean;
  onInc: () => void;
  onDec: () => void;
}) {
  const group = character.groupSize ?? 1;
  const wakes = character.nightOrder !== null ? "wakes at night" : "passive";
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
          {locked ? "in the Thief / Actor pile" : group > 1 ? `${group} seats · ${wakes}` : wakes}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <StepBtn label="−" onClick={onDec} disabled={count === 0} />
        <span className="w-5 text-center font-display text-moon-100">{count}</span>
        <StepBtn
          label="+"
          onClick={onInc}
          disabled={locked || count >= (character.maxCount ?? 1)}
        />
      </div>
    </div>
  );
}

/**
 * Picks a fixed number of cards from an eligible pool (Thief's middle cards,
 * the Actor's borrowed roles). Chosen cards show as chips (tap to remove);
 * the pool below is a grid of tappable portraits. A card may be chosen more
 * than once when the pool offers it (e.g. Villager).
 */
function CardPicker({
  eligible,
  count,
  value,
  onChange,
  onRandomize,
  randomizeLabel,
}: {
  eligible: Character[];
  count: number;
  value: string[];
  onChange: (ids: string[]) => void;
  onRandomize: () => void;
  randomizeLabel: string;
}) {
  const filled = value.filter(Boolean);
  const full = filled.length >= count;
  const add = (id: string) => {
    if (!full) onChange([...filled, id]);
  };
  const removeAt = (i: number) => onChange(filled.filter((_, idx) => idx !== i));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: count }).map((_, i) => {
          const c = filled[i] ? byId(filled[i]) : undefined;
          return c ? (
            <button
              key={i}
              type="button"
              onClick={() => removeAt(i)}
              className="flex items-center gap-1.5 rounded-full border border-moss-400/60 bg-night-700/60 py-1 pr-2.5 pl-1 text-sm text-moon-100 hover:border-blood-500"
            >
              <CharacterPortrait character={c} className="h-6 w-6" />
              {c.name}
              <span className="text-moss-400">×</span>
            </button>
          ) : (
            <span
              key={i}
              className="grid h-8 place-items-center rounded-full border border-dashed border-pine-600 px-4 text-xs text-moss-400"
            >
              Card {i + 1}
            </span>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {eligible.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={full}
            onClick={() => add(c.id)}
            className="flex items-center gap-2 rounded-lg border border-pine-600 bg-night-800/40 px-2 py-1.5 text-left text-xs text-moss-200 hover:border-moss-400 hover:text-moon-100 disabled:opacity-30 disabled:hover:border-pine-600"
          >
            <CharacterPortrait character={c} className="h-6 w-6 shrink-0" />
            <span className="truncate">{c.name}</span>
          </button>
        ))}
      </div>

      <button type="button" onClick={onRandomize} className="btn-lantern px-4 py-2 text-sm">
        {randomizeLabel}
      </button>
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
  setDraft: Dispatch<SetStateAction<SetupDraft>>;
  onBack: () => void;
  onDistribute: () => void;
}) {
  const slots = roleSlots(draft);
  const total = totalSelected(draft.counts);
  const wolves = werewolfCount(draft.counts);
  const recWolves = recommendedWolves(slots);
  const error = setupError(draft);

  // When both share a table, their pools must be disjoint and strictly unused.
  const hasThief = (draft.counts["thief"] ?? 0) > 0;
  const hasActor = (draft.counts["actor"] ?? 0) > 0;
  const bothPresent = hasThief && hasActor;
  const thiefOpts = { exclude: hasActor ? draft.actorCards : [], strictUnused: bothPresent };
  const actorOpts = { exclude: hasThief ? draft.middleCards : [], strictUnused: bothPresent };

  // A unique card set aside for the Thief/Actor pile can't also be dealt to a
  // player — lock its stepper. Villager/Werewolf repeat freely, so never lock.
  const reserved = new Set(
    [...(hasThief ? draft.middleCards : []), ...(hasActor ? draft.actorCards : [])].filter(Boolean),
  );
  const isReserved = (id: string) => id !== "villager" && id !== "werewolf" && reserved.has(id);

  const bump = (id: string, delta: number) =>
    setDraft((prev) => ({
      ...prev,
      counts: { ...prev.counts, [id]: Math.max(0, (prev.counts[id] ?? 0) + delta) },
    }));

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
            onChange={(e) => setDraft((prev) => ({ ...prev, randomize: e.target.checked }))}
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
                locked={isReserved(c.id)}
                onInc={() => bump(c.id, c.groupSize ?? 1)}
                onDec={() => bump(c.id, -(c.groupSize ?? 1))}
              />
            ))}
          </div>
        </section>
      ))}

      {(draft.counts["thief"] ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 border-b border-pine-600 pb-1 font-display text-sm tracking-[0.2em] text-moon-400 uppercase">
            Thief's middle cards
          </h3>
          <p className="mb-2 text-xs text-moss-300 italic">
            Two unused cards laid in the middle — on the first night the Thief may swap into one or
            keep the Thief. Villager and Werewolf may repeat.
          </p>
          <CardPicker
            eligible={eligibleMiddleCards(draft.counts, thiefOpts)}
            count={2}
            value={draft.middleCards}
            onChange={(ids) => setDraft((prev) => ({ ...prev, middleCards: ids }))}
            onRandomize={() =>
              setDraft((prev) => ({
                ...prev,
                middleCards: randomMiddleCards(prev.counts, {
                  exclude: (prev.counts["actor"] ?? 0) > 0 ? prev.actorCards : [],
                  strictUnused: (prev.counts["actor"] ?? 0) > 0,
                }),
              }))
            }
            randomizeLabel="🎲 Randomize middle cards"
          />
        </section>
      )}

      {(draft.counts["actor"] ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 border-b border-pine-600 pb-1 font-display text-sm tracking-[0.2em] text-moss-300 uppercase">
            Actor's three roles
          </h3>
          <p className="mb-2 text-xs text-moss-300 italic">
            Three unused village cards. Each of the first three nights the Actor turns one over and
            plays it that night; once all three are used they are a plain Villager.
          </p>
          <CardPicker
            eligible={eligibleActorCards(draft.counts, actorOpts)}
            count={3}
            value={draft.actorCards}
            onChange={(ids) => setDraft((prev) => ({ ...prev, actorCards: ids }))}
            onRandomize={() =>
              setDraft((prev) => ({
                ...prev,
                actorCards: randomActorCards(prev.counts, {
                  exclude: (prev.counts["thief"] ?? 0) > 0 ? prev.middleCards : [],
                  strictUnused: (prev.counts["thief"] ?? 0) > 0,
                }),
              }))
            }
            randomizeLabel="🎲 Randomize Actor cards"
          />
        </section>
      )}

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
