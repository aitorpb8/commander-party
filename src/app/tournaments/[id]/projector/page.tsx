'use client'

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import TournamentTimer from '@/components/TournamentTimer';

export default function ProjectorPage() {
  const { id } = useParams();
  const [tournament, setTournament] = useState<any>(null);
  const [participants, setParticipants] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  // Auto-refresh every 30s
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [id]);

  const loadData = async () => {
    // 1. Tournament Info
    const { data: tData } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', id)
      .single();
    
    setTournament(tData);

    // 2. Participants
    const { data: pData } = await supabase
      .from('tournament_participants')
      .select('*, profiles(username, avatar_url)')
      .eq('tournament_id', id);
    setParticipants(pData || []);

    // 3. Matches
    if (tData) {
        const { data: mData } = await supabase
        .from('tournament_matches')
        .select('*, matches(*)')
        .eq('tournament_id', id)
        .eq('round_number', tData.current_round); // Only current round needed
        
        setMatches(mData || []);
    }
    
    setLoading(false);
  };

  if (loading || !tournament) return <div style={{ background: '#000', color: '#fff', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '2rem' }}>Cargando...</div>;

  // Render Logic
  const isRegistration = tournament.status === 'registration';
  const isCompleted = tournament.status === 'completed';
  const isActive = tournament.status === 'active';

  // Sort Standings
  const sortedStandings = [...participants].sort((a, b) => b.points - a.points);

  return (
    <div style={{ background: '#000', minHeight: '100vh', color: '#fff', padding: '2rem', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem', borderBottom: '2px solid #333', paddingBottom: '1rem' }}>
         <h1 style={{ fontSize: '3rem', margin: 0, color: 'var(--color-gold)' }}>{tournament.name}</h1>
         <div style={{ textAlign: 'right' }}>
             <div style={{ fontSize: '1.5rem', textTransform: 'uppercase', letterSpacing: '2px', color: '#888' }}>
                 {isRegistration ? 'INSCRIPCIÓN' : isCompleted ? 'FINALIZADO' : `RONDA ${tournament.current_round} / ${tournament.rounds_total}`}
             </div>
             {isActive && tournament.current_round_start_time && (
                 <div style={{ fontSize: '2rem', marginTop: '0.5rem' }}>
                    <TournamentTimer startTime={tournament.current_round_start_time} durationMinutes={tournament.round_timer_minutes || 50} />
                 </div>
             )}
         </div>
      </div>

      {/* Main Content */}
      <div style={{ display: 'grid', gridTemplateColumns: isActive ? '2fr 1fr' : '1fr', gap: '3rem' }}>
          
          {/* Left Column: Pairings (if Active) or Standings (if others) */}
          <div>
              {isActive ? (
                  <>
                    <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#ccc' }}>Emparejamientos</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                        {matches.map(tm => (
                            <div key={tm.id} style={{ 
                                background: tm.matches.winner_id ? '#1a331a' : '#1a1a1a', 
                                border: tm.matches.winner_id ? '2px solid #4CAF50' : '2px solid #333',
                                borderRadius: '16px', padding: '1.5rem' 
                            }}>
                                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#888', marginBottom: '1rem' }}>Mesa {tm.table_number}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                                    {tm.matches.players.map((pid: string) => {
                                        const p = participants.find(part => part.player_id === pid);
                                        const isWinner = pid === tm.matches.winner_id;
                                        return (
                                            <div key={pid} style={{ 
                                                display: 'flex', alignItems: 'center', gap: '1rem', 
                                                fontSize: '1.2rem',
                                                color: isWinner ? '#4CAF50' : '#fff'
                                            }}>
                                                {p?.commander_image_url ? (
                                                    <img src={p.commander_image_url} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #333' }} />
                                                ) : (
                                                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#333' }}></div>
                                                )}
                                                <span style={{ fontWeight: isWinner ? 'bold' : 'normal' }}>{p?.profiles?.username}</span>
                                                {isWinner && '🏆'}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                  </>
              ) : (
                  // Standings View (Registration / Completed)
                  <>
                     <h2 style={{ fontSize: '2rem', marginBottom: '1.5rem', color: '#ccc' }}>Clasificación</h2>
                     <div style={{ background: '#111', borderRadius: '16px', overflow: 'hidden' }}>
                         {sortedStandings.map((p, i) => (
                             <div key={p.id} style={{ 
                                 display: 'flex', alignItems: 'center', padding: '1.5rem', 
                                 background: i % 2 === 0 ? '#1a1a1a' : '#111',
                                 borderBottom: '1px solid #222'
                             }}>
                                 <div style={{ fontSize: '2rem', fontWeight: 'bold', width: '80px', color: i < 3 ? 'var(--color-gold)' : '#666' }}>#{i+1}</div>
                                 <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                     {p.profiles?.avatar_url && <img src={p.profiles.avatar_url} style={{ width: '60px', height: '60px', borderRadius: '50%' }} />}
                                     <div style={{ fontSize: '1.8rem' }}>{p.profiles?.username}</div>
                                 </div>
                                 <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>{p.points} <span style={{ fontSize: '1rem', color: '#666' }}>PTS</span></div>
                             </div>
                         ))}
                     </div>
                  </>
              )}
          </div>

          {/* Right Column: Standings Sidebar (Only when Active) */}
          {isActive && (
              <div style={{ borderLeft: '1px solid #333', paddingLeft: '2rem' }}>
                  <h3 style={{ fontSize: '1.5rem', color: '#888', marginBottom: '1rem' }}>Top Standing</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {sortedStandings.slice(0, 8).map((p, i) => (
                          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', padding: '0.8rem', background: '#111', borderRadius: '8px' }}>
                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                  <span style={{ color: '#666' }}>#{i+1}</span>
                                  <span>{p.profiles?.username}</span>
                              </div>
                              <div style={{ fontWeight: 'bold' }}>{p.points}</div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

      </div>
    </div>
  );
}
