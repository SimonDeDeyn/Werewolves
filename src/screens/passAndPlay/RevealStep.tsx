import { useState } from "react";
import { byId } from "../../data/characters";
import GameCard from "../../components/GameCard";
import type { Assignment } from "../../game/setup";

/**
 * Pass-the-phone reveal: each player in turn gets a private handoff gate, taps
 * to see their own role, then hides it before passing the device along.
 */
export default function RevealStep({
  assignments,
  canBeginNight,
  onBeginNight,
  onReplay,
  onExit,
}: {
  assignments: Assignment[];
  canBeginNight: boolean;
  onBeginNight: () => void;
  onReplay: () => void;
  onExit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(false);

  const total = assignments.length;

  // Everyone has seen their role.
  if (index >= total) {
    return (
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
          <button className="btn-lantern px-6 py-3.5 text-lg opacity-60" disabled title="Coming soon">
            Begin the night
            <span className="ml-2 text-[0.6rem] tracking-widest text-moss-300 uppercase">soon</span>
          </button>
        )}
        <div className="mt-2 flex gap-3">
          <button className="btn-lantern px-5 py-3" onClick={onReplay}>
            Re-deal
          </button>
          <button className="btn-lantern px-5 py-3" onClick={onExit}>
            Done
          </button>
        </div>
      </div>
    );
  }

  const current = assignments[index];
  const character = byId(current.characterId);

  // Handoff gate — keeps the previous player's role from being seen.
  if (!shown) {
    return (
      <div className="flex flex-col items-center gap-6 py-8 text-center">
        <p className="text-sm tracking-[0.3em] text-moss-300 uppercase">
          Player {index + 1} of {total}
        </p>
        <div>
          <p className="text-sm text-moss-200">Pass the phone to</p>
          <h2 className="font-display text-4xl font-bold tracking-wider text-moon-100">
            {current.player}
          </h2>
        </div>
        <p className="max-w-xs text-xs text-moss-300 italic">
          Make sure no one else can see the screen.
        </p>
        <button className="btn-lantern px-6 py-4 text-lg" onClick={() => setShown(true)}>
          I'm {current.player} — reveal my role
        </button>
      </div>
    );
  }

  // The player's private card — shown back-up; tap it to flip to the role.
  return (
    <div className="flex flex-col items-center gap-4 py-4 text-center">
      <p className="text-sm text-moss-200">
        <span className="text-moon-100">{current.player}</span>, here is your card
      </p>
      {character && <GameCard key={index} character={character} initialFlipped />}
      <p className="max-w-xs text-xs text-moss-300 italic">
        Tap the card to turn it over — and keep it hidden from the others.
      </p>
      <button
        className="btn-lantern px-6 py-3.5 text-lg"
        onClick={() => {
          setShown(false);
          setIndex((i) => i + 1);
        }}
      >
        {index + 1 < total ? "Hide & pass on" : "Hide & finish"}
      </button>
    </div>
  );
}
