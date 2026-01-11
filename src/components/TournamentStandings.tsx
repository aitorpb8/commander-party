import React from 'react';
import { TournamentPlayer } from '@/lib/tournamentUtils';

interface TournamentStandingsProps {
  participants: TournamentPlayer[];
}

export default function TournamentStandings({ participants }: TournamentStandingsProps) {
  // Sort Logic: Points > Wins > OMW% > Username
  // We assume participants are already passed with OMW calculated, but re-sorting here is safe for display
  const sorted = [...participants].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.wins !== a.wins) return b.wins - a.wins;
    // OMW
    const omwA = a.omw || 0.33;
    const omwB = b.omw || 0.33;
    if (Math.abs(omwB - omwA) > 0.0001) return omwB - omwA;

    return a.profiles?.username.localeCompare(b.profiles?.username || '') || 0;
  });

  return (
    <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
      <div style={{ padding: '1rem', background: '#111', borderBottom: '1px solid #333', fontWeight: 'bold' }}>
        Clasificación Actual
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1a1a1a', textAlign: 'left', fontSize: '0.8rem', color: '#888', textTransform: 'uppercase' }}>
              <th style={{ padding: '1rem', width: '50px' }}>#</th>
              <th style={{ padding: '1rem' }}>Jugador</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>Pts</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>OMW%</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>W</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>L</th>
              <th style={{ padding: '1rem', textAlign: 'center' }}>D</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p, index) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #222' }}>
                <td style={{ padding: '1rem', fontWeight: 'bold', color: index < 4 ? 'var(--color-gold)' : '#666' }}>
                  {index + 1}
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    {p.profiles?.avatar_url ? (
                      <img src={p.profiles.avatar_url} style={{ width: '24px', height: '24px', borderRadius: '50%' }} />
                    ) : (
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#333', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.7rem' }}>
                        {p.profiles?.username?.charAt(0) || '?'}
                      </div>
                    )}
                    <span>{p.profiles?.username || 'Desconocido'}</span>
                  </div>
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>{p.points}</td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#aaa', fontSize: '0.9rem' }}>
                    {((p.omw || 0.33) * 100).toFixed(1)}%
                </td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#4CAF50' }}>{p.wins}</td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#F44336' }}>{p.losses}</td>
                <td style={{ padding: '1rem', textAlign: 'center', color: '#FFC107' }}>{p.draws}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>
                  No hay jugadores registrados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
