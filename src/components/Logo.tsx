/**
 * The Werewolves crest logo, drawn as vector so it stays crisp at any size.
 *
 *  - variant="emblem": just the ringed badge (moon + howling wolf + treeline).
 *    Used on the card back and anywhere a compact mark is needed.
 *  - variant="full": the emblem plus the "WEREWOLVES" wordmark and tagline.
 *    Used for branding / splash. Renders the wordmark in Cinzel (already loaded).
 */
interface LogoProps {
  variant?: "emblem" | "full";
  className?: string;
}

export default function Logo({ variant = "full", className }: LogoProps) {
  const full = variant === "full";
  return (
    <svg
      viewBox={full ? "0 0 300 340" : "26 16 248 248"}
      className={className}
      role="img"
      aria-label="Werewolves logo"
    >
      {/* Badge ring */}
      <circle cx="150" cy="140" r="118" fill="#0b140d" stroke="#b3a878" strokeWidth="2.5" />
      <circle cx="150" cy="140" r="108" fill="none" stroke="#557a5c" strokeWidth="1" opacity="0.5" />

      {/* Moon */}
      <circle cx="150" cy="126" r="66" fill="#ece5cd" opacity="0.14" />
      <circle cx="150" cy="126" r="56" fill="#e7ddbf" opacity="0.92" />
      <circle cx="128" cy="112" r="7" fill="#cdbf95" opacity="0.5" />
      <circle cx="168" cy="140" r="5" fill="#cdbf95" opacity="0.4" />

      {/* Howling wolf head, profile */}
      <path
        d="M150 210 C144 190 142 172 140 156 C139 146 134 139 130 132 L108 110 L119 106
           L138 120 C143 113 148 99 151 84 L160 62 L171 92 C175 108 176 126 174 141
           C172 162 167 188 162 210 Z"
        fill="#080f0a"
      />
      <path d="M119 110 L133 124 L122 124 Z" fill="#e7ddbf" opacity="0.9" />
      <circle cx="151" cy="126" r="2.8" fill="#e7ddbf" opacity="0.85" />

      {/* Treeline along the base of the ring */}
      <g fill="#0f1a12">
        <path d="M44 250 l10 -26 10 26 Z" />
        <path d="M60 250 l12 -34 12 34 Z" />
        <path d="M228 250 l10 -26 10 26 Z" />
        <path d="M246 250 l12 -32 12 32 Z" />
      </g>
      <path d="M44 252 q106 28 212 0" fill="none" stroke="#1e3023" strokeWidth="10" />

      {full && (
        <g fontFamily='"Cinzel", serif'>
          <text
            x="150"
            y="292"
            textAnchor="middle"
            fill="#f0e9d2"
            fontSize="31"
            fontWeight="700"
            letterSpacing="4"
          >
            WEREWOLVES
          </text>
          <line x1="72" y1="308" x2="120" y2="308" stroke="#557a5c" strokeWidth="1" />
          <line x1="180" y1="308" x2="228" y2="308" stroke="#557a5c" strokeWidth="1" />
          <text
            x="150"
            y="323"
            textAnchor="middle"
            fill="#b3a878"
            fontSize="10"
            letterSpacing="5"
          >
            THE VILLAGE WAKES
          </text>
        </g>
      )}
    </svg>
  );
}
