/**
 * Full-screen nighttime forest scene rendered behind every screen:
 * moonlit sky with drifting clouds and twinkling stars, layered spruce
 * silhouettes swaying in the wind, gnarled dead trees, crawling mist,
 * and wolf eyes glowing in and out of the dark treeline.
 *
 * Layout note: the scene is split into layers (sky gradient, stars, moon,
 * treeline) that are anchored independently, so nothing important gets
 * cropped away on tall or narrow viewports.
 *
 * Everything is generated deterministically from fixed seeds so the
 * forest is identical on every render.
 */

// Deterministic pseudo-random so the scene is stable across renders.
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/** A single spruce: stepped, drooping branch tiers instead of a plain triangle. */
function sprucePath(
  rand: () => number,
  cx: number,
  baseY: number,
  h: number,
  halfW: number,
): string {
  const tiers = 5 + Math.floor(rand() * 3);
  const topY = baseY - h;
  const tierH = (h * 0.85) / tiers;
  const pts: [number, number][] = [];

  // Left edge, top to bottom: drooping branch tip, then inner notch.
  for (let i = 1; i <= tiers; i++) {
    const y = topY + i * tierH;
    const w = halfW * (i / tiers) * (0.8 + rand() * 0.35);
    pts.push([cx - w, y + tierH * (0.2 + rand() * 0.4)]);
    pts.push([cx - w * 0.35, y + tierH * 0.08]);
  }
  const trunkW = Math.max(2, halfW * 0.09);
  pts.push([cx - trunkW, baseY], [cx + trunkW, baseY]);
  // Right edge, bottom to top (independent jitter keeps trees asymmetric).
  for (let i = tiers; i >= 1; i--) {
    const y = topY + i * tierH;
    const w = halfW * (i / tiers) * (0.8 + rand() * 0.35);
    pts.push([cx + w * 0.35, y + tierH * 0.08]);
    pts.push([cx + w, y + tierH * (0.2 + rand() * 0.4)]);
  }

  return (
    `M ${cx.toFixed(1)} ${topY.toFixed(1)} ` +
    pts.map(([x, y]) => `L ${x.toFixed(1)} ${y.toFixed(1)}`).join(" ") +
    " Z"
  );
}

/** A full treeline of overlapping spruces as one path. */
function treeline(
  seed: number,
  baseY: number,
  minH: number,
  maxH: number,
  minStep: number,
  maxStep: number,
): string {
  const rand = seeded(seed);
  const parts: string[] = [];
  let x = -30;
  while (x < 1480) {
    const h = minH + rand() * (maxH - minH);
    parts.push(sprucePath(rand, x, baseY + 4 + rand() * 10, h, h * (0.24 + rand() * 0.1)));
    x += minStep + rand() * (maxStep - minStep);
  }
  return parts.join(" ");
}

interface Limb {
  d: string;
  w: number;
}

