import { Room, type Client, CloseCode } from '@colyseus/core';
import { GameState } from '../state/GameState';
import { PlayerState } from '../state/PlayerState';
import { Role, Phase } from '../state/types';
import { applyMovement } from '../logic/movement';
import { updateStamina } from '../logic/stamina';
import { CatchDetector } from '../logic/catch';
import { getSpawnPositions } from '../logic/spawns';
import { SupabaseService } from '../../supabase/supabase.service';
import { getMapDefinition, type MapId } from '../../map-config';

interface InputPayload {
  seq: number;
  dirX: number;
  dirZ: number;
  sprint: boolean;
  dtMs: number;
}

interface AuthResult {
  userId: string;
  email: string;
}

const RECONNECT_GRACE_SECONDS = 30;

export class GameRoom extends Room<{ state: GameState }> {
  private static activeRoomByUserId = new Map<string, string>();
  private static roomById = new Map<string, GameRoom>();

  maxClients = 2;
  patchRate = 33;
  autoDispose = true;

  state = new GameState();

  private supabase!: SupabaseService;
  private catchDetector = new CatchDetector();
  private elapsedMs = 0;
  private matchmakingTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectedSessionId: string | null = null;
  private explicitQuitSessionIds = new Set<string>();
  private pendingInputs = new Map<string, InputPayload[]>();
  private lastInputBySession = new Map<string, InputPayload>();
  private countdownInterval: ReturnType<typeof setInterval> | null = null;
  private mapId!: MapId;

  static getActiveRoomIdForUser(userId: string): string | null {
    const roomId = this.activeRoomByUserId.get(userId);
    if (!roomId) return null;

    const room = this.roomById.get(roomId);
    if (!room || room.state.phase === Phase.ENDED) {
      this.activeRoomByUserId.delete(userId);
      return null;
    }

    return roomId;
  }

  onCreate(options: { supabase: SupabaseService; mapId: MapId }) {
    this.supabase = options.supabase;
    this.mapId = options.mapId;
    this.state.mapId = options.mapId;
    const mapDef = getMapDefinition(this.mapId);
    this.state.hunterCatchDistance = mapDef.hunterCatchDistance;
    this.state.phase = Phase.MATCHMAKING;
    GameRoom.roomById.set(this.roomId, this);
    console.log(`[GameRoom:${this.roomId}] created`);

    // Matchmaking timeout: 30s
    this.matchmakingTimer = setTimeout(() => {
      if (this.clients.length < 2) {
        this.broadcast('server:error', {
          code: 'TIMEOUT',
          message: 'No opponent found.',
        });
        this.state.phase = Phase.ENDED;
        this.state.endReason = 'TIMEOUT';
        void this.lock();

        // Room#disconnect() can throw when called from this timeout path on this Colyseus version.
        // Closing connected clients directly is enough; autoDispose will clean up the room.
        [...this.clients].forEach((client) => client.leave());
      }
    }, 30000);

    this.setSimulationInterval((dtMs) => this.update(dtMs), 1000 / 60);

    this.onMessage('player:input', (client: Client, input: InputPayload) => {
      if (this.state.phase !== Phase.RUNNING) return;
      const queue = this.pendingInputs.get(client.sessionId) ?? [];
      queue.push(input);
      this.pendingInputs.set(client.sessionId, queue);
      this.lastInputBySession.set(client.sessionId, input);
    });

    this.onMessage('player:ready', () => {
      // Both players confirm ready — optional
    });

    this.onMessage('player:quit', (client: Client) => {
      this.explicitQuitSessionIds.add(client.sessionId);
      if (
        this.state.phase !== Phase.RUNNING &&
        this.state.phase !== Phase.COUNTDOWN &&
        this.state.phase !== Phase.PAUSED
      ) {
        return;
      }

      const opponentSessionId = this.getOpponentSessionId(client.sessionId);
      if (!opponentSessionId) return;
      void this.endGame('FORFEIT', opponentSessionId, client.sessionId);
    });
  }

