'use client'

import React, { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';

function RankingContent() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (searchParams.get('add')) {
      setShowAdd(true);
    }
  }, [searchParams]);

  const [winnerId, setWinnerId] = useState('');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [matchDescription, setMatchDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const supabase = createClient();

  const fetchData = async () => {
    setLoading(true);
    const { data: profilesData } = await supabase.from('profiles').select('*');
    const { data: matchesData } = await supabase.from('matches').select('*').not('winner_id', 'is', null);
    setProfiles(profilesData || []);
    setMatches(matchesData || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // ... (rest of the logic remains same, just inside RankingContent)
  const leaderboard = profiles.map(profile => {
    const wins = matches.filter(m => m.winner_id === profile.id).length;
    const matchesPlayed = matches.filter(m => m.players.includes(profile.id)).length;
    return {
      ...profile,
      wins,
      matchesPlayed,
      points: wins * 3 + (matchesPlayed - wins) * 1
    };
  }).sort((a, b) => b.points - a.points);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10rem 0', gap: '1.5rem' }}>
      <div className="spinner-gold" style={{ width: '40px', height: '40px', border: '3px solid rgba(212,175,55,0.1)', borderTopColor: 'var(--color-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <div style={{ color: 'var(--color-gold)', fontSize: '0.9rem', fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase' }}>Cargando Clasificación...</div>
      <style jsx>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div>
          <h1 style={{ color: 'var(--color-gold)', fontFamily: 'var(--font-title)', fontSize: '3rem', marginBottom: '0.5rem' }}>Clasificación</h1>
          <p style={{ color: 'var(--text-secondary)' }}>La jerarquía actual de la Party. ¿Quién domina la mesa?</p>
        </div>
        <button 
          onClick={() => {
            if (!user) {
              router.push('/login?returnUrl=/ranking?add=true');
              return;
            }
            setShowAdd(!showAdd);
          }} 
          className="btn-premium btn-premium-gold"
          style={{ padding: '1rem 2rem' }}
        >
          {showAdd ? '✕ Cerrar' : '⚔️ Registrar Victoria'}
        </button>
      </div>

      {/* TOP 3 PODIUM */}
      {!loading && leaderboard.length >= 2 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: '1.5rem', marginBottom: '4rem', marginTop: '2rem', padding: '0 1rem' }}>
          {/* Second Place */}
          {leaderboard[1] && (
            <div className="glass-panel" style={{ 
              width: '180px', height: '220px', borderRadius: '24px 24px 0 0', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem', animation: 'slideIn 0.5s ease-out 0.1s both'
            }}>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                {leaderboard[1].avatar_url ? (
                  <img src={leaderboard[1].avatar_url} style={{ width: '80px', height: '80px', borderRadius: '50%', border: '2px solid #C0C0C0' }} alt={leaderboard[1].username} />
                ) : (
                  <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 'bold' }}>{leaderboard[1].username?.[0]}</div>
                )}
                <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#C0C0C0', color: '#000', padding: '2px 10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '900' }}>#2</div>
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', textAlign: 'center' }}>{leaderboard[1].username}</span>
              <span style={{ fontSize: '1.2rem', color: '#C0C0C0', fontWeight: '900' }}>{leaderboard[1].points} <small style={{ fontSize: '0.6rem' }}>PTS</small></span>
            </div>
          )}

          {/* First Place */}
          {leaderboard[0] && (
            <div className="glass-panel premium-border" style={{ 
              width: '220px', height: '280px', borderRadius: '32px 32px 0 0', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '2rem', zIndex: 2, background: 'rgba(212,175,55,0.05)',
              animation: 'slideIn 0.5s ease-out both',
              boxShadow: '0 0 50px rgba(212,175,55,0.2), inset 0 0 20px rgba(212,175,55,0.05)',
              borderBottom: 'none'
            }}>
              <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
                {leaderboard[0].avatar_url ? (
                  <img src={leaderboard[0].avatar_url} style={{ width: '100px', height: '100px', borderRadius: '50%', border: '4px solid var(--color-gold)' }} alt={leaderboard[0].username} />
                ) : (
                  <div style={{ width: '100px', height: '100px', borderRadius: '50%', background: 'var(--color-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 'bold' }}>{leaderboard[0].username?.[0]}</div>
                )}
                <div style={{ position: 'absolute', bottom: -15, left: '50%', transform: 'translateX(-50%)', background: 'var(--color-gold)', color: '#000', padding: '4px 15px', borderRadius: '12px', fontSize: '1rem', fontWeight: '900', boxShadow: '0 4px 10px rgba(212,175,55,0.4)' }}>🏆 #1</div>
              </div>
              <span style={{ fontWeight: '900', fontSize: '1.1rem', color: '#fff', textAlign: 'center', fontFamily: 'var(--font-title)' }}>{leaderboard[0].username}</span>
              <span style={{ fontSize: '1.8rem', color: 'var(--color-gold)', fontWeight: '900' }}>{leaderboard[0].points} <small style={{ fontSize: '0.7rem' }}>PTS</small></span>
            </div>
          )}

          {/* Third Place */}
          {leaderboard[2] && (
            <div className="glass-panel" style={{ 
              width: '180px', height: '200px', borderRadius: '24px 24px 0 0', 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '1.5rem', animation: 'slideIn 0.5s ease-out 0.2s both'
            }}>
              <div style={{ position: 'relative', marginBottom: '1rem' }}>
                {leaderboard[2].avatar_url ? (
                  <img src={leaderboard[2].avatar_url} style={{ width: '70px', height: '70px', borderRadius: '50%', border: '2px solid #CD7F32' }} alt={leaderboard[2].username} />
                ) : (
                  <div style={{ width: '70px', height: '70px', borderRadius: '50%', background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem', fontWeight: 'bold' }}>{leaderboard[2].username?.[0]}</div>
                )}
                <div style={{ position: 'absolute', bottom: -10, left: '50%', transform: 'translateX(-50%)', background: '#CD7F32', color: '#000', padding: '2px 10px', borderRadius: '10px', fontSize: '0.8rem', fontWeight: '900' }}>#3</div>
              </div>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff', textAlign: 'center' }}>{leaderboard[2].username}</span>
              <span style={{ fontSize: '1.2rem', color: '#CD7F32', fontWeight: '900' }}>{leaderboard[2].points} <small style={{ fontSize: '0.6rem' }}>PTS</small></span>
            </div>
          )}
        </div>
      )}

      {showAdd && (
        <div className="glass-panel premium-border" style={{ 
          marginBottom: '4rem', 
          maxWidth: '900px', 
          margin: '0 auto 4rem',
          padding: '2.5rem',
          borderRadius: '32px',
          animation: 'fadeIn 0.3s ease-out'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: '2.2rem', marginBottom: '0.5rem', fontFamily: 'var(--font-title)', color: 'var(--color-gold)' }}>Anotar Partida</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Selecciona los pilotos y quién forjó la victoria.</p>
          </div>

          <form onSubmit={async (e) => {
            e.preventDefault();
            if (!winnerId || selectedPlayerIds.length < 2) return;
            setSubmitting(true);
            const { error } = await supabase.from('matches').insert({
              winner_id: winnerId,
              description: matchDescription,
              players: selectedPlayerIds
            });
            if (error) alert('Error: ' + error.message);
            else {
              setWinnerId('');
              setSelectedPlayerIds([]);
              setMatchDescription('');
              setShowAdd(false);
              fetchData();
            }
            setSubmitting(false);
          }} style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <label style={{ color: 'var(--color-gold)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px' }}>
                  1. Participantes (Mín. 2)
                </label>
                {selectedPlayerIds.length >= 2 && (
                  <label style={{ color: 'var(--color-rare)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '2px', animation: 'pulse 2s infinite' }}>
                    2. ¡Nombra al Vencedor! 🏆
                  </label>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.25rem' }}>
                {profiles.map(p => {
                  const isSelected = selectedPlayerIds.includes(p.id);
                  const isWinner = winnerId === p.id;
                  return (
                    <div 
                      key={p.id}
                      style={{
                        padding: '1.5rem 1rem',
                        borderRadius: '24px',
                        background: isSelected ? 'rgba(212,175,55,0.08)' : 'rgba(255,255,255,0.03)',
                        border: `2px solid ${isWinner ? 'var(--color-mythic)' : isSelected ? 'var(--color-gold)' : 'transparent'}`,
                        transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '1rem',
                        cursor: 'pointer',
                        transform: isWinner ? 'scale(1.05)' : 'none',
                        boxShadow: isWinner ? '0 10px 25px rgba(255,132,0,0.2)' : 'none'
                      }}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== p.id));
                          if (isWinner) setWinnerId('');
                        } else {
                          setSelectedPlayerIds([...selectedPlayerIds, p.id]);
                        }
                      }}
                    >
                      <div style={{ position: 'relative' }}>
                        {p.avatar_url ? (
                          <img src={p.avatar_url} style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: isWinner ? '3px solid var(--color-mythic)' : (isSelected ? '2px solid var(--color-gold)' : '2px solid transparent') }} alt={p.username} />
                        ) : (
                          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: isSelected ? 'var(--color-gold)' : '#222', color: isSelected ? '#000' : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', fontWeight: '900' }}>
                            {p.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        {isSelected && !isWinner && (
                          <div style={{ position: 'absolute', top: -5, right: -5, background: 'var(--color-gold)', width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: '0.7rem' }}>✓</div>
                        )}
                      </div>
                      
                      <span style={{ fontSize: '1rem', fontWeight: 'bold', color: isSelected ? '#fff' : '#666', textAlign: 'center' }}>
                        {p.username || 'Piloto'}
                      </span>

                      {isSelected && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setWinnerId(p.id);
                          }}
                          className={`btn-premium btn-premium-sm ${isWinner ? 'btn-premium-gold' : ''}`}
                          style={{ width: '100%', fontSize: '0.65rem' }}
                        >
                          {isWinner ? '🏆 GANADOR' : 'WINNER?'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="responsive-form-grid" style={{ alignItems: 'flex-end', gap: '2rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Relato de la batalla</label>
                <input 
                  type="text" 
                  placeholder="Ej: Victoria épica de Alex con Atog..." 
                  value={matchDescription}
                  onChange={e => setMatchDescription(e.target.value)}
                  className="search-input-premium"
                  style={{ width: '100%', padding: '1.1rem', borderRadius: '16px', background: 'rgba(0,0,0,0.3)', color: 'white', border: '1px solid rgba(255,255,255,0.1)', fontSize: '1rem', outline: 'none' }}
                />
              </div>
              
              <button 
                className="btn-premium btn-premium-gold" 
                disabled={submitting || !winnerId || selectedPlayerIds.length < 2}
                style={{ 
                  height: '3.6rem', 
                  fontSize: '1.1rem', 
                  flex: 1,
                  opacity: (winnerId && selectedPlayerIds.length >= 2) ? 1 : 0.4
                }}
              >
                {submitting ? 'Sellando...' : 'FORJAR RESULTADO ⚔️'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="glass-panel" style={{ padding: '0.5rem', borderRadius: '24px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
          <thead>
            <tr style={{ color: '#888', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <th style={{ padding: '1.5rem 2rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px' }}>Rango</th>
              <th style={{ padding: '1.5rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px' }}>Jugador</th>
              <th style={{ padding: '1.5rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px' }}>Wins</th>
              <th style={{ padding: '1.5rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px' }}>Games</th>
              <th style={{ padding: '1.5rem 2rem', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '2px', textAlign: 'right' }}>Puntos</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => (
              <tr 
                key={player.id} 
                className="deck-list-row" 
                style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'all 0.2s' }}
              >
                <td style={{ padding: '1.25rem 2.5rem', fontWeight: '900', color: index < 3 ? 'var(--color-gold)' : '#444', fontSize: '1.1rem' }}>
                  #{index + 1}
                </td>
                <td style={{ padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {player.avatar_url ? (
                      <img src={player.avatar_url} style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.1)' }} />
                    ) : (
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#222', border: '1px solid #333', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 'bold' }}>{player.username?.[0]}</div>
                    )}
                    <span style={{ fontWeight: '700', fontSize: '1.1rem', color: index === 0 ? 'var(--color-gold)' : '#f0f0f0' }}>{player.username || 'Innombrable'}</span>
                  </div>
                </td>
                <td style={{ padding: '1.25rem 1.5rem', fontWeight: 'bold', color: '#aaa' }}>{player.wins}</td>
                <td style={{ padding: '1.25rem 1.5rem', color: '#666' }}>{player.matchesPlayed}</td>
                 <td style={{ padding: '1.25rem 2.5rem', textAlign: 'right' }}>
                    <span style={{ 
                      background: index === 0 ? 'linear-gradient(135deg, var(--color-gold), #b8860b)' : 'rgba(255,255,255,0.03)', 
                      color: index === 0 ? '#000' : 'var(--color-gold)', 
                      padding: '8px 20px', 
                      borderRadius: '12px', 
                      fontWeight: '900',
                      fontSize: '1rem',
                      boxShadow: index === 0 ? '0 5px 15px rgba(212,175,55,0.4)' : 'none',
                      border: index === 0 ? 'none' : '1px solid rgba(212,175,55,0.2)'
                    }}>
                     {player.points} <small style={{ fontSize: '0.65rem', fontWeight: 'bold' }}>PTS</small>
                    </span>
                 </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 1rem' }}>
        <div style={{ color: '#555', fontSize: '0.85rem', maxWidth: '400px', lineHeight: '1.4' }}>
          * El Concilio ha dictaminado: Victoria 🏆 = <strong>3 pts</strong> | Honor de Participación ⚔️ = <strong>1 pt</strong>.
        </div>
        <Link href="/matches" className="btn-premium btn-premium-sm" style={{ padding: '0.8rem 1.5rem', letterSpacing: '1px', textDecoration: 'none' }}>
          HISTORIAL DE BATALLAS →
        </Link>
      </div>
    </div>
  );
}

export default function RankingPage() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <RankingContent />
    </Suspense>
  );
}
