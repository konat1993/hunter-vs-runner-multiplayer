import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallbackRoute() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(() => {
      navigate('/', { replace: true });
    });
  }, [navigate]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        background: 'radial-gradient(ellipse at center, rgba(20,20,50,0.8) 0%, #080810 70%)',
      }}
    >
      <div
        className="animate-spin"
        style={{
          width: '64px',
          height: '64px',
          border: '2px solid transparent',
          borderTopColor: '#00dcff',
          borderRadius: '50%',
        }}
      />
      <p
        style={{
          fontFamily: '"Inter", system-ui, sans-serif',
          fontSize: '16px',
          color: '#8888aa',
        }}
      >
        Signing you in…
      </p>
    </div>
  );
}