  async onJoin(client: Client, options: { accessToken?: string }) {
    if (!options?.accessToken) {
      throw new Error('Access token required');
    }
    const user = await this.supabase.verifyToken(options.accessToken);
    const auth: AuthResult = { userId: user.id, email: user.email ?? '' };

    await this.supabase.upsertUser(auth.userId, auth.email);

    let reclaimedSessionId: string | null = null;
    this.state.players.forEach((player, sessionId) => {
      if (player.userId === auth.userId) reclaimedSessionId = sessionId;
    });

    if (reclaimedSessionId) {
      if (this.state.phase === Phase.ENDED) {
        throw new Error('Game already finished');
      }

      const existing = this.state.players.get(reclaimedSessionId);
      if (!existing) throw new Error('Unable to restore player session');
      if (existing.connected) {
        if (this.state.phase !== Phase.PAUSED) {
          throw new Error('User already connected to this match');
        }
        // During PAUSED, previous socket state may still be marked connected briefly.
        // Allow reclaim to avoid forcing repeated manual retries by the user.
        existing.connected = false;
      }

      this.state.players.delete(reclaimedSessionId);
      existing.sessionId = client.sessionId;
      existing.email = auth.email;
      existing.connected = true;
      this.state.players.set(client.sessionId, existing);

      const queued = this.pendingInputs.get(reclaimedSessionId) ?? [];
      this.pendingInputs.delete(reclaimedSessionId);
      this.pendingInputs.set(client.sessionId, queued);
      const lastInput = this.lastInputBySession.get(reclaimedSessionId);
      this.lastInputBySession.delete(reclaimedSessionId);
      this.lastInputBySession.set(
        client.sessionId,
        lastInput ?? {
          seq: 0,
          dirX: 0,
          dirZ: 0,
          sprint: false,
          dtMs: 0,
        },
      );
      if (this.explicitQuitSessionIds.has(reclaimedSessionId)) {
        this.explicitQuitSessionIds.delete(reclaimedSessionId);
      }

      if (this.disconnectedSessionId === reclaimedSessionId) {
        // Rebind tracked disconnected session to the newly joined session id,
        // otherwise finishReconnectionWindow() guard treats it as mismatch.
        this.disconnectedSessionId = client.sessionId;
        this.finishReconnectionWindow(client.sessionId);
      }
    } else {
      if (this.state.phase !== Phase.MATCHMAKING) {
        throw new Error('Game already in progress');
      }

      const player = new PlayerState();
      player.sessionId = client.sessionId;
      player.userId = auth.userId;
      player.email = auth.email;
      player.connected = true;

      this.state.players.set(client.sessionId, player);
      this.pendingInputs.set(client.sessionId, []);
      this.lastInputBySession.set(client.sessionId, {
        seq: 0,
        dirX: 0,
        dirZ: 0,
        sprint: false,
        dtMs: 0,
      });
    }
    console.log(
      `[GameRoom:${this.roomId}] join session=${client.sessionId} clients=${this.clients.length}`,
    );

    if (this.clients.length === 2 && this.state.phase === Phase.MATCHMAKING) {
      const distinctUsers = new Set<string>();
      this.state.players.forEach((player) => {
        if (player.userId) distinctUsers.add(player.userId);
      });
      if (distinctUsers.size < 2) {
        console.warn(
          `[GameRoom:${this.roomId}] skip match start: expected 2 distinct users, got ${distinctUsers.size}`,
        );
        return;
      }
      if (this.matchmakingTimer) {
        clearTimeout(this.matchmakingTimer);
        this.matchmakingTimer = null;
      }
      void this.lock();
      this.assignRolesAndSpawn();
      this.startCountdown();
      console.log(`[GameRoom:${this.roomId}] match found, starting countdown`);
    }
  }

  private clearCountdownInterval() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  private assignRolesAndSpawn() {
    const sessionIds: string[] = [];
    this.state.players.forEach((_player, sessionId) =>
      sessionIds.push(sessionId),
    );

    const spawns = getSpawnPositions(this.mapId);
    const hunterIdx = Math.random() < 0.5 ? 0 : 1;

    sessionIds.forEach((sessionId, idx) => {
      const player = this.state.players.get(sessionId)!;
      player.role = idx === hunterIdx ? Role.HUNTER : Role.RUNNER;
      player.x = spawns[idx].x;
      player.z = spawns[idx].z;
    });
  }

  private startCountdown() {
    this.clearCountdownInterval();
    this.state.phase = Phase.COUNTDOWN;
    this.state.countdownMsRemaining = 3000;
    this.trackUsersAsActive();

    this.countdownInterval = setInterval(() => {
      if (this.state.phase !== Phase.COUNTDOWN) return;
      this.state.countdownMsRemaining -= 100;
      if (this.state.countdownMsRemaining <= 0) {
        this.clearCountdownInterval();
        this.state.countdownMsRemaining = 0;
        this.startMatch();
      }
    }, 100);
  }

