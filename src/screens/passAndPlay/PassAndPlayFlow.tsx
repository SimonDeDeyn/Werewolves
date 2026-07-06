import { useState } from "react";
import {
  distribute,
  emptyDraft,
  roleSlots,
  type Assignment,
  type SetupDraft,
} from "../../game/setup";
import RoleSelectStep from "./RoleSelectStep";
import NoticeBoardStep from "./NoticeBoardStep";
import RevealStep from "./RevealStep";

type Step = "names" | "moderator" | "roles" | "board" | "reveal";

/* ----------------------------- Player names ----------------------------- */

function PlayerNamesStep({
  initial,
  onBack,
  onNext,
}: {
  initial: string[];
  onBack: () => void;
  onNext: (names: string[]) => void;
}) {
  const [names, setNames] = useState<string[]>(initial.length ? initial : ["", "", "", ""]);

  const update = (i: number, v: string) =>
    setNames((prev) => prev.map((n, idx) => (idx === i ? v.slice(0, 24) : n)));
  const add = () => setNames((prev) => [...prev, ""]);
  const remove = (i: number) => setNames((prev) => prev.filter((_, idx) => idx !== i));

  const clean = names.map((n) => n.trim()).filter(Boolean);
  const canNext = clean.length >= 3;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-moss-200">Enter each player at the table.</p>
      <div className="flex flex-col gap-2">
        {names.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-6 text-right font-display text-sm text-moss-400">{i + 1}</span>
            <input
              value={name}
              onChange={(e) => update(i, e.target.value)}
              maxLength={24}
              placeholder={`Player ${i + 1}`}
              className="min-w-0 flex-1 rounded-lg border border-pine-600 bg-night-800 px-3 py-2 text-moon-100 placeholder:text-moss-400 focus:border-moss-400 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={names.length <= 3}
              className="grid h-8 w-8 place-items-center rounded-full border border-pine-600 text-moss-300 hover:border-blood-500 hover:text-blood-500 disabled:opacity-30"
              aria-label={`Remove player ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={add} className="btn-lantern px-4 py-2 text-sm">
        + Add player
      </button>

      <div className="mt-2 flex gap-3">
        <button className="btn-lantern flex-1 px-4 py-3" onClick={onBack}>
          ← Back
        </button>
        <button
          className="btn-lantern flex-[2] px-4 py-3 text-lg"
          onClick={() => onNext(clean)}
          disabled={!canNext}
        >
          {canNext ? `Continue · ${clean.length} players` : "Add at least 3 players"}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------ Moderator ------------------------------- */

function ModeratorStep({
  draft,
  setDraft,
  onBack,
  onNext,
}: {
  draft: SetupDraft;
  setDraft: (d: SetupDraft) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const pick = (mode: SetupDraft["moderatorMode"]) =>
    setDraft({ ...draft, moderatorMode: mode, moderatorIndex: mode === "app" ? null : draft.moderatorIndex });

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-moss-200">Who runs the night?</p>

      <button
        type="button"
        onClick={() => pick("app")}
        className={`panel p-4 text-left transition-colors ${
          draft.moderatorMode === "app" ? "border-moss-400" : "hover:border-moss-400/50"
        }`}
      >
        <p className="font-display text-lg text-moon-100">The app narrates</p>
        <p className="mt-1 text-sm text-moss-200">
          Everyone plays. The app wakes each role in turn — no human moderator needed.
        </p>
      </button>

      <button
        type="button"
        onClick={() => pick("player")}
        className={`panel p-4 text-left transition-colors ${
          draft.moderatorMode === "player" ? "border-moss-400" : "hover:border-moss-400/50"
        }`}
      >
        <p className="font-display text-lg text-moon-100">A player narrates</p>
        <p className="mt-1 text-sm text-moss-200">
          One person runs the game using the app and doesn't receive a role.
        </p>
      </button>

      {draft.moderatorMode === "player" && (
        <div className="panel p-3">
          <p className="mb-2 text-xs tracking-widest text-moss-300 uppercase">Choose the narrator</p>
          <div className="flex flex-wrap gap-2">
            {draft.players.map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setDraft({ ...draft, moderatorIndex: i })}
                className={`rounded-full border px-3 py-1.5 text-sm ${
                  draft.moderatorIndex === i
                    ? "border-moon-200 bg-pine-500 text-moon-100"
                    : "border-pine-600 text-moss-200 hover:border-moss-400"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <button className="btn-lantern flex-1 px-4 py-3" onClick={onBack}>
          ← Back
        </button>
        <button
          className="btn-lantern flex-[2] px-4 py-3 text-lg"
          onClick={onNext}
          disabled={draft.moderatorMode === "player" && draft.moderatorIndex === null}
        >
          Choose roles · {roleSlots(draft)} seats
        </button>
      </div>
    </div>
  );
}

/* -------------------------------- Flow ---------------------------------- */

const STEP_TITLES: Record<Step, string> = {
  names: "Players",
  moderator: "Moderator",
  roles: "Choose the cast",
  board: "The notice board",
  reveal: "The reveal",
};

export default function PassAndPlayFlow({ onExit }: { onExit: () => void }) {
  const [step, setStep] = useState<Step>("names");
  const [draft, setDraft] = useState<SetupDraft>(emptyDraft());
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const deal = () => {
    setAssignments(distribute(draft));
    setStep("board");
  };

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-bold tracking-wider text-moon-100">
        {STEP_TITLES[step]}
      </h1>

      {step === "names" && (
        <PlayerNamesStep
          initial={draft.players}
          onBack={onExit}
          onNext={(names) => {
            setDraft({ ...draft, players: names });
            setStep("moderator");
          }}
        />
      )}

      {step === "moderator" && (
        <ModeratorStep
          draft={draft}
          setDraft={setDraft}
          onBack={() => setStep("names")}
          onNext={() => setStep("roles")}
        />
      )}

      {step === "roles" && (
        <RoleSelectStep
          draft={draft}
          setDraft={setDraft}
          onBack={() => setStep("moderator")}
          onDistribute={deal}
        />
      )}

      {step === "board" && (
        <NoticeBoardStep
          assignments={assignments}
          moderatorName={
            draft.moderatorMode === "player" && draft.moderatorIndex !== null
              ? draft.players[draft.moderatorIndex]
              : null
          }
          onRestart={deal}
          onReveal={() => setStep("reveal")}
        />
      )}

      {step === "reveal" && (
        <RevealStep
          assignments={assignments}
          onReplay={() => {
            deal();
            setStep("board");
          }}
          onExit={onExit}
        />
      )}
    </div>
  );
}
