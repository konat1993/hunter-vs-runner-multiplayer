import { create } from 'zustand';
import type { Room } from '@colyseus/sdk';

type MatchmakingStatus = 'idle' | 'searching' | 'found' | 'timeout' | 'error';

interface MatchmakingState {
  status: MatchmakingStatus;
  elapsedSeconds: number;
  room: Room | null;
  errorMessage: string | null;
  setStatus: (status: MatchmakingStatus) => void;
  setRoom: (room: Room | null) => void;
  setElapsed: (seconds: number) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

export const useMatchmakingStore = create<MatchmakingState>((set) => ({
  status: 'idle',
  elapsedSeconds: 0,
  room: null,
  errorMessage: null,

  setStatus: (status) => set({ status }),
  setRoom: (room) => set({ room }),
  setElapsed: (seconds) => set({ elapsedSeconds: seconds }),
  setError: (message) => set({ errorMessage: message }),

  reset: () => set({
    status: 'idle',
    elapsedSeconds: 0,
    room: null,
    errorMessage: null,
  }),
}));