  /** Same 3s UI as match start; does not reset match timer or catch state. */
  private startReconnectCountdown() {
    this.clearCountdownInterval();
    this.state.phase = Phase.COUNTDOWN;
    this.state.countdownMsRemaining = 3000;
    this.trackUsersAsActive();

    this.countdownInterval = setInterval(() => {
      if (this.state.phase !== Phase.COUNTDOWN) return;
      this.state.countdownMsRemaining -= 100;
      if (this.state.countdownMsRemaining <= 0) {
        this.clearCountdownInterval();
        this.state.countdownMsRemaining = 0;
        this.resumeMatchAfterReconnect();
      }
    }, 100);
  }

  private resumeMatchAfterReconnect() {
    this.state.phase = Phase.RUNNING;
    this.trackUsersAsActive();
  }

  private startMatch() {
    this.state.phase = Phase.RUNNING;
    this.state.matchMsRemaining = 120000;
    this.elapsedMs = 0;
    this.catchDetector.reset();
    this.trackUsersAsActive();
  }

  private update(dtMs: number) {
    if (this.state.phase === Phase.PAUSED) {
      this.state.reconnectMsRemaining = Math.max(
        0,
        this.state.reconnectMsRemaining - dtMs,
      );
      return;
    }
    if (this.state.phase !== Phase.RUNNING) return;

    this.elapsedMs += dtMs;

    const mapDef = getMapDefinition(this.mapId);

    this.state.players.forEach((player, sessionId) => {
      if (!player.connected) return;

      const inputs = this.pendingInputs.get(sessionId) ?? [];
      this.pendingInputs.set(sessionId, []);
      const latestInput =
        inputs.length > 0
          ? inputs[inputs.length - 1]
          : this.lastInputBySession.get(sessionId);

      if (inputs.length > 0) {
        const dtPerInput = dtMs / inputs.length;
        for (const input of inputs) {
          const isMoving = input.dirX !== 0 || input.dirZ !== 0;
          updateStamina(player, input.sprint, isMoving, dtPerInput);
          applyMovement(
            player,
            input,
            dtPerInput,
            mapDef.arenaHalf,
            mapDef.obstacles,
          );
        }
      } else if (latestInput) {
        const isMoving = latestInput.dirX !== 0 || latestInput.dirZ !== 0;
        updateStamina(player, latestInput.sprint, isMoving, dtMs);
        applyMovement(
          player,
          latestInput,
          dtMs,
          mapDef.arenaHalf,
          mapDef.obstacles,
        );
      } else {
        updateStamina(player, false, false, dtMs);
      }
    });

    this.state.matchMsRemaining -= dtMs;

    let hunter: PlayerState | null = null;
    let hunterSessionId = '';
    let runner: PlayerState | null = null;
    let runnerSessionId = '';

    this.state.players.forEach((player, sessionId) => {
      if (player.role === Role.HUNTER) {
        hunter = player;
        hunterSessionId = sessionId;
      } else if (player.role === Role.RUNNER) {
        runner = player;
        runnerSessionId = sessionId;
      }
    });

    if (hunter && runner) {
      const caught = this.catchDetector.check(
        hunter,
        runner,
        this.state.hunterCatchDistance,
        this.elapsedMs,
      );

      if (caught) {
        void this.endGame('CAUGHT', hunterSessionId, runnerSessionId);
        return;
      }
    }

    if (this.state.matchMsRemaining <= 0) {
      this.state.matchMsRemaining = 0;
      void this.endGame('SURVIVED', runnerSessionId, hunterSessionId);
    }
  }

  private async endGame(
    reason: 'CAUGHT' | 'SURVIVED' | 'FORFEIT' | 'TIMEOUT',
    winnerSessionId: string,
    loserSessionId: string,
  ) {
    if (this.state.phase === Phase.ENDED) return;
    this.clearCountdownInterval();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.disconnectedSessionId = null;

    this.state.phase = Phase.ENDED;
    this.state.reconnectMsRemaining = 0;
    this.state.endReason = reason;
    this.state.winnerSessionId = winnerSessionId;
    this.maxClients = 2;
    // Clear "active match" immediately so Start screen stops showing return CTA right away.
    this.clearTrackedUsers();

    const durationMs = Math.round(this.elapsedMs);

    this.broadcast('server:gameOver', {
      winnerSessionId,
      loserSessionId,
      endReason: reason,
      durationMs,
    });

    if (reason !== 'TIMEOUT') {
      const winner = this.state.players.get(winnerSessionId);
      const loser = this.state.players.get(loserSessionId);

      if (winner && loser) {
        try {
          await this.supabase.recordGameResult(
            winner.userId,
            loser.userId,
            durationMs,
            reason,
          );
        } catch (err) {
          console.error('Failed to persist game result:', err);
        }
      }
    }
  }

