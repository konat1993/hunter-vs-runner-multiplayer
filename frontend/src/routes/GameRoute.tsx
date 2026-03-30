import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Canvas } from '@react-three/fiber';
import { useGameStore } from '../state/game.store';
import { formatTime } from '../lib/time';
import { useMatchmakingStore } from '../state/matchmaking.store';
import { useAuthStore } from '../state/auth.store';
import { joinGameRoomById } from '../lib/colyseus';
import { Scene } from '../r3f/Scene';
import { HUD } from '../ui/HUD';
import { CountdownOverlay } from '../ui/CountdownOverlay';
import { EndOverlay } from '../ui/EndOverlay';
import {
  CAMERA_FOV,
  CAMERA_POSITION,
  CAMERA_ZOOM_STEP,
  clampCameraZoom,
} from '../game/camera';
import {
  RENDERER_ANTIALIAS,
  RENDERER_DPR_MAX,
  RENDERER_POWER_PREFERENCE,
} from '../game/perf';
import { isValidMapId } from '../game/obstacles';
import type { GameOverMessage, GameRoomStateSnapshot } from '../game/room-types';

export function GameRoute() {
  const navigate = useNavigate();
  const { roomId } = useParams<{ roomId: string }>();
  const { session } = useAuthStore();
  const { room: matchmakingRoom, setRoom: setMatchmakingRoom } = useMatchmakingStore();
  const {
    room,
    phase,
    reconnectMs,
    setRoom,
    setMapId,
    setPhase,
    setTimers,
    setLocalSession,
    setEnded,
  } = useGameStore();

  const [cameraZoom, setCameraZoom] = useState(1);

  const activeRoom = room ?? matchmakingRoom;

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }
      // + / = zoom in (closer); − / _ zoom out (farther).
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setCameraZoom((z) => clampCameraZoom(z - CAMERA_ZOOM_STEP));
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setCameraZoom((z) => clampCameraZoom(z + CAMERA_ZOOM_STEP));
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

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
      if (state.mapId && isValidMapId(state.mapId)) {
        setMapId(state.mapId);
      }
      if (state.phase) setPhase(state.phase);
      setTimers(
        state.countdownMsRemaining ?? 3000,
        state.matchMsRemaining ?? 120000,
        state.reconnectMsRemaining ?? 0,
      );
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
  }, [
    activeRoom,
    navigate,
    roomId,
    session,
    setEnded,
    setLocalSession,
    setMapId,
    setPhase,
    setTimers,
  ]);

  if (!activeRoom) {
    return null;
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#080810' }}>
      <Canvas
        camera={{ position: CAMERA_POSITION, fov: CAMERA_FOV }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: RENDERER_ANTIALIAS, powerPreference: RENDERER_POWER_PREFERENCE }}
        shadows={false}
        dpr={[1, RENDERER_DPR_MAX]}
      >
        <Scene room={activeRoom} cameraZoom={cameraZoom} />
      </Canvas>

      {(phase === 'RUNNING' || phase === 'COUNTDOWN' || phase === 'PAUSED') && (
        <div
          className="camera-zoom-controls"
          style={{
            position: 'absolute',
            right: 20,
            bottom: 24,
            zIndex: 15,
            gap: 6,
            pointerEvents: 'auto',
            alignItems: 'center',
          }}
        >
          <button
            type="button"
            className="focus-ring"
            aria-label="Zoom out"
            onClick={() =>
              setCameraZoom((z) => clampCameraZoom(z + CAMERA_ZOOM_STEP))
            }
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(8,8,16,0.8)',
              color: '#f0f0fa',
              fontSize: 22,
              lineHeight: 1,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            −
          </button>
          <button
            type="button"
            className="focus-ring"
            aria-label="Zoom in"
            onClick={() =>
              setCameraZoom((z) => clampCameraZoom(z - CAMERA_ZOOM_STEP))
            }
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(8,8,16,0.8)',
              color: '#f0f0fa',
              fontSize: 22,
              lineHeight: 1,
              cursor: 'pointer',
              fontFamily: 'var(--font-mono)',
            }}
          >
            +
          </button>
        </div>
      )}

      {/* HUD overlays */}
      {(phase === 'RUNNING' || phase === 'COUNTDOWN' || phase === 'PAUSED') && <HUD />}
      {phase === 'COUNTDOWN' && <CountdownOverlay />}
      {phase === 'PAUSED' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
            background: 'rgba(0,0,0,0.35)',
            color: '#f0f0fa',
            fontFamily: '"Rajdhani", system-ui, sans-serif',
            letterSpacing: '0.04em',
            zIndex: 20,
          }}
        >
          <span style={{ fontSize: '28px' }}>OPPONENT DISCONNECTED</span>
          <span
            aria-live="polite"
            aria-atomic="true"
            style={{
              fontFamily: '"Share Tech Mono", monospace',
              fontSize: 'clamp(72px, 14vw, 120px)',
              fontWeight: 400,
              lineHeight: 1,
              color: '#00dcff',
              textShadow: '0 0 24px rgba(0,220,255,0.45)',
            }}
          >
            {formatTime(reconnectMs)}
          </span>
          <span
            style={{
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: '15px',
              fontWeight: 400,
              letterSpacing: '0.02em',
              color: '#a5a5c2',
              maxWidth: '420px',
              lineHeight: 1.45,
            }}
          >
            If they don’t return before the timer hits 0:00, you win the match.
          </span>
        </div>
      )}
      {phase === 'ENDED' && <EndOverlay />}
    </div>
  );
}
