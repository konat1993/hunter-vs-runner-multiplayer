import { Schema, type, MapSchema } from '@colyseus/schema';
import { PlayerState } from './PlayerState';

export class GameState extends Schema {
  @type('string') declare phase: string;
  @type('number') declare countdownMsRemaining: number;
  @type('number') declare matchMsRemaining: number;
  /** Grace period while opponent may reconnect (synced to waiting client). */
  @type('number') declare reconnectMsRemaining: number;
  @type('string') declare endReason: string;
  @type('string') declare winnerSessionId: string;
  @type('number') declare hunterCatchDistance: number;
  @type({ map: PlayerState }) declare players: MapSchema<PlayerState>;

  constructor() {
    super();
    this.phase = 'MATCHMAKING';
    this.countdownMsRemaining = 3000;
    this.matchMsRemaining = 120000;
    this.reconnectMsRemaining = 0;
    this.endReason = '';
    this.winnerSessionId = '';
    this.hunterCatchDistance = 1.2;
    this.players = new MapSchema<PlayerState>();
  }
}
