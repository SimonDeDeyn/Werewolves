/**
 * The table: player tokens arranged in a circle in seating order. Dead players
 * are dimmed and crossed; when interactive, tapping a living player toggles a
 * selection (used to mark who was eliminated this round).
 */
export default function PlayerCircle({
  players,
  dead,
  selected = [],
  soaked = [],
  charmed = [],
  defended = [],
  cursed = [],
  onToggle,
  centerLabel,
}: {
  players: string[];
  dead: string[];
  selected?: string[];
  /** Pyromaniac's oil-soaked houses — badged with a flame. */
  soaked?: string[];
  /** Piper's charmed players — badged with a music note. */
  charmed?: string[];
  /** The Defender's protected player — badged with a shield. */
  defended?: string[];
  /** The Raven's cursed player — badged with "+2" extra votes for the day. */
  cursed?: string[];
  onToggle?: (name: string) => void;
  centerLabel?: string;
}) {
  const n = players.length;

  return (
    <div className="relative mx-auto aspect-square w-[min(340px,86vw)]">
      {/* Table ring */}
      <div className="absolute inset-[14%] rounded-full border border-pine-500/40 bg-night-900/30" />
      {centerLabel && (
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-sm tracking-[0.3em] text-moss-300 uppercase">
            {centerLabel}
          </span>
        </div>
      )}

      {players.map((name, i) => {
        const angle = (-90 + (i * 360) / n) * (Math.PI / 180);
        const x = 50 + 38 * Math.cos(angle);
        const y = 50 + 38 * Math.sin(angle);
        const isDead = dead.includes(name);
        const isSel = selected.includes(name);
        const isSoaked = soaked.includes(name) && !isDead;
        const isCharmed = charmed.includes(name) && !isDead;
        const isDefended = defended.includes(name) && !isDead;
        const isCursed = cursed.includes(name) && !isDead;
        const interactive = !!onToggle && !isDead;

        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onToggle!(name)}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <span
              className={`relative grid h-11 w-11 place-items-center rounded-full border font-display text-base transition-colors ${
                isDead
                  ? "border-blood-700 bg-night-800 text-moss-400 opacity-70"
                  : isSel
                    ? "border-blood-500 bg-blood-700/40 text-moon-100 ring-2 ring-blood-500"
                    : "border-moss-400/60 bg-pine-600 text-moon-100"
              }`}
            >
              {name.charAt(0).toUpperCase()}
              {isDead && (
                <svg
                  className="pointer-events-none absolute inset-0 h-full w-full"
                  viewBox="0 0 40 40"
                  aria-hidden="true"
                >
                  <line x1="7" y1="8" x2="33" y2="32" stroke="#b3271e" strokeWidth="3.5" strokeLinecap="round" />
                  <line x1="33" y1="8" x2="7" y2="32" stroke="#b3271e" strokeWidth="3.5" strokeLinecap="round" />
                </svg>
              )}
              {/* Status badges, one per corner so several can show at once. */}
              {isSoaked && (
                <span className="pointer-events-none absolute -top-1.5 -left-1.5 grid h-4 w-4 place-items-center rounded-full bg-night-950 text-[0.6rem] leading-none ring-1 ring-pine-500">
                  🔥
                </span>
              )}
              {isDefended && (
                <span className="pointer-events-none absolute -top-1.5 -right-1.5 grid h-4 w-4 place-items-center rounded-full bg-night-950 text-[0.6rem] leading-none ring-1 ring-pine-500">
                  🛡️
                </span>
              )}
              {isCharmed && (
                <span className="pointer-events-none absolute -right-1.5 -bottom-1.5 grid h-4 w-4 place-items-center rounded-full bg-night-950 text-[0.6rem] leading-none ring-1 ring-pine-500">
                  🎵
                </span>
              )}
              {isCursed && (
                <span className="pointer-events-none absolute -bottom-1.5 -left-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-blood-700 px-0.5 text-[0.55rem] leading-none font-semibold text-moon-100 ring-1 ring-blood-500">
                  +2
                </span>
              )}
            </span>
            <span
              className={`max-w-[4.5rem] truncate text-[0.7rem] ${
                isDead ? "text-moss-400 line-through" : "text-moss-200"
              }`}
            >
              {name}
            </span>
          </button>
        );
      })}
    </div>
  );
}
