
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import Link from 'next/link';
import React from 'react';

export default async function MatchesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  );

  // Fetch matches with winner info
  const { data: matches } = await supabase
    .from('matches')
    .select('*, profiles!winner_id(username, avatar_url)')
    .not('winner_id', 'is', null)
    .order('created_at', { ascending: false });

  // Fetch all profiles to map the 'players' array
  const { data: allProfiles } = await supabase.from('profiles').select('id, username');
  const profileMap = (allProfiles || []).reduce((acc: any, p) => {
    acc[p.id] = p.username || 'Desconocido';
    return acc;
  }, {});

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--color-gold)', marginBottom: '0.5rem' }}>Historial de Partidas</h1>
          <p style={{ color: '#888' }}>Todas las batallas registradas en la liga.</p>
        </div>
      </header>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {(!matches || matches.length === 0) ? (
          <div className="card" style={{ textAlign: 'center', padding: '6rem 2rem', border: '2px dashed #333', background: 'rgba(255,255,255,0.01)', borderRadius: '24px' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.5rem' }}>⚔️</div>
            <h3 style={{ color: '#fff', marginBottom: '1rem' }}>No hay batallas registradas</h3>
            <p style={{ color: '#666', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem' }}>La historia se escribe en el campo de batalla. Sé el primero en registrar una victoria.</p>
            <Link href="/ranking?add=true" className="btn btn-gold" style={{ padding: '1rem 3rem' }}>
              REGISTRAR PRIMERA VICTORIA
            </Link>
          </div>
        ) : (
          matches.map((match) => (
            <div key={match.id} className="card" style={{ 
              borderLeft: '4px solid var(--color-gold)',
              padding: '1.5rem',
              display: 'grid',
              gridTemplateColumns: '120px 1fr 1fr',
              gap: '2rem',
              alignItems: 'center'
            }}>
              {/* Date */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                  {new Date(match.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#666' }}>
                  {new Date(match.created_at).getFullYear()}
                </div>
              </div>

              {/* Match Info */}
              <div>
                <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Ganador
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {match.profiles?.avatar_url ? (
                    <img src={match.profiles.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-gold)', color: '#1a1a1a', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold' }}>
                      {match.profiles?.username?.charAt(0) || 'W'}
                    </div>
                  )}
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>
                    {match.profiles?.username || 'Desconocido'}
                  </span>
                </div>
                <p style={{ marginTop: '0.75rem', fontSize: '0.9rem', color: '#CCC', fontStyle: 'italic' }}>
                   "{match.description || 'Sin descripción'}"
                </p>
              </div>

              {/* Participants */}
              <div>
                <div style={{ fontSize: '0.8rem', color: '#888', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                  Participantes ({match.players.length})
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                   {match.players.map((pid: string) => (
                     <span key={pid} style={{ 
                       fontSize: '0.75rem', 
                       background: '#222', 
                       padding: '2px 8px', 
                       borderRadius: '4px',
                       color: pid === match.winner_id ? 'var(--color-gold)' : '#888',
                       border: pid === match.winner_id ? '1px solid var(--color-gold)' : '1px solid #333'
                     }}>
                       {profileMap[pid]}
                     </span>
                   ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
