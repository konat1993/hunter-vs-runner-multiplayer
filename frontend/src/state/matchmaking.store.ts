import { create } from 'zustand';
import type { Room } from '@colyseus/sdk';
import type { MapId } from '../game/obstacles';

type MatchmakingStatus = 'idle' | 'searching' | 'found' | 'timeout' | 'error';

interface MatchmakingState {
  status: MatchmakingStatus;
  elapsedSeconds: number;
  room: Room | null;
  errorMessage: string | null;
  selectedMapId: MapId;
  setStatus: (status: MatchmakingStatus) => void;
  setRoom: (room: Room | null) => void;
  setElapsed: (seconds: number) => void;
  setError: (message: string | null) => void;
  setSelectedMapId: (mapId: MapId) => void;
  reset: () => void;
}

export const useMatchmakingStore = create<MatchmakingState>((set) => ({
  status: 'idle',
  elapsedSeconds: 0,
  room: null,
  errorMessage: null,
  selectedMapId: 'classic',

  setStatus: (status) => set({ status }),
  setRoom: (room) => set({ room }),
  setElapsed: (seconds) => set({ elapsedSeconds: seconds }),
  setError: (message) => set({ errorMessage: message }),
  setSelectedMapId: (mapId) => set({ selectedMapId: mapId }),

  reset: () =>
    set({
      status: 'idle',
      elapsedSeconds: 0,
      room: null,
      errorMessage: null,
    }),
}));
