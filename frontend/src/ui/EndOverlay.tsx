import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../state/game.store';
import { useAuthStore } from '../state/auth.store';

const END_REASON_TEXT: Record<string, { winner: string; loser: string }> = {
  CAUGHT: {
    winner: 'You caught the Runner!',
    loser: 'You were caught!',
  },
  SURVIVED: {
    winner: 'You survived the full 2 minutes!',
    loser: 'The Runner escaped!',
  },
  FORFEIT: {
    winner: 'Your opponent disconnected.',
    loser: 'You disconnected — match forfeited.',
  },
  TIMEOUT: {
    winner: 'Match timed out.',
    loser: 'Match timed out.',
  },
};

export function EndOverlay() {
  const navigate = useNavigate();
  const { endReason, winnerSessionId, localSessionId, reset } = useGameStore();
  const { refreshStats } = useAuthStore();

  const isWinner = winnerSessionId === localSessionId;
  const reason = endReason ?? 'FORFEIT';
  const texts = END_REASON_TEXT[reason] ?? END_REASON_TEXT.FORFEIT;
  const subText = isWinner ? texts.winner : texts.loser;

  const outcomeColor = isWinner ? '#00dcff' : '#ff5010';
  const outcomeTextGlow = isWinner
    ? '0 0 10px rgba(0,220,255,0.8)'
    : '0 0 10px rgba(255,80,16,0.8)';
  const outcomeGlow = isWinner
    ? 'rgba(0, 220, 255, 0.15)'
    : 'rgba(255, 80, 16, 0.15)';
  const btnClass = isWinner ? 'btn-neon-runner' : 'btn-neon-hunter';

  async function handlePlayAgain() {
    await refreshStats();
    reset();
    navigate('/matchmaking');
  }

  async function handleQuitToHome() {
    await refreshStats();
    reset();
    navigate('/', { replace: true });
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'rgba(8,8,16,0.88)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 30,
      }}
    >
      {/* Ambient glow behind card */}
      <div
        style={{
          position: 'absolute',
          width: '520px',
          height: '400px',
          background: `radial-gradient(ellipse at center, ${outcomeGlow} 0%, transparent 70%)`,
          filter: 'blur(40px)',
        }}
      />

      <div
        className="glass-panel animate-slide-up"
        style={{
          maxWidth: '520px',
          width: '90%',
          padding: '48px',
          position: 'relative',
        }}
      >
        {/* Outcome headline */}
        <div
          aria-live="polite"
          className="animate-slide-up-delayed"
          style={{
            fontFamily: '"Rajdhani", system-ui, sans-serif',
            fontSize: '56px',
            fontWeight: 700,
            lineHeight: 1,
            letterSpacing: '0.04em',
            color: outcomeColor,
            textShadow: outcomeTextGlow,
            textAlign: 'center',
            marginBottom: '12px',
          }}
        >
          {isWinner ? 'YOU WIN' : 'YOU LOSE'}
        </div>

        {/* Sub-line */}
        <p
          style={{
            fontFamily: '"Inter", system-ui, sans-serif',
            fontSize: '16px',
            color: '#8888aa',
            textAlign: 'center',
            marginBottom: '16px',
          }}
        >
          {subText}
        </p>

        {/* Reason chip */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <span
            style={{
              fontFamily: '"Inter", system-ui, sans-serif',
              fontSize: '13px',
              letterSpacing: '0.01em',
              color: outcomeColor,
              background: 'rgba(0,0,0,0.3)',
              border: `1px solid ${outcomeColor}`,
              borderRadius: '9999px',
              padding: '4px 14px',
            }}
          >
            {reason}
          </span>
        </div>

        {/* Separator */}
        <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.07)', marginBottom: '24px' }} />

        {/* Play Again */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            className={`${btnClass} focus-ring`}
            onClick={handlePlayAgain}
            style={{
              width: '100%',
              padding: '16px 0',
              fontSize: '20px',
            }}
          >
            PLAY AGAIN
          </button>
          <button
            className="btn-ghost focus-ring"
            onClick={handleQuitToHome}
            type="button"
            style={{
              width: '100%',
              padding: '14px 0',
              fontSize: '16px',
            }}
          >
            QUIT TO MENU
          </button>
        </div>
      </div>
    </div>
  );
}
