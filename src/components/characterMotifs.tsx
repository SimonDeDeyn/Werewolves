/**
 * Woodcut-style emblem motifs used by CharacterPortrait as the generated
 * fallback "head" for each role (until real illustrated art is dropped in).
 *
 * Each motif draws inside a 100x100 box. The silhouette uses `currentColor`
 * (tinted per team by the portrait frame); cut-outs like eyes use CUT so they
 * read as holes against the medallion background.
 *
 * MOTIF_BY_ID maps every character id to a motif key. Several wolves share the
 * "wolf" motif and are differentiated by their team tint in the frame — these
 * are intentional stylized emblems, not unique illustrations.
 */
import type { ReactNode } from "react";

const CUT = "#0c140d";

export const MOTIFS: Record<string, ReactNode> = {
  wolf: (
    <>
      <path
        d="M50 78 L38 60 Q26 54 28 38 L23 24 L37 33 Q43 29 50 29 Q57 29 63 33 L77 24 L72 38 Q74 54 62 60 Z"
        fill="currentColor"
      />
      <path d="M42 45 l5 3 -5 2 Z" fill={CUT} />
      <path d="M58 45 l-5 3 5 2 Z" fill={CUT} />
      <path d="M50 64 l4 6 -8 0 Z" fill={CUT} />
    </>
  ),
  eye: (
    <>
      <path d="M18 50 Q50 28 82 50 Q50 72 18 50 Z" fill="currentColor" />
      <circle cx="50" cy="50" r="11" fill={CUT} />
      <circle cx="50" cy="50" r="4.5" fill="currentColor" />
      <path
        d="M50 22 v-7 M50 78 v7 M22 34 l-5 -4 M78 34 l5 -4 M22 66 l-5 4 M78 66 l5 4"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </>
  ),
  witch: (
    <>
      <path d="M60 20 L54 42 L48 60 L40 60 Q46 38 50 30 Q54 22 60 20 Z" fill="currentColor" />
      <path d="M22 62 Q50 52 78 62 Q50 74 22 62 Z" fill="currentColor" />
      <rect x="41" y="55" width="16" height="5" fill={CUT} transform="rotate(-6 49 57)" />
    </>
  ),
  hood: (
    <>
      <path
        d="M27 74 L27 47 Q27 28 50 28 Q73 28 73 47 L73 74 L61 74 L61 50 Q61 41 50 41 Q39 41 39 50 L39 74 Z"
        fill="currentColor"
      />
      <ellipse cx="50" cy="52" rx="9" ry="11" fill={CUT} />
    </>
  ),
  crown: (
    <>
      <path d="M24 66 L29 38 L40 53 L50 32 L60 53 L71 38 L76 66 Z" fill="currentColor" />
      <rect x="24" y="66" width="52" height="8" fill="currentColor" />
      <circle cx="50" cy="46" r="3" fill={CUT} />
      <circle cx="34" cy="52" r="2.5" fill={CUT} />
      <circle cx="66" cy="52" r="2.5" fill={CUT} />
    </>
  ),
  shield: (
    <>
      <path d="M50 20 L76 29 Q76 58 50 78 Q24 58 24 29 Z" fill="currentColor" />
      <path d="M50 30 V66 M36 44 H64" stroke={CUT} strokeWidth="4" strokeLinecap="round" />
    </>
  ),
  cupid: (
    <>
      <path
        d="M50 72 C28 55 30 33 44 33 Q50 33 50 43 Q50 33 56 33 C70 33 72 55 50 72 Z"
        fill="currentColor"
      />
      <path d="M20 28 L80 62" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M80 62 l-9 -1 4 8 Z" fill="currentColor" />
      <path d="M20 28 l7 -3 -1 8 Z" fill="currentColor" />
    </>
  ),
  bear: (
    <>
      <circle cx="34" cy="34" r="11" fill="currentColor" />
      <circle cx="66" cy="34" r="11" fill="currentColor" />
      <circle cx="50" cy="54" r="23" fill="currentColor" />
      <circle cx="50" cy="60" r="9" fill={CUT} />
      <circle cx="42" cy="49" r="2.6" fill={CUT} />
      <circle cx="58" cy="49" r="2.6" fill={CUT} />
    </>
  ),
  raven: (
    <>
      <path
        d="M26 60 Q30 40 52 42 Q64 43 70 34 L66 48 Q74 50 74 56 Q60 68 42 65 Q30 63 26 60 Z"
        fill="currentColor"
      />
      <path d="M70 34 L86 38 L70 44 Z" fill="currentColor" />
      <circle cx="58" cy="48" r="2.4" fill={CUT} />
    </>
  ),
  rooster: (
    <>
      <path d="M40 26 q6 -6 12 0 q6 -6 12 2 q-4 6 -10 5 q4 6 -2 10 Z" fill="currentColor" />
      <path
        d="M34 58 Q32 40 52 38 Q66 37 66 50 Q66 66 48 68 Q36 68 34 58 Z"
        fill="currentColor"
      />
      <path d="M34 48 L20 50 L34 54 Z" fill="currentColor" />
      <path d="M50 66 q-4 10 4 14 q6 -10 -4 -14 Z" fill="currentColor" />
      <circle cx="52" cy="46" r="2.4" fill={CUT} />
    </>
  ),
  goat: (
    <>
      <path d="M40 46 Q40 70 50 74 Q60 70 60 46 Z" fill="currentColor" />
      <path d="M40 46 Q28 34 34 22 Q40 32 46 44 Z" fill="currentColor" />
      <path d="M60 46 Q72 34 66 22 Q60 32 54 44 Z" fill="currentColor" />
      <path d="M46 74 L50 84 L54 74 Z" fill="currentColor" />
      <circle cx="45" cy="52" r="2.4" fill={CUT} />
      <circle cx="55" cy="52" r="2.4" fill={CUT} />
    </>
  ),
  flame: (
    <>
      <path
        d="M50 20 C62 40 70 46 62 62 Q55 74 50 74 Q45 74 38 62 C31 49 46 47 44 32 C49 39 46 28 50 20 Z"
        fill="currentColor"
      />
      <path d="M50 44 C55 52 56 58 50 66 Q46 60 48 52 Q49 48 50 44 Z" fill={CUT} />
    </>
  ),
  ghost: (
    <>
      <path
        d="M28 74 L28 46 Q28 24 50 24 Q72 24 72 46 L72 74 L63 67 L54 74 L46 67 L37 74 Z"
        fill="currentColor"
      />
      <circle cx="42" cy="46" r="3.4" fill={CUT} />
      <circle cx="58" cy="46" r="3.4" fill={CUT} />
    </>
  ),
  mask: (
    <>
      <path
        d="M32 30 Q68 30 68 48 Q68 72 50 74 Q32 72 32 48 Q32 30 32 30 Z"
        fill="currentColor"
      />
      <path d="M40 46 q5 -5 10 0 Z" fill={CUT} />
      <path d="M50 46 q5 -5 10 0 Z" fill={CUT} />
      <path d="M40 60 Q50 68 60 60" stroke={CUT} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
  crystal: (
    <>
      <circle cx="50" cy="46" r="22" fill="currentColor" />
      <path d="M34 68 Q50 78 66 68 L62 63 L38 63 Z" fill="currentColor" />
      <path d="M42 40 l4 4 -4 4 -4 -4 Z" fill={CUT} />
      <circle cx="58" cy="52" r="3" fill={CUT} />
    </>
  ),
  sword: (
    <>
      <path d="M46 16 L54 16 L52 58 L48 58 Z" fill="currentColor" />
      <path d="M50 12 L54 16 L46 16 Z" fill="currentColor" />
      <rect x="34" y="58" width="32" height="6" rx="2" fill="currentColor" />
      <rect x="47" y="64" width="6" height="16" fill="currentColor" />
      <circle cx="50" cy="82" r="4" fill="currentColor" />
    </>
  ),
  angel: (
    <>
      <ellipse cx="50" cy="22" rx="14" ry="4" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="38" r="10" fill="currentColor" />
      <path d="M50 50 Q26 46 18 64 Q40 58 50 68 Q60 58 82 64 Q74 46 50 50 Z" fill="currentColor" />
    </>
  ),
  flute: (
    <>
      <path d="M22 70 L64 26 L70 32 L28 76 Z" fill="currentColor" />
      <circle cx="40" cy="52" r="2.6" fill={CUT} />
      <circle cx="48" cy="44" r="2.6" fill={CUT} />
      <circle cx="56" cy="36" r="2.6" fill={CUT} />
      <circle cx="74" cy="66" r="6" fill="currentColor" />
    </>
  ),
  badge: (
    <path
      d="M50 18 L59 40 L83 40 L64 55 L71 78 L50 64 L29 78 L36 55 L17 40 L41 40 Z"
      fill="currentColor"
    />
  ),
  gavel: (
    <>
      <rect x="30" y="30" width="26" height="16" rx="3" fill="currentColor" transform="rotate(40 43 38)" />
      <rect x="50" y="46" width="7" height="28" fill="currentColor" transform="rotate(40 53 60)" />
      <rect x="30" y="76" width="40" height="6" rx="2" fill="currentColor" />
    </>
  ),
  dagger: (
    <>
      <path d="M28 24 L40 36 L34 42 L22 30 Z" fill="currentColor" />
      <path d="M40 36 L74 70 L70 74 L36 40 Z" fill="currentColor" />
      <rect x="30" y="30" width="20" height="5" rx="2" fill="currentColor" transform="rotate(45 40 32)" />
    </>
  ),
  jester: (
    <>
      <path
        d="M28 50 Q26 30 50 32 Q74 30 72 50 Q62 42 60 28 Q54 36 50 30 Q46 36 40 28 Q38 42 28 50 Z"
        fill="currentColor"
      />
      <circle cx="26" cy="52" r="5" fill="currentColor" />
      <circle cx="74" cy="52" r="5" fill="currentColor" />
      <circle cx="50" cy="30" r="4" fill="currentColor" />
    </>
  ),
  thief: (
    <>
      <path d="M30 40 Q50 30 70 40 L70 46 Q50 40 30 46 Z" fill="currentColor" />
      <path
        d="M32 48 L68 48 L64 62 L54 60 Q50 66 46 60 L36 62 Z"
        fill="currentColor"
      />
      <circle cx="43" cy="54" r="2.6" fill={CUT} />
      <circle cx="57" cy="54" r="2.6" fill={CUT} />
    </>
  ),
  child: (
    <>
      <circle cx="50" cy="48" r="16" fill="currentColor" />
      <circle cx="30" cy="48" r="7" fill="currentColor" />
      <circle cx="70" cy="48" r="7" fill="currentColor" />
      <path d="M42 30 Q50 22 58 30 Q50 34 42 30 Z" fill="currentColor" />
      <circle cx="44" cy="47" r="2.4" fill={CUT} />
      <circle cx="56" cy="47" r="2.4" fill={CUT} />
    </>
  ),
  sisters: (
    <>
      <path d="M20 74 L20 52 Q20 38 36 38 Q52 38 52 52 L52 74 Z" fill="currentColor" />
      <path d="M48 74 L48 50 Q48 34 66 34 Q84 34 84 50 L84 74 Z" fill="currentColor" />
      <ellipse cx="36" cy="54" rx="6" ry="7" fill={CUT} />
      <ellipse cx="66" cy="52" rx="6" ry="7" fill={CUT} />
    </>
  ),
  elder: (
    <>
      <path d="M34 44 Q34 26 50 26 Q66 26 66 44 Z" fill="currentColor" />
      <path d="M36 44 L64 44 Q62 78 50 82 Q38 78 36 44 Z" fill="currentColor" />
      <circle cx="44" cy="46" r="2.4" fill={CUT} />
      <circle cx="56" cy="46" r="2.4" fill={CUT} />
    </>
  ),
  doppel: (
    <>
      <path d="M27 74 L27 47 Q27 28 50 28 L50 74 Z" fill="currentColor" opacity="0.95" />
      <path d="M73 74 L73 47 Q73 28 50 28 L50 74 Z" fill="currentColor" opacity="0.6" />
      <circle cx="40" cy="50" r="3" fill={CUT} />
      <path d="M60 47 l6 3 -6 3 Z" fill={CUT} />
    </>
  ),
  cult: (
    <>
      <path d="M50 18 L72 74 L28 74 Z" fill="currentColor" />
      <path d="M50 40 Q58 48 50 56 Q42 48 50 40 Z" fill={CUT} />
      <circle cx="50" cy="48" r="2.6" fill="currentColor" />
    </>
  ),
  bell: (
    <>
      <path d="M50 24 Q39 24 39 46 L33 56 Q50 64 67 56 L61 46 Q61 24 50 24 Z" fill="currentColor" />
      <circle cx="50" cy="66" r="4" fill="currentColor" />
      <rect x="47" y="16" width="6" height="8" rx="3" fill="currentColor" />
    </>
  ),
  candle: (
    <>
      <rect x="42" y="40" width="16" height="38" rx="2" fill="currentColor" />
      <path d="M50 20 C57 30 58 36 50 42 Q44 37 46 30 Q48 26 50 20 Z" fill="currentColor" />
      <rect x="36" y="76" width="28" height="6" rx="2" fill="currentColor" />
    </>
  ),
  swap: (
    <>
      <path
        d="M30 40 A22 22 0 0 1 70 34"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M70 34 l-3 -9 -8 5 Z" fill="currentColor" />
      <path
        d="M70 60 A22 22 0 0 1 30 66"
        fill="none"
        stroke="currentColor"
        strokeWidth="6"
        strokeLinecap="round"
      />
      <path d="M30 66 l3 9 8 -5 Z" fill="currentColor" />
    </>
  ),
};

/** Every character id → motif key. */
export const MOTIF_BY_ID: Record<string, string> = {
  villager: "hood",
  sleepwalker: "candle",
  seer: "eye",
  witch: "witch",
  hunter: "badge",
  "little-girl": "child",
  cupid: "cupid",
  defender: "shield",
  elder: "elder",
  scapegoat: "goat",
  fox: "wolf",
  sheriff: "badge",
  "rusty-sword-knight": "sword",
  "stuttering-judge": "gavel",
  "two-sisters": "sisters",
  "three-brothers": "sisters",
  "wild-child": "child",
  "bear-tamer": "bear",
  prince: "crown",
  servant: "swap",
  gypsy: "crystal",
  actor: "mask",
  "village-idiot": "jester",
  raven: "raven",
  "rabble-rouser": "bell",
  "town-crier": "bell",
  "double-agent": "dagger",
  grandmother: "elder",
  rooster: "rooster",
  werewolf: "wolf",
  "big-bad-wolf": "wolf",
  "white-werewolf": "wolf",
  "werewolf-cub": "wolf",
  "accursed-wolf-father": "wolf",
  "vile-doppelganger": "doppel",
  traitor: "dagger",
  angel: "angel",
  thief: "thief",
  pyromaniac: "flame",
  piper: "flute",
  "devoted-servant": "candle",
  "abominable-sectarian": "cult",
  ghost: "ghost",
};
