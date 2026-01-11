'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const checkProfile = useCallback(async (retryCount = 0) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    // If profile doesn't exist yet (null or error), we might need to wait for the trigger
    // or just assume we need to create it.
    if (!profile || !profile.username) {
      if (!profile && retryCount < 3) {
        // Retry after 1s if profile is completely missing
        setTimeout(() => checkProfile(retryCount + 1), 1500);
        return;
      }
      setUserId(user.id);
      setIsOpen(true);
    }
  }, [supabase]);

  useEffect(() => {
    checkProfile();
  }, [checkProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !userId) return;

    setLoading(true);
    // Use upsert to be safe in case the profile row doesn't exist yet
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        id: userId,
        username: username.trim(),
        updated_at: new Date().toISOString()
      });

    setLoading(false);

    if (!error) {
      setIsOpen(false);
      // Small delay before reload for a better feel
      setTimeout(() => window.location.reload(), 500);
    } else {
      alert('Error al guardar el apodo: ' + error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.9)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem'
    }}>
      <div className="card" style={{ 
        maxWidth: '450px', 
        width: '100%', 
        textAlign: 'center', 
        border: '1px solid var(--color-gold)',
        padding: '2.5rem',
        background: 'linear-gradient(180deg, #1e1e1e 0%, #111 100%)',
        boxShadow: '0 30px 60px rgba(0,0,0,0.8)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ color: 'var(--color-gold)', marginBottom: '1rem', fontSize: '2rem' }}>¡Bienvenido!</h2>
        <p style={{ marginBottom: '2rem', color: '#aaa', fontSize: '1.1rem', lineHeight: '1.5' }}>
          Para aparecer en la clasificación de la liga, necesitamos que elijas tu <strong>nombre de piloto</strong>.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ textAlign: 'left' }}>
            <label style={{ display: 'block', marginBottom: '0.6rem', fontSize: '0.8rem', color: 'var(--color-gold)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>Nombre de Jugador</label>
            <input 
              type="text" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: El Mago de las Cañas"
              required
              minLength={3}
              autoFocus
              style={{
                width: '100%', padding: '1rem', borderRadius: '12px',
                border: '1px solid #333', background: '#000', color: 'white',
                fontSize: '1.1rem'
              }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-gold"
            disabled={loading}
            style={{ width: '100%', height: '3.5rem', fontSize: '1.2rem', fontWeight: '900' }}
          >
            {loading ? 'Preparando...' : '¡A JUGAR! 🚀'}
          </button>
        </form>
      </div>
    </div>
  );
}
