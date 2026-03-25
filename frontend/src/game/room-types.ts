export type Role = 'HUNTER' | 'RUNNER';
export type Phase = 'MATCHMAKING' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'ENDED';

export interface PlayerSnapshot {
  userId: string;
  email: string;
  role: Role;
  x: number;
  z: number;
  stamina: number;
  sprintReady: boolean;
  connected: boolean;
  lastProcessedInputSeq: number;
}

export interface GameRoomStateSnapshot {
  phase?: Phase;
  countdownMsRemaining?: number;
  matchMsRemaining?: number;
  endReason?: string;
  winnerSessionId?: string;
  players?: {
    forEach: (callback: (player: PlayerSnapshot, sessionId: string) => void) => void;
  };
}

export interface GameOverMessage {
  endReason: string;
  winnerSessionId: string;
}

export interface ServerErrorMessage {
  code?: string;
  message?: string;
}