/** A bare, twisted dead tree built from recursive crooked branches. */
function deadTree(seed: number, x0: number, baseY: number, h: number): Limb[] {
  const rand = seeded(seed);
  const limbs: Limb[] = [];
  const widths = [7, 4, 2.2, 1.2];

  const grow = (x: number, y: number, angle: number, len: number, depth: number) => {
    const steps = 3;
    let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    let cx = x;
    let cy = y;
    let a = angle;
    for (let s = 0; s < steps; s++) {
      a += (rand() - 0.5) * 0.7;
      const seg = len / steps;
      cx += Math.cos(a) * seg;
      cy -= Math.sin(a) * seg;
      d += ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`;
      // Fork partway along the limb.
      if (depth < widths.length - 1 && rand() < 0.75) {
        const side = rand() < 0.5 ? 1 : -1;
        grow(cx, cy, a + side * (0.5 + rand() * 0.7), len * (0.45 + rand() * 0.25), depth + 1);
      }
    }
    limbs.push({ d, w: widths[depth] });
  };

  grow(x0, baseY, Math.PI / 2 + (rand() - 0.5) * 0.2, h, 0);
  return limbs;
}

const FAR_TREES = treeline(7, 300, 70, 150, 26, 54);
const NEAR_TREES = treeline(23, 356, 120, 215, 46, 88);
const DEAD_LEFT = deadTree(41, 150, 356, 120);
const DEAD_RIGHT = deadTree(87, 1290, 356, 135);

const STARS = (() => {
  const rand = seeded(311);
  return Array.from({ length: 46 }, () => ({
    x: rand() * 100, // vw
    y: rand() * 38, // vh
    size: 1.5 + rand() * 1.6,
    delay: rand() * 7,
    dur: 3 + rand() * 5,
  }));
})();

// Wolf eyes lurking between the trunks: [x, y, animation delay in s]
const EYES: Array<[number, number, number]> = [
  [340, 336, 0],
  [762, 344, 6],
  [1132, 332, 12],
];

export default function ForestBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-night-950"
      aria-hidden="true"
    >
      {/* Sky */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_130%_90%_at_78%_-15%,#1a2a1e,#0d1811_45%,#050a07_100%)]" />

      {/* Stars */}
      {STARS.map((s, i) => (
        <div
          key={i}
          className="twinkle absolute rounded-full bg-moon-200"
          style={{
            left: `${s.x}vw`,
            top: `${s.y}vh`,
            width: s.size,
            height: s.size,
            animationDelay: `${s.delay}s`,
            animationDuration: `${s.dur}s`,
          }}
        />
      ))}

      {/* Moon with clouds crawling across it */}
      <svg
        className="absolute top-[-2%] right-[5%] w-44 sm:w-56"
        viewBox="0 0 220 160"
      >
        <defs>
          <radialGradient id="moonGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#f0e9d2" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#ddd2ac" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#ddd2ac" stopOpacity="0" />
          </radialGradient>
          <filter id="cloudBlur" x="-50%" y="-150%" width="200%" height="400%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          {/* Clouds are only visible where the moon backlights them */}
          <clipPath id="moonClip">
            <circle cx="110" cy="80" r="70" />
          </clipPath>
        </defs>
        <circle cx="110" cy="80" r="78" fill="url(#moonGlow)" />
        <circle cx="110" cy="80" r="30" fill="#ece5cd" />
        <circle cx="100" cy="72" r="6" fill="#cfc49e" opacity="0.6" />
        <circle cx="120" cy="89" r="4.5" fill="#cfc49e" opacity="0.45" />
        <circle cx="117" cy="68" r="2.8" fill="#cfc49e" opacity="0.35" />
        <g clipPath="url(#moonClip)" className="cloud-drift" opacity="0.55" filter="url(#cloudBlur)">
          <ellipse cx="95" cy="72" rx="85" ry="10" fill="#08100b" />
          <ellipse cx="140" cy="90" rx="65" ry="7" fill="#08100b" />
        </g>
      </svg>

      {/* A distant cloud bank */}
      <div className="cloud-drift-slow absolute top-[14%] left-[8%] h-3 w-2/5 rounded-full bg-[#0a130d] opacity-50 blur-md" />

      {/* Forest: anchored to the bottom, full scene always visible */}
      <svg
        className="absolute bottom-0 left-1/2 w-full min-w-[1250px] -translate-x-1/2"
        viewBox="0 0 1440 380"
      >
        <defs>
          <linearGradient id="mistBand" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#a7bfa4" stopOpacity="0" />
            <stop offset="50%" stopColor="#a7bfa4" stopOpacity="0.11" />
            <stop offset="100%" stopColor="#a7bfa4" stopOpacity="0" />
          </linearGradient>
          <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#e8c15a" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#e8c15a" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Far treeline */}
        <path d={FAR_TREES} fill="#111d14" />

        <g className="mist-slow">
          <rect x="-200" y="240" width="1840" height="70" fill="url(#mistBand)" />
        </g>

        {/* Near treeline, swaying faintly in the wind */}
        <g className="sway">
          <path d={NEAR_TREES} fill="#070d09" />
        </g>

        {/* Bare dead trees at the forest's edge */}
        <g className="sway-slow" fill="none" stroke="#040805" strokeLinecap="round">
          {[...DEAD_LEFT, ...DEAD_RIGHT].map((limb, i) => (
            <path key={i} d={limb.d} strokeWidth={limb.w} />
          ))}
        </g>

        {/* Eyes in the dark */}
        {EYES.map(([x, y, delay], i) => (
          <g key={i} className="eyes" style={{ animationDelay: `${delay}s` }}>
            <circle cx={x} cy={y} r="14" fill="url(#eyeGlow)" />
            <circle cx={x + 11} cy={y} r="14" fill="url(#eyeGlow)" />
            <ellipse cx={x} cy={y} rx="3.4" ry="2.4" fill="#eccb63" />
            <ellipse cx={x + 11} cy={y} rx="3.4" ry="2.4" fill="#eccb63" />
          </g>
        ))}

        <g className="mist">
          <rect x="-200" y="316" width="1840" height="60" fill="url(#mistBand)" />
        </g>
      </svg>

      {/* Ground fade + vignette so the darkness closes in at the edges */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-night-950 to-transparent" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(3,6,4,0.65)_100%)]" />
    </div>
  );
}
