import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../state/game.store';
import { useMatchmakingStore } from '../state/matchmaking.store';
import { useAuthStore } from '../state/auth.store';
import { joinGameRoomById } from '../lib/colyseus';
import { Scene } from '../r3f/Scene';
import { HUD } from '../ui/HUD';
import { CountdownOverlay } from '../ui/CountdownOverlay';
import { EndOverlay } from '../ui/EndOverlay';
import { CAMERA_POSITION, CAMERA_FOV } from '../game/camera';
import { RENDERER_DPR_MAX } from '../game/perf';
import type { GameOverMessage, GameRoomStateSnapshot } from '../game/room-types';

export function GameRoute() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { session } = useAuthStore();
  const { room: matchmakingRoom, setRoom: setMatchmakingRoom } = useMatchmakingStore();
  const { room, phase, setRoom, setPhase, setTimers, setLocalSession, setEnded } = useGameStore();

  const activeRoom = room ?? matchmakingRoom;

  useEffect(() => {
    if (!session) return;
    if (activeRoom) {
      if (roomId && activeRoom.roomId !== roomId) {
        navigate(`/game/${activeRoom.roomId}`, { replace: true });
      }
      return;
    }
    if (!roomId) {
      navigate('/', { replace: true });
      return;
    }

    let cancelled = false;
    joinGameRoomById(roomId, session.access_token)
      .then((joinedRoom) => {
        if (cancelled) return;
        setRoom(joinedRoom);
        setMatchmakingRoom(joinedRoom);
      })
      .catch(() => {
        if (cancelled) return;
        navigate('/', { replace: true });
      });

    return () => {
      cancelled = true;
    };
  }, [activeRoom, navigate, roomId, session, setMatchmakingRoom, setRoom]);

  useEffect(() => {
    if (!session) {
      navigate('/', { replace: true });
      return;
    }

    if (!activeRoom) return;

    if (!roomId || activeRoom.roomId !== roomId) {
      navigate(`/game/${activeRoom.roomId}`, { replace: true });
      return;
    }

    // Sync phase/timers from server state (player positions handled in Scene.tsx)
    const handleStateChange = (state: GameRoomStateSnapshot) => {
      if (!state) return;
      if (state.phase) setPhase(state.phase);
      setTimers(state.countdownMsRemaining ?? 3000, state.matchMsRemaining ?? 120000);

      // Sync local session/role once
      state.players?.forEach((player, sessionId) => {
        if (sessionId === activeRoom.sessionId) {
          setLocalSession(sessionId, player.role);
        }
      });
    };
    activeRoom.onStateChange(handleStateChange);

    const offGameOver = activeRoom.onMessage('server:gameOver', (data: GameOverMessage) => {
      setEnded(data.endReason, data.winnerSessionId);
    });

    return () => {
      // Remove handlers to prevent duplicate callbacks after remounts.
      activeRoom.onStateChange.remove(handleStateChange);
      offGameOver();
    };
  }, [activeRoom, navigate, roomId, session, setEnded, setLocalSession, setPhase, setTimers]);

  if (!activeRoom) {
    return null;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#080810' }}>
      <Canvas
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true }}
        shadows={false}
        dpr={[1, RENDERER_DPR_MAX]}
      >
        <Scene room={activeRoom} />
      </Canvas>

      {/* HUD overlays */}
      {(phase === 'RUNNING' || phase === 'COUNTDOWN' || phase === 'PAUSED') && <HUD />}
      {phase === 'COUNTDOWN' && <CountdownOverlay />}
      {phase === 'PAUSED' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.35)',
            color: '#f0f0fa',
            fontFamily: '"Rajdhani", system-ui, sans-serif',
            fontSize: '28px',
            letterSpacing: '0.04em',
            zIndex: 20,
          }}
        >
          OPPONENT DISCONNECTED — WAITING 30s
        </div>
      )}
      {phase === 'ENDED' && <EndOverlay />}
    </div>
  );
}
