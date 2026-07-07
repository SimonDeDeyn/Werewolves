import { useState } from "react";
import { byId, type Character } from "../../data/characters";
import GameCard from "../../components/GameCard";
import type { Assignment } from "../../game/setup";

/**
 * Pass-the-phone reveal: each player in turn gets a private handoff gate, taps
 * to flip their card to their role, then hides it before passing on. After
 * everyone has seen theirs, players can take another look, and the moderator
 * can step back to the notice board (guarded by a confirmation).
 */

/** Handoff gate — announces whose turn it is and gates the reveal. */
function Gate({
  player,
  subtitle,
  onReveal,
}: {
  player: string;
  subtitle: string;
  onReveal: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-6 py-6 text-center">
      <p className="text-sm tracking-[0.3em] text-moss-300 uppercase">{subtitle}</p>
      <div>
        <p className="text-sm text-moss-200">Pass the phone to</p>
        <h2 className="font-display text-4xl font-bold tracking-wider text-moon-100">{player}</h2>
      </div>
      <p className="max-w-xs text-xs text-moss-300 italic">
        Make sure no one else can see the screen.
      </p>
      <button className="btn-lantern px-6 py-4 text-lg" onClick={onReveal}>
        I'm {player} — reveal my role
      </button>
    </div>
  );
}

/** The private role card — back-up; tap to flip to the role. */
function CardView({
  player,
  character,
  hideLabel,
  onHide,
  flipKey,
}: {
  player: string;
  character: Character | undefined;
  hideLabel: string;
  onHide: () => void;
  flipKey: string | number;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <p className="text-sm text-moss-200">
        <span className="text-moon-100">{player}</span>, here is your card
      </p>
      {character && <GameCard key={flipKey} character={character} initialFlipped />}
      <p className="max-w-xs text-xs text-moss-300 italic">
        Tap the card to turn it over — and keep it hidden from the others.
      </p>
      <button className="btn-lantern px-6 py-3.5 text-lg" onClick={onHide}>
        {hideLabel}
      </button>
    </div>
  );
}

export default function RevealStep({
  assignments,
  canBeginNight,
  onBeginNight,
  onBack,
  onReplay,
  onExit,
}: {
  assignments: Assignment[];
  canBeginNight: boolean;
  onBeginNight: () => void;
  onBack: () => void;
  onReplay: () => void;
  onExit: () => void;
}) {
  const total = assignments.length;
  const players = assignments.map((a) => a.player);

  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);
  const [confirm, setConfirm] = useState<null | { text: string; onYes: () => void }>(null);

  // Review sub-flow (after everyone has seen their card).
  const [reviewing, setReviewing] = useState(false);
  const [reviewPlayer, setReviewPlayer] = useState<string | null>(null);
  const [reviewShown, setReviewShown] = useState(false);

  const backToBoard = () =>
    setConfirm({
      text: "Go back to the notice board? The reveal will start over.",
      onYes: onBack,
    });

  const confirmDialog = confirm ? (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur-sm"
      onClick={() => setConfirm(null)}
    >
      <div className="panel max-w-xs p-5 text-center" onClick={(e) => e.stopPropagation()}>
        <p className="text-sm text-moon-100">{confirm.text}</p>
        <div className="mt-4 flex gap-3">
          <button className="btn-lantern flex-1 px-4 py-2.5" onClick={() => setConfirm(null)}>
            Cancel
          </button>
          <button
            className="btn-lantern flex-1 px-4 py-2.5"
            onClick={() => {
              const yes = confirm.onYes;
              setConfirm(null);
              yes();
            }}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  ) : null;

  /* ------------------------------- Review -------------------------------- */
  if (reviewing) {
    let content;
    if (!reviewPlayer) {
      content = (
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <h2 className="font-display text-2xl font-bold tracking-wider text-moon-100">
            Take another look
          </h2>
          <p className="max-w-sm text-sm text-moss-200">Who needs to see their card again?</p>
          <div className="flex flex-wrap justify-center gap-2">
            {players.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setReviewPlayer(p);
                  setReviewShown(false);
                }}
                className="rounded-full border border-pine-600 px-3 py-1.5 text-sm text-moss-200 hover:border-moss-400 hover:text-moon-100"
              >
                {p}
              </button>
            ))}
          </div>
          <button className="btn-lantern px-6 py-3 text-sm" onClick={() => setReviewing(false)}>
            ← Done looking
          </button>
        </div>
      );
    } else if (!reviewShown) {
      content = (
        <Gate
          player={reviewPlayer}
          subtitle="Another look"
          onReveal={() => setReviewShown(true)}
        />
      );
    } else {
      content = (
        <CardView
          player={reviewPlayer}
          character={byId(roleFor(assignments, reviewPlayer))}
          hideLabel="Hide & done"
          flipKey={`review-${reviewPlayer}`}
          onHide={() => setReviewPlayer(null)}
        />
      );
    }
    return (
      <>
        {content}
        {confirmDialog}
      </>
    );
  }

  /* ----------------------------- Completion ------------------------------ */
  if (index >= total) {
    return (
      <>
        <div className="flex flex-col items-center gap-5 py-6 text-center">
          <h2 className="font-display text-3xl font-bold tracking-wider text-moon-100">
            Everyone knows their role
          </h2>
          <p className="max-w-sm text-sm text-moss-200">
            The village settles in for the night.
            {canBeginNight
              ? " The moderator can start running the night whenever you're ready."
              : " App-narrated nights are coming in the next update."}
          </p>

          {canBeginNight ? (
            <button className="btn-lantern px-6 py-3.5 text-lg" onClick={onBeginNight}>
              Begin the night
            </button>
          ) : (
            <button
              className="btn-lantern px-6 py-3.5 text-lg opacity-60"
              disabled
              title="Coming soon"
            >
              Begin the night
              <span className="ml-2 text-[0.6rem] tracking-widest text-moss-300 uppercase">
                soon
              </span>
            </button>
          )}

          <button
            className="btn-lantern px-6 py-3 text-sm"
            onClick={() => {
              setReviewing(true);
              setReviewPlayer(null);
            }}
          >
            Does anyone need another look?
          </button>

          <div className="mt-1 flex flex-wrap justify-center gap-3">
            <button className="btn-lantern px-5 py-3" onClick={onReplay}>
              Re-deal
            </button>
            <button className="btn-lantern px-5 py-3" onClick={backToBoard}>
              ← Notice board
            </button>
            <button className="btn-lantern px-5 py-3" onClick={onExit}>
              Done
            </button>
          </div>
        </div>
        {confirmDialog}
      </>
    );
  }

  /* ----------------------------- Main reveal ----------------------------- */
  const current = assignments[index];
  return (
    <>
      {!shown ? (
        <div className="flex flex-col items-center gap-4">
          <Gate
            player={current.player}
            subtitle={`Player ${index + 1} of ${total}`}
            onReveal={() => setShown(true)}
          />
          <button
            type="button"
            className="text-xs text-moss-300 underline-offset-2 hover:text-moon-200 hover:underline"
            onClick={backToBoard}
          >
            ← Back to the notice board
          </button>
        </div>
      ) : (
        <CardView
          player={current.player}
          character={byId(current.characterId)}
          hideLabel={index + 1 < total ? "Hide & pass on" : "Hide & finish"}
          flipKey={index}
          onHide={() => {
            setShown(false);
            setIndex((i) => i + 1);
          }}
        />
      )}
      {confirmDialog}
    </>
  );
}

function roleFor(assignments: Assignment[], player: string): string {
  return assignments.find((a) => a.player === player)?.characterId ?? "";
}
