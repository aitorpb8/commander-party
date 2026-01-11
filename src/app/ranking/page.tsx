'use client'

import React, { useEffect, useState, Suspense } from 'react';
import { createClient } from '@/lib/supabaseClient';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function RankingContent() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const searchParams = useSearchParams();

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-gold)' }}>Clasificación de la Liga</h1>
        <button onClick={() => setShowAdd(!showAdd)} className="btn btn-gold">
          {showAdd ? 'Cancelar' : 'Registrar Resultado'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{ 
          marginBottom: '3rem', 
          maxWidth: '800px', 
          margin: '0 auto 3rem',
          border: '1px solid var(--color-gold)',
          background: 'linear-gradient(180deg, #1e1e1e 0%, #111 100%)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Anotar Partida</h2>
            <p style={{ color: '#888' }}>Selecciona los jugadores que han participado y quién se llevó la gloria.</p>
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
          }} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Player Selection Grid */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <label style={{ display: 'block', color: 'var(--color-gold)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
                  1. ¿Quiénes han jugado? (Mínimo 2)
                </label>
                {selectedPlayerIds.length >= 2 && (
                  <label style={{ color: 'var(--color-mythic)', fontWeight: 'bold', textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '1px' }}>
                    2. ¡Marca al ganador! 🏆
                  </label>
                )}
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '1rem' }}>
                {profiles.map(p => {
                  const isSelected = selectedPlayerIds.includes(p.id);
                  const isWinner = winnerId === p.id;
                  return (
                    <div 
                      key={p.id}
                      style={{
                        padding: '1rem',
                        borderRadius: '16px',
                        background: isSelected ? 'rgba(212,175,55,0.05)' : '#1a1a1a',
                        border: `2px solid ${isWinner ? 'var(--color-mythic)' : isSelected ? 'var(--color-gold)' : 'transparent'}`,
                        transition: 'all 0.2s ease',
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '0.75rem',
                        boxShadow: isWinner ? '0 0 15px rgba(255,132,0,0.3)' : 'none'
                      }}
                    >
                      <div 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedPlayerIds(selectedPlayerIds.filter(id => id !== p.id));
                            if (isWinner) setWinnerId('');
                          } else {
                            setSelectedPlayerIds([...selectedPlayerIds, p.id]);
                          }
                        }}
                        style={{ cursor: 'pointer', textAlign: 'center', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}
                      >
                        {p.avatar_url ? (
                          <img src={p.avatar_url} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: isWinner ? '3px solid var(--color-mythic)' : isSelected ? '2px solid var(--color-gold)' : '2px solid transparent' }} alt={p.username} />
                        ) : (
                          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: isSelected ? 'var(--color-gold)' : '#333', color: isSelected ? 'black' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem', fontWeight: 'bold' }}>
                            {p.username?.[0]?.toUpperCase()}
                          </div>
                        )}
                        
                        <span style={{ fontSize: '1rem', fontWeight: isSelected ? 'bold' : 'normal', color: isSelected ? 'white' : '#666' }}>
                          {p.username || 'Jugador'}
                        </span>
                      </div>

                      {isSelected && (
                        <button
                          type="button"
                          onClick={() => setWinnerId(p.id)}
                          style={{
                            marginTop: '0.25rem',
                            padding: '6px 12px',
                            fontSize: '0.8rem',
                            borderRadius: '8px',
                            background: isWinner ? 'var(--color-mythic)' : 'transparent',
                            color: isWinner ? 'black' : 'var(--color-mythic)',
                            border: `1px solid ${isWinner ? 'transparent' : 'var(--color-mythic)'}`,
                            fontWeight: '900',
                            cursor: 'pointer',
                            width: '100%',
                            transition: 'all 0.2s'
                          }}
                        >
                          {isWinner ? '🏆 GANADOR' : '¿HA GANADO?'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="responsive-form-grid">
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#888', fontSize: '0.8rem' }}>Comentario de la partida</label>
                <input 
                  type="text" 
                  placeholder="Ej: Victoria épica de Alex..." 
                  value={matchDescription}
                  onChange={e => setMatchDescription(e.target.value)}
                  style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: '#111', color: 'white', border: '1px solid #333', fontSize: '1rem' }}
                />
              </div>
              
              <button 
                className={`btn ${winnerId ? 'btn-gold' : ''}`} 
                disabled={submitting || !winnerId || selectedPlayerIds.length < 2}
                style={{ 
                  height: '3.5rem', 
                  fontSize: '1.2rem', 
                  opacity: (winnerId && selectedPlayerIds.length >= 2) ? 1 : 0.5,
                  background: winnerId ? undefined : '#333'
                }}
              >
                {submitting ? 'Registrando...' : '🚀 Guardar Resultado'}
              </button>
            </div>

            {(!winnerId || selectedPlayerIds.length < 2) && (
              <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--color-gold)', fontStyle: 'italic' }}>
                {!selectedPlayerIds.length ? 'Empieza seleccionando quién ha jugado.' : 
                 selectedPlayerIds.length < 2 ? 'Faltan oponentes...' : 
                 '¡No olvides marcar al ganador!'}
              </p>
            )}
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', width: '100%' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #333', color: '#888' }}>
              <th style={{ padding: '1rem' }}>Rango</th>
              <th style={{ padding: '1rem' }}>Jugador</th>
              <th style={{ padding: '1rem' }}>Victorias</th>
              <th style={{ padding: '1rem' }}>Partidas</th>
              <th style={{ padding: '1rem', textAlign: 'right' }}>Puntos</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((player, index) => (
              <tr key={player.id} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold' }}>#{index + 1}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {player.avatar_url && <img src={player.avatar_url} style={{ width: '24px', borderRadius: '50%' }} />}
                    <span>{player.username || 'Desconocido'}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>{player.wins}</td>
                <td style={{ padding: '1rem' }}>{player.matchesPlayed}</td>
                <td style={{ padding: '1rem', textAlign: 'right', color: 'var(--color-gold)', fontWeight: 'bold' }}>
                  {player.points} pts
                </td>
              </tr>
            ))}
          </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: '#666', fontSize: '0.8rem' }}>
          * Sistema de puntos: Victoria = 3 pts | Participación = 1 pt.
        </div>
        <Link href="/matches" style={{ color: 'var(--color-gold)', fontSize: '0.9rem', textDecoration: 'none', fontWeight: 'bold' }}>
          Ver historial completo de partidas →
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
