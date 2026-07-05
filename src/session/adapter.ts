/**
 * Session adapters decouple the game engine from how a game is shared.
 *
 * - LocalSession: pass-the-phone mode. State lives on this device only and
 *   is persisted to localStorage so an accidental refresh doesn't kill the game.
 * - OnlineSession (future): same interface backed by Firebase Realtime
 *   Database, mirroring the approach used in the Imposter app. Each player
 *   joins a lobby code on their own phone.
 */

import type { GameState } from "../engine/types";

export interface SessionAdapter {
  /** Current state snapshot. */
  getState(): GameState | null;
  /** Replace state (engine reducers produce the next state). */
  setState(next: GameState): void;
  /** Subscribe to state changes; returns an unsubscribe function. */
  subscribe(listener: (state: GameState) => void): () => void;
}

const STORAGE_KEY = "werewolves.localGame.v1";

export class LocalSession implements SessionAdapter {
  private state: GameState | null;
  private listeners = new Set<(state: GameState) => void>();

  constructor() {
    const raw = localStorage.getItem(STORAGE_KEY);
    this.state = raw ? (JSON.parse(raw) as GameState) : null;
  }

  getState(): GameState | null {
    return this.state;
  }

  setState(next: GameState): void {
    this.state = next;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    this.listeners.forEach((l) => l(next));
  }

  subscribe(listener: (state: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  clear(): void {
    this.state = null;
    localStorage.removeItem(STORAGE_KEY);
  }
}
