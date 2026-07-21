/**
 * A collectible "Pokémon-style" card for a character, with a Werewolves twist:
 * the team acts as the card's type, the night-order is its stat, and the ability
 * reads like an attack. Tap the card to flip it — the back shows the app crest.
 *
 * Art priority for the front window: full-card art (src/assets/cards/<id>) →
 * head portrait (src/assets/portraits/<id>) → generated SVG emblem.
 */
import { useLayoutEffect, useRef, useState } from "react";
import type { Character, Team } from "../data/characters";
import TeamIcon from "./TeamIcon";
import CharacterPortrait, { cardArtFor, portraitArtFor } from "./CharacterPortrait";
import heroWerewolf from "../assets/brand/hero-werewolf.jpg";

// Fixed design size the card is laid out at before being scaled to fit; 5:9.
const CARD_W = 300;
const CARD_H = 540;

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
      style={{ borderColor: `${TEAM_HEX[character.team]}55`, aspectRatio: "1 / 1" }}
    >
      {src ? (
        // The window is square to match the square head portraits, so a
        // contained head fills it edge-to-edge with no pillar-boxing and is
        // never cropped. Real full-card art is composed to fill (cover).
        <img
          src={src}
          alt={character.name}
          className={`h-full w-full ${card ? "object-cover" : "object-contain"}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_100%_at_50%_0%,#16241a,#080f0a)]">
          <CharacterPortrait character={character} className="h-24 w-24" />
        </div>
      )}
    </div>
  );
}

export function CardFront({ character }: { character: Character }) {
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
      <div className="flex items-start justify-between gap-2">
        {/* Long names (e.g. "Accursed Wolf-Father") wrap to two lines rather
            than truncate; the night-order stat stays top-right, HP-style. */}
        <h3 className="font-display line-clamp-2 min-w-0 flex-1 text-lg leading-tight font-semibold text-moon-100">
          {character.name}
        </h3>
        <span
          className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[0.6rem] font-semibold tracking-widest uppercase"
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
      className="absolute inset-0 overflow-hidden rounded-2xl border-2 [transform:rotateY(180deg)] [backface-visibility:hidden]"
      style={{ borderColor: "#b3a878", boxShadow: "0 0 0 1px #000 inset" }}
    >
      <img src={heroWerewolf} alt="" className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-night-950/90 via-transparent to-night-950/25" />
      <div className="pointer-events-none absolute inset-1.5 rounded-xl border border-moon-400/30" />
      <div className="absolute inset-x-0 bottom-4 text-center">
        <p className="font-display text-lg font-bold tracking-[0.25em] text-moon-100">
          WEREWOLVES
        </p>
        <p className="font-display text-[0.55rem] tracking-[0.3em] text-moon-400">
          THE VILLAGE WAKES
        </p>
      </div>
    </div>
  );
}

export default function GameCard({
  character,
  initialFlipped = false,
  flipped: flippedProp,
  onClick,
  disabled = false,
  className = "w-[300px] max-w-[82vw]",
}: {
  character: Character;
  /** Start showing the back (used by the reveal — tap flips to the role). */
  initialFlipped?: boolean;
  /**
   * Controlled face: when provided, the shown side is driven by the parent
   * (true = back) and the internal tap-to-flip is disabled. Used where the flip
   * is a game choice rather than a free peek (e.g. the Actor's card pick).
   */
  flipped?: boolean;
  /** Overrides the default tap-to-flip — makes the whole card a selectable button. */
  onClick?: () => void;
  disabled?: boolean;
  /** Sizing for the outer button; override to fit several cards side by side. */
  className?: string;
}) {
  const [internalFlipped, setInternalFlipped] = useState(initialFlipped);
  const flipped = flippedProp ?? internalFlipped;
  const controlled = flippedProp !== undefined || onClick !== undefined;

  // The card is laid out at a fixed 300×540 design size, then scaled to fill
  // whatever width the outer button is given. That way the whole card — text,
  // padding, art — shrinks in proportion and reads the same at 140px in a picker
  // as at 300px on its own, instead of the text overflowing a narrow card.
  const outerRef = useRef<HTMLButtonElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = outerRef.current;
    if (!el) return;
    const apply = () => setScale(el.clientWidth / CARD_W);
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <button
      ref={outerRef}
      type="button"
      onClick={onClick ?? (() => setInternalFlipped((f) => !f))}
      disabled={disabled}
      aria-label={controlled ? `${character.name} card` : `${character.name} card — tap to flip`}
      className={`${className} relative block disabled:cursor-default`}
      style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}
    >
      {/*
       * The scaled layer keeps its full 300×540 design size but is taken out of
       * flow (absolute), so the button reserves only the scaled footprint and
       * siblings don't overlap — without an overflow clip that would cut off the
       * card's corners as they swing out of plane during the 3D flip.
       */}
      {/*
       * A deep perspective keeps the flip nearly orthographic, so the near face
       * barely magnifies past the card's box mid-rotation — the corners stay
       * inside the viewport and can't be shaved by the body's overflow-x clip.
       */}
      <div
        className="absolute top-0 left-0 [perspective:3200px]"
        style={{
          width: `${CARD_W}px`,
          height: `${CARD_H}px`,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <div
          className="relative h-full w-full transition-transform duration-700 [transform-style:preserve-3d]"
          style={{ transform: flipped ? "rotateY(180deg)" : "none" }}
        >
          <CardFront character={character} />
          <CardBack />
        </div>
      </div>
    </button>
  );
}
