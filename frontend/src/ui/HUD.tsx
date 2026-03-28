import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/game.store';
import { formatTime } from '../lib/time';
import { STAMINA_MAX, STAMINA_REGEN_PER_SEC } from '../game/constants';

export function HUD() {
  const navigate = useNavigate();
  const [showGuide, setShowGuide] = useState(false);
  const [showQuitConfirm, setShowQuitConfirm] = useState(false);
  const { room, phase, localRole, localTransform, matchMs, reconnectMs, reset } = useGameStore();
  const hudZ = phase === 'PAUSED' ? 25 : 10;
  const stamina = localTransform.stamina;
  const sprintReady = localTransform.sprintReady;
  const isHunter = localRole === 'HUNTER';
  const roleColor = isHunter ? '#ff5010' : '#00dcff';
  const roleBorderColor = isHunter ? 'rgba(255,80,30,0.6)' : 'rgba(0,220,255,0.6)';
  const roleGlow = isHunter
    ? '0 0 20px rgba(255,80,16,0.5), 0 0 60px rgba(255,80,16,0.2)'
    : '0 0 20px rgba(0,220,255,0.5), 0 0 60px rgba(0,220,255,0.2)';
  const roleTextGlow = isHunter
    ? '0 0 10px rgba(255,80,16,0.8)'
    : '0 0 10px rgba(0,220,255,0.8)';

  const displayMatchMs = phase === 'PAUSED' ? reconnectMs : matchMs;
  const isUrgent = displayMatchMs <= 10000;
  const isWarning = displayMatchMs <= 30000;
  const timerColor =
    phase === 'PAUSED' ? '#00dcff' : isWarning ? '#ff5010' : '#f0f0fa';

  const staminaPct = (stamina / 100) * 100;
  const staminaLow = stamina < 20;
  const staminaColor = isHunter ? '#ff5010' : '#00dcff';
  const staminaBarColor = staminaLow
    ? (isHunter ? '#ff2000' : '#00aacc')
    : staminaColor;
  const staminaToFullSeconds = sprintReady
    ? 0
    : Math.ceil(Math.max(0, STAMINA_MAX - stamina) / STAMINA_REGEN_PER_SEC);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey) return;
      e.preventDefault();
      setShowGuide((prev) => !prev);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  async function handleConfirmQuit() {
    try {
      if (!room) return;

      const gameOverAck = new Promise<void>((resolve) => {
        const off = room.onMessage('server:gameOver', () => {
          off();
          resolve();
        });
      });

      room.send('player:quit');
      // Give server a brief moment to process quit before disconnecting socket.
      await Promise.race([
        gameOverAck,
        new Promise((resolve) => setTimeout(resolve, 250)),
      ]);
      await room.leave();
    } finally {
      reset();
      navigate('/', { replace: true });
    }
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: hudZ,
      }}
    >
      {/* Zone A — Timer (top center) */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(8,8,16,0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '9999px',
          padding: '8px 24px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.6)',
        }}
        className={isUrgent ? 'animate-pulse-opacity' : ''}
      >
        <span
          style={{
            fontFamily: '"Share Tech Mono", monospace',
            fontSize: '36px',
            color: timerColor,
            letterSpacing: 0,
            lineHeight: 1,
            display: 'block',
          }}
        >
          {formatTime(displayMatchMs)}
        </span>
      </div>

      {/* Zone B — Role Badge (top left) */}
      {localRole && (
        <div
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            background: 'rgba(8,8,16,0.75)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${roleBorderColor}`,
            borderRadius: '9999px',
            padding: '6px 16px',
            boxShadow: roleGlow,
          }}
        >
          <span
            style={{
              fontFamily: '"Rajdhani", system-ui, sans-serif',
              fontSize: '18px',
              fontWeight: 700,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: roleColor,
              textShadow: roleTextGlow,
            }}
          >
            {localRole}
          </span>
        </div>
      )}

      {/* Zone D — Top-right actions */}
      <div
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          display: 'flex',
          gap: '8px',
          pointerEvents: 'auto',
        }}
      >
        <button
          className="btn-neon-hunter focus-ring"
          onClick={() => setShowQuitConfirm(true)}
          style={{ padding: '8px 14px', fontSize: '13px' }}
        >
          QUIT
        </button>
        <button
          className="btn-ghost focus-ring"
          onClick={() => setShowGuide((prev) => !prev)}
          style={{ padding: '8px 14px', fontSize: '13px' }}
        >
          {showGuide ? 'HIDE GUIDE' : 'SHOW GUIDE'}
        </button>
      </div>
      {showGuide ? (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            top: '64px',
            right: '20px',
            width: 'min(360px, calc(100vw - 32px))',
            padding: '16px',
            pointerEvents: 'auto',
            border: '1px solid rgba(255,255,255,0.16)',
            background: 'rgba(18,18,30,0.55)',
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
          }}
        >
          <h3 style={{ margin: 0, marginBottom: '10px', fontSize: '16px', fontFamily: '"Rajdhani", system-ui, sans-serif' }}>
            How to play
          </h3>
          <p style={{ margin: 0, marginBottom: '8px', fontSize: '13px', color: '#a5a5c2' }}>
            <strong>Hunter</strong>: catch Runner before timer ends.
          </p>
          <p style={{ margin: 0, marginBottom: '12px', fontSize: '13px', color: '#a5a5c2' }}>
            <strong>Runner</strong>: survive until timer reaches 0.
          </p>
          <p style={{ margin: 0, fontSize: '13px', color: '#f0f0fa' }}><strong>Move:</strong> WASD / Arrow keys</p>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#f0f0fa' }}><strong>Sprint:</strong> Hold Shift</p>
          <p style={{ margin: '6px 0 0', fontSize: '13px', color: '#f0f0fa' }}><strong>Guide:</strong> Press / to toggle</p>
          <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#a5a5c2', lineHeight: 1.45 }}>
            After stamina reaches 0, sprint unlocks again only at 100% stamina.
          </p>
        </div>
      ) : null}
      {showQuitConfirm ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'auto',
            zIndex: 40,
          }}
        >
          <div className="glass-panel" style={{ width: 'min(420px, 92vw)', padding: '20px' }}>
            <h3 style={{ margin: 0, marginBottom: '8px', fontFamily: '"Rajdhani", system-ui, sans-serif', fontSize: '28px' }}>
              Leave Match?
            </h3>
            <p style={{ margin: 0, marginBottom: '16px', color: '#a5a5c2', fontSize: '14px', lineHeight: 1.45 }}>
              If you quit now, this match counts as a loss and your opponent wins.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                className="btn-ghost focus-ring"
                onClick={() => setShowQuitConfirm(false)}
                style={{ padding: '8px 14px', fontSize: '13px' }}
              >
                CANCEL
              </button>
              <button
                className="btn-neon-hunter focus-ring"
                onClick={handleConfirmQuit}
                style={{ padding: '8px 14px', fontSize: '13px' }}
              >
                YES, QUIT
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Zone C — Stamina Bar (bottom left) */}
      <div
        className="hud-stamina-panel"
        style={{
          position: 'absolute',
          left: '20px',
          background: 'rgba(8,8,16,0.75)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '12px',
          padding: '8px 12px',
          width: '240px',
          boxShadow: '0 2px 16px rgba(0,0,0,0.6)',
        }}
      >
        <div
          style={{
            fontFamily: '"Rajdhani", system-ui, sans-serif',
            fontSize: '11px',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#8888aa',
            marginBottom: '4px',
          }}
        >
          Stamina
        </div>
        {!sprintReady ? (
          <div
            style={{
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: '11px',
              color: '#ffb17d',
              marginBottom: '4px',
            }}
          >
            Sprint available in {staminaToFullSeconds}s
          </div>
        ) : null}
        <div
          role="progressbar"
          aria-valuenow={Math.round(stamina)}
          aria-valuemax={100}
          aria-label="Stamina"
          style={{
            width: '100%',
            height: '8px',
            borderRadius: '9999px',
            background: '#1e1e2e',
            overflow: 'hidden',
          }}
        >
          <div
            className={staminaLow ? 'animate-pulse-opacity' : ''}
            style={{
              height: '100%',
              width: `${staminaPct}%`,
              borderRadius: '9999px',
              background: staminaBarColor,
              transition: 'width 100ms linear',
              boxShadow: `0 0 6px ${staminaBarColor}`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