  private trackUsersAsActive() {
    this.state.players.forEach((player) => {
      if (player.userId) {
        GameRoom.activeRoomByUserId.set(player.userId, this.roomId);
      }
    });
  }

  private clearTrackedUsers() {
    this.state.players.forEach((player) => {
      if (player.userId) {
        const activeRoomId = GameRoom.activeRoomByUserId.get(player.userId);
        if (activeRoomId === this.roomId) {
          GameRoom.activeRoomByUserId.delete(player.userId);
        }
      }
    });
  }

  private getOpponentSessionId(sessionId: string): string | null {
    let opponentSessionId: string | null = null;
    this.state.players.forEach((_player, candidateSessionId) => {
      if (!opponentSessionId && candidateSessionId !== sessionId) {
        opponentSessionId = candidateSessionId;
      }
    });
    return opponentSessionId;
  }

  private beginReconnectionWindow(client: Client) {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.connected) return;
    if (
      this.state.phase !== Phase.RUNNING &&
      this.state.phase !== Phase.COUNTDOWN
    ) {
      return;
    }

    player.connected = false;
    this.clearCountdownInterval();
    this.disconnectedSessionId = client.sessionId;
    this.state.phase = Phase.PAUSED;
    this.state.reconnectMsRemaining = RECONNECT_GRACE_SECONDS * 1000;
    // Allow one temporary seat for returning player.
    this.maxClients = 3;
    // Temporarily unlock room so the same account can re-join by roomId.
    void this.unlock();

    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      const opponentSessionId = this.getOpponentSessionId(client.sessionId);
      if (!opponentSessionId || this.state.phase === Phase.ENDED) return;
      void this.endGame('FORFEIT', opponentSessionId, client.sessionId);
    }, RECONNECT_GRACE_SECONDS * 1000);
  }

  private finishReconnectionWindow(sessionId: string) {
    if (
      this.disconnectedSessionId &&
      this.disconnectedSessionId !== sessionId
    ) {
      return;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    const player = this.state.players.get(sessionId);
    if (player) player.connected = true;

    if (this.state.phase === Phase.PAUSED) {
      this.startReconnectCountdown();
    }
    this.state.reconnectMsRemaining = 0;
    this.maxClients = 2;
    void this.lock();

    this.disconnectedSessionId = null;
  }

  onDrop(client: Client) {
    this.beginReconnectionWindow(client);
  }

  onLeave(client: Client, code?: number) {
    if (this.state.phase === Phase.MATCHMAKING) {
      this.state.players.delete(client.sessionId);
      this.explicitQuitSessionIds.delete(client.sessionId);
      this.pendingInputs.delete(client.sessionId);
      this.lastInputBySession.delete(client.sessionId);
      console.log(
        `[GameRoom:${this.roomId}] matchmaking leave session=${client.sessionId} clients=${this.clients.length}`,
      );
      return;
    }

    const isConsentedLeave = code === CloseCode.CONSENTED;
    if (
      isConsentedLeave &&
      (this.state.phase === Phase.RUNNING ||
        this.state.phase === Phase.COUNTDOWN ||
        this.state.phase === Phase.PAUSED)
    ) {
      const opponentSessionId = this.getOpponentSessionId(client.sessionId);
      if (opponentSessionId) {
        void this.endGame('FORFEIT', opponentSessionId, client.sessionId);
      }
      this.explicitQuitSessionIds.delete(client.sessionId);
      this.pendingInputs.delete(client.sessionId);
      this.lastInputBySession.delete(client.sessionId);
      return;
    }

    if (this.explicitQuitSessionIds.has(client.sessionId)) {
      this.explicitQuitSessionIds.delete(client.sessionId);
      this.pendingInputs.delete(client.sessionId);
      this.lastInputBySession.delete(client.sessionId);
      return;
    }

    // Leave without explicit quit keeps reconnect window.
    this.beginReconnectionWindow(client);
    const player = this.state.players.get(client.sessionId);
    if (player && this.state.phase === Phase.ENDED) {
      player.connected = false;
    }
    this.pendingInputs.delete(client.sessionId);
    this.lastInputBySession.delete(client.sessionId);
    console.log(
      `[GameRoom:${this.roomId}] leave session=${client.sessionId} clients=${this.clients.length}`,
    );
  }

  onDispose() {
    if (this.matchmakingTimer) clearTimeout(this.matchmakingTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.clearCountdownInterval();
    this.clearTrackedUsers();
    GameRoom.roomById.delete(this.roomId);
    console.log(`[GameRoom:${this.roomId}] disposed`);
  }
}
