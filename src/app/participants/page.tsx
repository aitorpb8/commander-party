'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import { calculateAchievements, Badge } from '@/lib/achievements';
import { Tooltip } from '@/components/Tooltip';

export default function ParticipantsPage() {
  const [players, setPlayers] = useState<(any & { badges: Badge[] })[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchPlayers = async () => {
      const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
      const { data: decks, error: dError } = await supabase.from('decks').select('*');
      const { data: upgrades, error: uError } = await supabase.from('deck_upgrades').select('*');
      const { data: matches, error: mError } = await supabase.from('matches').select('*');

      if (pError || dError || uError || mError) {
        console.error("Error fetching data:", pError || dError || uError || mError);
        setLoading(false);
        return;
      }

      if (!profiles) {
        setLoading(false);
        return;
      }

      const playersWithDecks = profiles.map((profile) => {
        const userDecks = decks?.filter(d => d.user_id === profile.id) || [];
        const badges = calculateAchievements({
          decks: decks || [],
          upgrades: upgrades || [],
          matches: matches || [],
          userId: profile.id
        });

        return { 
          ...profile, 
          deck_count: userDecks.length,
          badges
        };
      });

      setPlayers(playersWithDecks);
      setLoading(false);
    };

    fetchPlayers();
  }, []);

  if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Cargando participantes...</div>;

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--color-gold)', marginBottom: '0.5rem' }}>Participantes de la Liga</h1>
          <p style={{ color: '#888' }}>Todos los pilotos registrados en la liga Commander.</p>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {players.map((player) => (
          <div key={player.id} className="card" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '1rem',
            border: player.badges.some((b: Badge) => b.id === 'slayer') ? '1px solid rgba(212, 175, 55, 0.3)' : '1px solid #333'
          }}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {player.avatar_url ? (
                <img 
                  src={player.avatar_url} 
                  alt={player.username} 
                  style={{ width: '60px', height: '60px', borderRadius: '50%', border: '2px solid #333' }}
                />
              ) : (
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  borderRadius: '50%', 
                  background: '#1a1a1a', 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '1.5rem',
                  border: '2px solid #333',
                  color: 'var(--color-gold)'
                }}>
                  {player.username?.charAt(0) || '?'}
                </div>
              )}
              
              <div style={{ flex: 1 }}>
                <h3 style={{ marginBottom: '0.25rem' }}>{player.username || 'Usuario'}</h3>
                <p style={{ fontSize: '0.85rem', color: '#888' }}>{player.deck_count} Mazos registrados</p>
                {player.bio && (
                  <p style={{ fontSize: '0.75rem', color: '#666', marginTop: '0.5rem', fontStyle: 'italic', lineHeight: '1.2' }}>
                    "{player.bio.length > 80 ? player.bio.substring(0, 80) + '...' : player.bio}"
                  </p>
                )}
              </div>
            </div>

            {/* Badges Section */}
            {player.badges.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', padding: '0.5rem', background: '#111', borderRadius: '8px' }}>
                {player.badges.map((badge: Badge) => (
                  <Tooltip 
                    key={badge.id}
                    content={
                      <div>
                        <strong style={{ color: badge.color, display: 'block', marginBottom: '4px' }}>{badge.name}</strong>
                        {badge.description}
                      </div>
                    }
                  >
                    <div 
                      style={{ 
                        fontSize: '1.2rem', 
                        cursor: 'help',
                        background: 'rgba(255,255,255,0.05)',
                        padding: '4px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {badge.icon}
                    </div>
                  </Tooltip>
                ))}
              </div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
              <Link href={`/decks?user=${player.id}`}>
                <button className="btn btn-gold" style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}>
                  Ver Mazos
                </button>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {players.length === 0 && (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#666' }}>
          No hay jugadores registrados todavía.
        </div>
      )}
    </div>
  );
}
