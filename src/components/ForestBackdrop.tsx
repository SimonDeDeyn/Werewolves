/**
 * Full-screen nighttime forest scene: moonlit sky, layered pine
 * silhouettes, and slowly drifting mist. Rendered behind every screen.
 */

// Deterministic pseudo-random so the treeline is stable across renders.
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function treelinePath(seed: number, baseY: number, minH: number, maxH: number): string {
  const rand = seeded(seed);
  const width = 1440;
  let x = -20;
  let d = `M ${x} ${baseY + 40}`;
  while (x < width + 20) {
    const half = 14 + rand() * 22;
    const h = minH + rand() * (maxH - minH);
    d += ` L ${x + half} ${baseY - h} L ${x + half * 2} ${baseY}`;
    x += half * 2;
  }
  d += ` L ${width + 40} ${baseY + 40} Z`;
  return d;
}

const FAR_TREES = treelinePath(7, 240, 60, 130);
const NEAR_TREES = treelinePath(23, 300, 90, 190);

export default function ForestBackdrop() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night-950">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 1440 320"
        preserveAspectRatio="xMidYMax slice"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="sky" cx="72%" cy="8%" r="90%">
            <stop offset="0%" stopColor="#1c2b1f" />
            <stop offset="45%" stopColor="#0e1a12" />
            <stop offset="100%" stopColor="#060b08" />
          </radialGradient>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0e9d2" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ddd2ac" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#ddd2ac" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="mistBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a7bfa4" stopOpacity="0" />
            <stop offset="50%" stopColor="#a7bfa4" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#a7bfa4" stopOpacity="0" />
          </linearGradient>
        </defs>

        <rect width="1440" height="320" fill="url(#sky)" />

        {/* Moon */}
        <circle cx="1040" cy="52" r="90" fill="url(#moonGlow)" />
        <circle cx="1040" cy="52" r="26" fill="#ece5cd" />
        <circle cx="1032" cy="46" r="5" fill="#d0c5a0" opacity="0.55" />
        <circle cx="1050" cy="60" r="3.5" fill="#d0c5a0" opacity="0.4" />

        {/* Treelines */}
        <path d={FAR_TREES} fill="#101b13" />
        <g className="mist-slow">
          <rect x="-200" y="200" width="1840" height="60" fill="url(#mistBand)" />
        </g>
        <path d={NEAR_TREES} fill="#080f0a" />
        <g className="mist">
          <rect x="-200" y="270" width="1840" height="50" fill="url(#mistBand)" />
        </g>
      </svg>

      {/* Ground fade so content sits on darkness, not on the SVG edge */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-night-950 to-transparent" />
    </div>
  );
}
