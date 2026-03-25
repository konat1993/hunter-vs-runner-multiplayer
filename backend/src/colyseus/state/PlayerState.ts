import { Schema, type } from '@colyseus/schema';

export class PlayerState extends Schema {
  @type('string') declare sessionId: string;
  @type('string') declare userId: string;
  @type('string') declare email: string;
  @type('string') declare role: string;
  @type('boolean') declare connected: boolean;
  @type('number') declare x: number;
  @type('number') declare z: number;
  @type('number') declare vx: number;
  @type('number') declare vz: number;
  @type('number') declare stamina: number;
  @type('boolean') declare sprintReady: boolean;
  @type('number') declare lastProcessedInputSeq: number;

  constructor() {
    super();
    this.sessionId = '';
    this.userId = '';
    this.email = '';
    this.role = '';
    this.connected = true;
    this.x = 0;
    this.z = 0;
    this.vx = 0;
    this.vz = 0;
    this.stamina = 100;
    this.sprintReady = true;
    this.lastProcessedInputSeq = 0;
  }
}
