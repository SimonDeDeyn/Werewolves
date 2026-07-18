# Deferred: 5:7 "Pokémon-style" card layout

Status: **built and working, then reverted** (2026-07-18). We went back to the
5:9 card with a square 1:1 art window because that matches the current square
head portraits — the only art we have so far. Re-apply this when real
**landscape 4:3 card illustrations** exist.

## What it does

- Card aspect **5:7** (300×420 design) — real trading-card proportions (63×88mm).
- **Landscape 4:3 art window** up top (~50% of the card), framed like a TCG
  illustration box. Real card art fills it (`object-cover`); a square head used as
  a fallback pillarboxes (`object-contain`).
- Header = name (left) + night-order "stat" (right, HP slot): `NIGHT 140` / `PASSIVE`.
- Type line = team icon + label, with First-night / Once-per-game tags.
- Ability = the "attack" box, with a `useFitText` hook that shrinks the font
  (11px → 6.5px) until the longest ability (Witch, Wolf-Father) fits without
  scrolling or clipping.
- Flavor = `line-clamp-2` at the bottom.

## Art spec change this requires

- **Card** (`src/assets/cards/<id>`): **4:3 landscape**, e.g. 1024×768, `object-cover`.
- **Head** (`src/assets/portraits/<id>`): **1:1 square**, unchanged — still used on
  the board, wake screens, and compendium circles.
- Generation: prepend the global woodcut style prefix from `docs/art-briefs.md`;
  card prompts use the "full-body character, atmospheric forest scene" clause.

## How to re-apply

1. Replace `src/components/GameCard.tsx` with the code block below.
2. In `src/screens/passAndPlay/NightPhase.tsx`, the Actor's empty-slot placeholder
   changes from `aspect-[5/9]` to `aspect-[5/7]` (search for `border-dashed border-pine-600/40`).
3. `npm run build`, then eyeball the Witch / Wolf-Father cards (wordiest abilities)
   and the Thief / Actor multi-card pickers.

## GameCard.tsx (the 5:7 version)

```tsx
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

// Fixed design size the card is laid out at before being scaled to fit. 5:7 —
// the proportions of a real trading card (63×88mm), with a landscape art window
// up top like a Pokémon card and the rules text laid out below it.
const CARD_W = 300;
const CARD_H = 420;

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

/**
 * Shrink a block of text until it fits its box — the ability line varies wildly
 * in length across roles, and a real card can't scroll. Measured at the fixed
 * design size, so the transform scale applied to the whole card doesn't matter.
 */
function useFitText(text: string, max: number, min: number) {
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const el = textRef.current;
    if (!box || !el) return;
    let size = max;
    el.style.fontSize = `${size}px`;
    // Shrink until the whole box (label + text) stops overflowing its allotted height.
    while (size > min && box.scrollHeight > box.clientHeight) {
      size -= 0.5;
      el.style.fontSize = `${size}px`;
    }
  }, [text, max, min]);
  return { boxRef, textRef };
}

function ArtWindow({ character }: { character: Character }) {
  const card = cardArtFor(character.id);
  const head = portraitArtFor(character.id);
  const src = card ?? head;
  const tint = TEAM_HEX[character.team];

  return (
    // Landscape 4:3 art window, framed like a trading card's illustration box.
    // Real card art is composed landscape and fills it (cover); a square head
    // portrait used as a fallback is shown whole and centred (contain).
    <div
      className="relative overflow-hidden rounded-sm border bg-night-950"
      style={{
        borderColor: `${tint}88`,
        aspectRatio: "4 / 3",
        boxShadow: `0 0 0 1px #000, inset 0 0 0 1px ${tint}33`,
      }}
    >
      {src ? (
        <img
          src={src}
          alt={character.name}
          className={`h-full w-full ${card ? "object-cover" : "object-contain"}`}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(120%_100%_at_50%_0%,#16241a,#080f0a)]">
          <CharacterPortrait character={character} className="h-20 w-20" />
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
  const ability = useFitText(character.ability, 11, 6.5);

  return (
    <div
      className="absolute inset-0 flex flex-col gap-1.5 rounded-2xl border-2 p-2.5 [backface-visibility:hidden]"
      style={{
        borderColor: tint,
        background: "linear-gradient(165deg,#16241a,#0a120c 70%,#070d09)",
        boxShadow: `0 0 0 1px #000 inset, 0 0 22px ${tint}22`,
      }}
    >
      {/* Name + the night-order "stat", like a card's name and HP. */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-display truncate text-base leading-tight font-semibold text-moon-100">
          {character.name}
        </h3>
        <span className="shrink-0 leading-none" style={{ color: tint }}>
          {character.nightOrder !== null ? (
            <>
              <span className="text-[0.5rem] tracking-widest uppercase opacity-80">night </span>
              <span className="font-display text-base font-bold">{character.nightOrder}</span>
            </>
          ) : (
            <span className="text-[0.6rem] font-semibold tracking-widest uppercase">Passive</span>
          )}
        </span>
      </div>

      <ArtWindow character={character} />

      {/* Type line — team on the left, trait tags on the right. */}
      <div className="flex items-center justify-between gap-2 border-y border-pine-600 py-1">
        <span className="flex items-center gap-1.5 text-[0.7rem] tracking-wide" style={{ color: tint }}>
          <TeamIcon team={character.team} className="h-3.5 w-3.5" />
          {TEAM_LABEL[character.team]}
        </span>
        <div className="flex flex-wrap justify-end gap-1">
          {tags.map((t) => (
            <span
              key={t}
              className="rounded-full border border-bark-400 px-1.5 py-0.5 text-[0.5rem] tracking-widest text-bark-300 uppercase"
            >
              {t}
            </span>
          ))}
        </div>
      </div>

      {/* Ability — the "attack" box, its text shrunk to fit whatever room is left. */}
      <div
        ref={ability.boxRef}
        className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-pine-600 bg-night-800/60 px-2 py-1.5"
      >
        <p className="text-[0.55rem] tracking-[0.2em] text-moss-300 uppercase">Ability</p>
        <p ref={ability.textRef} className="mt-0.5 leading-snug text-moon-200">
          {character.ability}
        </p>
      </div>

      <p className="line-clamp-2 text-[0.62rem] leading-snug text-moss-200 italic">
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

  // The card is laid out at a fixed 300×420 design size, then scaled to fill
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
```
