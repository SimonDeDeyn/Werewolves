import { useState } from "react";
import { byTeam, TEAM_LABELS, type Character, type Team } from "../data/characters";
import TeamIcon from "../components/TeamIcon";
import CharacterPortrait from "../components/CharacterPortrait";
import GameCard from "../components/GameCard";

const TEAM_ORDER: Team[] = ["village", "werewolf", "solo"];

const TEAM_ACCENT: Record<Team, string> = {
  village: "text-moss-300",
  werewolf: "text-blood-500",
  solo: "text-moon-400",
};

function CharacterCard({
  character,
  onOpen,
}: {
  character: Character;
  onOpen: (c: Character) => void;
}) {
  return (
    <article
      className="panel cursor-pointer p-4 transition-colors hover:border-moss-400/60"
      onClick={() => onOpen(character)}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className={TEAM_ACCENT[character.team]}>
              <TeamIcon team={character.team} className="h-5 w-5" />
            </span>
            <h3 className="font-display text-lg font-semibold tracking-wide text-moon-100">
              {character.name}
            </h3>
          </div>
          {character.nightOrder !== null && (
            <span
              className="mt-2 inline-block rounded-full border border-pine-500 bg-night-800 px-2.5 py-0.5 text-[0.65rem] tracking-widest text-moss-200 uppercase"
              title="Position in the night wake-up sequence"
            >
              night {character.nightOrder}
              {character.firstNightOnly ? " · first only" : ""}
            </span>
          )}
        </div>
        <CharacterPortrait
          character={character}
          className="h-16 w-16 shrink-0 drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]"
        />
      </div>
      <p className="mt-3 text-sm text-moss-200 italic">{character.description}</p>
      <p className="mt-2 text-sm leading-relaxed text-moon-200">{character.ability}</p>
      {character.oncePerGame && (
        <p className="mt-1.5 text-[0.7rem] tracking-widest text-bark-300 uppercase">
          once per game
        </p>
      )}
    </article>
  );
}

export default function CompendiumScreen({ onBack }: { onBack: () => void }) {
  const [selected, setSelected] = useState<Character | null>(null);
  return (
    <main className="mx-auto min-h-dvh max-w-5xl px-4 pt-0 pr-[max(1rem,env(safe-area-inset-right))] pb-[calc(4rem+env(safe-area-inset-bottom))] pl-[max(1rem,env(safe-area-inset-left))] sm:px-6">
      <header className="sticky top-0 z-20 mb-8 flex items-center gap-4 bg-gradient-to-b from-night-950 via-night-950/85 to-transparent pt-[calc(1.5rem+env(safe-area-inset-top))] pb-6">
        <button className="btn-lantern px-4 py-2 text-sm" onClick={onBack}>
          ← Back
        </button>
        <h1 className="font-display text-3xl font-bold tracking-wider text-moon-100">
          Characters
        </h1>
      </header>

      {TEAM_ORDER.map((team) => (
        <section key={team} className="mb-10">
          <h2
            className={`font-display mb-4 flex items-center gap-2.5 border-b border-pine-600 pb-2 text-xl tracking-[0.2em] uppercase ${TEAM_ACCENT[team]}`}
          >
            <TeamIcon team={team} className="h-5 w-5" />
            {TEAM_LABELS[team]}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {byTeam(team).map((c) => (
              <CharacterCard key={c.id} character={c} onOpen={setSelected} />
            ))}
          </div>
        </section>
      ))}

      {selected && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/75 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div onClick={(e) => e.stopPropagation()}>
            <GameCard key={selected.id} character={selected} />
          </div>
          <p className="text-xs tracking-widest text-moss-300 uppercase">
            Tap card to flip · tap outside to close
          </p>
        </div>
      )}
    </main>
  );
}
