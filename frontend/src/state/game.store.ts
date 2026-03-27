import { create } from 'zustand';
import type { Room } from '@colyseus/sdk';

export interface PlayerTransform {
  x: number;
  z: number;
  vx: number;
  vz: number;
  stamina: number;
  sprintReady: boolean;
}

export interface RemotePlayerState {
  sessionId: string;
  userId: string;
  email: string;
  role: string;
  x: number;
  z: number;
  stamina: number;
  connected: boolean;
}

interface GameState {
  room: Room | null;
  phase: string;
  localSessionId: string | null;
  localRole: string | null;
  localTransform: PlayerTransform;
  remotePlayers: Map<string, RemotePlayerState>;
  countdownMs: number;
  matchMs: number;
  reconnectMs: number;
  endReason: string | null;
  winnerSessionId: string | null;
  setRoom: (room: Room | null) => void;
  setPhase: (phase: string) => void;
  setLocalSession: (sessionId: string, role: string) => void;
  setLocalTransform: (transform: Partial<PlayerTransform>) => void;
  updateRemotePlayer: (player: RemotePlayerState) => void;
  removeRemotePlayer: (sessionId: string) => void;
  setTimers: (countdownMs: number, matchMs: number, reconnectMs?: number) => void;
  setEnded: (endReason: string, winnerSessionId: string) => void;
  reset: () => void;
}

const defaultTransform: PlayerTransform = {
  x: 0,
  z: 0,
  vx: 0,
  vz: 0,
  stamina: 100,
  sprintReady: true,
};

export const useGameStore = create<GameState>((set) => ({
  room: null,
  phase: 'MATCHMAKING',
  localSessionId: null,
  localRole: null,
  localTransform: { ...defaultTransform },
  remotePlayers: new Map(),
  countdownMs: 3000,
  matchMs: 120000,
  reconnectMs: 0,
  endReason: null,
  winnerSessionId: null,

  setRoom: (room) => set({ room }),
  setPhase: (phase) => set({ phase }),

  setLocalSession: (sessionId, role) => set({
    localSessionId: sessionId,
    localRole: role,
  }),

  setLocalTransform: (transform) => set((state) => ({
    localTransform: { ...state.localTransform, ...transform },
  })),

  updateRemotePlayer: (player) => set((state) => {
    const next = new Map(state.remotePlayers);
    next.set(player.sessionId, player);
    return { remotePlayers: next };
  }),

  removeRemotePlayer: (sessionId) => set((state) => {
    const next = new Map(state.remotePlayers);
    next.delete(sessionId);
    return { remotePlayers: next };
  }),

  setTimers: (countdownMs, matchMs, reconnectMs = 0) =>
    set({ countdownMs, matchMs, reconnectMs }),

  setEnded: (endReason, winnerSessionId) => set({
    phase: 'ENDED',
    endReason,
    winnerSessionId,
  }),

  reset: () => set({
    room: null,
    phase: 'MATCHMAKING',
    localSessionId: null,
    localRole: null,
    localTransform: { ...defaultTransform },
    remotePlayers: new Map(),
    countdownMs: 3000,
    matchMs: 120000,
    reconnectMs: 0,
    endReason: null,
    winnerSessionId: null,
  }),
}));
