/**
 * A collectible "Pokémon-style" card for a character, with a Werewolves twist:
 * the team acts as the card's type, the night-order is its stat, and the ability
 * reads like an attack. Tap the card to flip it — the back shows the app crest.
 *
 * Art priority for the front window: full-card art (src/assets/cards/<id>) →
 * head portrait (src/assets/portraits/<id>) → generated SVG emblem.
 */
import { useState } from "react";
import type { Character, Team } from "../data/characters";
import TeamIcon from "./TeamIcon";
import Logo from "./Logo";
import CharacterPortrait, { cardArtFor, portraitArtFor } from "./CharacterPortrait";

const TEAM_HEX: Record<Team, string> = {
  village: "#a6c4a0",
  werewolf: "#d0685a",
  solo: "#d8bd6c",
};

const TEAM_LABEL: Record<Team, string> = {
  village: "Village",
  werewolf: "Werewolf",
  solo: "Solo",
};

function ArtWindow({ character }: { character: Character }) {
  const card = cardArtFor(character.id);
  const head = portraitArtFor(character.id);
  const src = card ?? head;

  return (
    <div
      className="relative overflow-hidden rounded-md border bg-night-950"
      style={{ borderColor: `${TEAM_HEX[character.team]}55`, aspectRatio: "4 / 3" }}
    >
      {src ? (
        <img src={src} alt={character.name} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_100%_at_50%_0%,#16241a,#080f0a)]">
          <CharacterPortrait character={character} className="h-24 w-24" />
        </div>
      )}
    </div>
  );
}

function CardFront({ character }: { character: Character }) {
  const tint = TEAM_HEX[character.team];
  const tags = [
    character.firstNightOnly ? "First night" : null,
    character.oncePerGame ? "Once per game" : null,
  ].filter(Boolean) as string[];

  return (
    <div
      className="absolute inset-0 flex flex-col gap-2 rounded-2xl border-2 p-3 [backface-visibility:hidden]"
      style={{
        borderColor: tint,
        background: "linear-gradient(165deg,#16241a,#0a120c 70%,#070d09)",
        boxShadow: `0 0 0 1px #000 inset, 0 0 22px ${tint}22`,
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display truncate text-lg leading-tight font-semibold text-moon-100">
          {character.name}
        </h3>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold tracking-widest uppercase"
          style={{ color: tint, border: `1px solid ${tint}66` }}
        >
          {character.nightOrder !== null ? `Night ${character.nightOrder}` : "Passive"}
        </span>
      </div>

      <ArtWindow character={character} />

      <div className="flex items-center justify-between gap-2 border-b border-pine-600 pb-1.5">
        <span className="flex items-center gap-1.5 text-xs tracking-wide" style={{ color: tint }}>
          <TeamIcon team={character.team} className="h-4 w-4" />
          {TEAM_LABEL[character.team]}
        </span>
        <div className="flex flex-wrap justify-end gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-bark-400 px-1.5 py-0.5 text-[0.55rem] tracking-widest text-bark-300 uppercase"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-pine-600 bg-night-800/60 p-2">
        <p className="text-[0.6rem] tracking-[0.2em] text-moss-300 uppercase">Ability</p>
        <p className="mt-0.5 text-[0.78rem] leading-snug text-moon-200">{character.ability}</p>
      </div>

      <p className="mt-auto text-[0.72rem] leading-snug text-moss-200 italic">
        {character.description}
      </p>
    </div>
  );
}

function CardBack() {
  return (
    <div
      className="absolute inset-0 flex items-center justify-center rounded-2xl border-2 p-4 [transform:rotateY(180deg)] [backface-visibility:hidden]"
      style={{
        borderColor: "#b3a878",
        background: "radial-gradient(120% 90% at 50% 0%,#16241a,#0a120c 65%,#060b08)",
        boxShadow: "0 0 0 1px #000 inset",
      }}
    >
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-moss-400/25" />
      <Logo variant="full" className="w-4/5" />
    </div>
  );
}

export default function GameCard({ character }: { character: Character }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((f) => !f)}
      aria-label={`${character.name} card — tap to flip`}
      className="w-[300px] max-w-[82vw] [perspective:1400px]"
    >
      <div
        className="relative aspect-[5/7] w-full transition-transform duration-700 [transform-style:preserve-3d]"
        style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
      >
        <CardFront character={character} />
        <CardBack />
      </div>
    </button>
  );
}
