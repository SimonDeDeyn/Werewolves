/**
 * A character's "head" portrait for the Characters menu.
 *
 * Rendering priority:
 *   1. A real illustrated head dropped into src/assets/portraits/<id>.<ext>
 *      (png/jpg/webp) — picked up automatically at build time.
 *   2. Otherwise a generated woodcut-style SVG emblem medallion, tinted by team.
 *
 * The full-body "Pokémon card" art lives in src/assets/cards/<id>.<ext> and is
 * read the same way by cardArtFor() for the future reveal workflow.
 */
import type { Character, Team } from "../data/characters";
import { MOTIFS, MOTIF_BY_ID } from "./characterMotifs";

// Eagerly map any dropped-in raster art to its served URL, keyed by basename.
const portraitFiles = import.meta.glob("../assets/portraits/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;
const cardFiles = import.meta.glob("../assets/cards/*.{png,jpg,jpeg,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function indexByBasename(files: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [path, url] of Object.entries(files)) {
    const base = path.split("/").pop()!.replace(/\.[^.]+$/, "");
    out[base] = url;
  }
  return out;
}
const PORTRAITS = indexByBasename(portraitFiles);
const CARDS = indexByBasename(cardFiles);

/** URL of the dropped-in full-card art for a character, if any. */
export function cardArtFor(id: string): string | undefined {
  return CARDS[id];
}

const TEAM_TINT: Record<Team, string> = {
  village: "#a6c4a0",
  werewolf: "#d0685a",
  solo: "#d8bd6c",
};

export default function CharacterPortrait({
  character,
  className = "h-16 w-16",
}: {
  character: Character;
  className?: string;
}) {
  const real = PORTRAITS[character.id];
  const tint = TEAM_TINT[character.team];

  if (real) {
    return (
      <img
        src={real}
        alt={`${character.name} portrait`}
        className={`${className} rounded-full object-cover`}
        style={{ border: `2px solid ${tint}66` }}
        loading="lazy"
      />
    );
  }

  const motif = MOTIFS[MOTIF_BY_ID[character.id] ?? "hood"];
  const gid = `pg-${character.id}`;

  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      role="img"
      aria-label={`${character.name} emblem`}
    >
      <defs>
        <radialGradient id={gid} cx="50%" cy="38%" r="70%">
          <stop offset="0%" stopColor="#1b2c20" />
          <stop offset="70%" stopColor="#0e1a12" />
          <stop offset="100%" stopColor="#060b08" />
        </radialGradient>
      </defs>

      {/* Medallion background + moon glow */}
      <circle cx="50" cy="50" r="48" fill={`url(#${gid})`} />
      <circle cx="68" cy="30" r="9" fill="#ece5cd" opacity="0.16" />

      {/* Motif, tinted by team */}
      <g style={{ color: tint }}>{motif}</g>

      {/* Framed ring */}
      <circle cx="50" cy="50" r="47" fill="none" stroke={tint} strokeWidth="2.5" opacity="0.85" />
      <circle cx="50" cy="50" r="43" fill="none" stroke={tint} strokeWidth="1" opacity="0.35" />
    </svg>
  );
}
