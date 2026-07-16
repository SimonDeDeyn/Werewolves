/**
 * Local save/resume for an in-progress pass-and-play game. The whole game lives
 * in one localStorage slot: the dealt setup plus the NightPhase state Snapshot.
 * Everything is wrapped in try/catch so a locked-down WebView (private mode,
 * storage disabled) degrades to "no save" rather than crashing.
 */
import type { Assignment } from "./setup";
import type { Snapshot } from "../screens/passAndPlay/NightPhase";

const KEY = "werewolves:savedGame:v1";

export interface SavedGame {
  assignments: Assignment[];
  board: Assignment[];
  middleCards: string[];
  actorCards: string[];
  /** The full NightPhase mutable state (shape owned by NightPhase). */
  state: Snapshot;
}

export function loadGame(): SavedGame | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const g = JSON.parse(raw);
    // Guard against a corrupt or half-written blob.
    if (!g || !Array.isArray(g.assignments) || !g.state) return null;
    return g as SavedGame;
  } catch {
    return null;
  }
}

export function saveGame(game: SavedGame): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(game));
  } catch {
    /* storage unavailable — resume simply won't be offered */
  }
}

export function clearGame(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}
