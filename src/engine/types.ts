/**
 * Core game-state types. The engine is pure data + functions with no UI or
 * networking, so the same logic drives both play modes:
 *  - pass-the-phone (local session, one device)
 *  - online lobby (Firebase adapter, one device per player — future phase)
 */

import type { Character } from "../data/characters";

export type Phase =
  | "lobby" // entering player names, picking roles
  | "reveal" // players privately view their role
  | "night" // narrator steps through the night sequence
  | "day" // discussion and vote
  | "ended";

export interface Player {
  id: string;
  name: string;
  characterId: Character["id"];
  alive: boolean;
  /** Cross-cutting statuses (lover, charmed, infected, doused, sheriff...). */
  tags: string[];
}

export interface NightAction {
  night: number;
  characterId: Character["id"];
  /** Actor player id (null for collective actions like the wolf kill). */
  actorId: string | null;
  targetIds: string[];
  /** Role-specific choice, e.g. "heal" | "poison" for the Witch. */
  choice?: string;
}

export interface GameState {
  phase: Phase;
  /** Night/day counter; night 1 is the first night. */
  round: number;
  players: Player[];
  /** Log of everything that happened, for recaps and undo. */
  actions: NightAction[];
  /** Ids of roles whose once-per-game power is spent. */
  spentPowers: Character["id"][];
}
