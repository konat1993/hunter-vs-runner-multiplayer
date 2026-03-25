export const Phase = {
  MATCHMAKING: 'MATCHMAKING',
  COUNTDOWN: 'COUNTDOWN',
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  ENDED: 'ENDED',
} as const;

export type PhaseType = (typeof Phase)[keyof typeof Phase];

export const Role = {
  HUNTER: 'HUNTER',
  RUNNER: 'RUNNER',
} as const;

export type RoleType = (typeof Role)[keyof typeof Role];
