import type { Team } from "../data/characters";

/** Minimal woodcut-style silhouette per team. */
export default function TeamIcon({ team, className = "h-6 w-6" }: { team: Team; className?: string }) {
  switch (team) {
    case "werewolf":
      // Howling wolf head
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M4 18c0-3 1.5-5 3-6.5C8.5 10 9 8 9 6l2.5 2.5L14 4c.5 2 .3 4.2 1.8 5.8C17.5 11.5 20 13 20 16c0 2.5-2 4-4.5 4h-7C6 20 4 19.5 4 18z" />
          <circle cx="14.4" cy="13.2" r="0.9" fill="#0a120c" />
        </svg>
      );
    case "village":
      // Cottage with lit window
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M12 3 3 11h2v9h14v-9h2L12 3z" />
          <rect x="10" y="13" width="4" height="4" fill="#0a120c" />
        </svg>
      );
    case "solo":
      // Crescent moon
      return (
        <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
          <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" />
        </svg>
      );
  }
}
