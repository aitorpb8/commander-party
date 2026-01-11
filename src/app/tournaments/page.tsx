'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const [rounds, setRounds] = useState(3);
  const [timerMinutes, setTimerMinutes] = useState(50);
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tournaments')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tournaments:', error);
    } else {
      setTournaments(data || []);
    }
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTournamentName.trim()) return;

    setCreating(true);
    const { data, error } = await supabase
      .from('tournaments')
      .insert({ 
        name: newTournamentName, 
        status: 'registration', 
        rounds_total: rounds,
        round_timer_minutes: timerMinutes 
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating tournament:', error);
      alert('Error al crear el torneo. Verifica que las tablas existen en Supabase.');
    } else {
      router.push(`/tournaments/${data.id}`);
    }
    setCreating(false);
    setShowCreateModal(false);
  };

  if (loading) return <div className="container" style={{ paddingTop: '2rem' }}>Cargando torneos...</div>;

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ color: 'var(--color-gold)', marginBottom: '0.5rem' }}>Torneos</h1>
          <p style={{ color: '#888' }}>Gestiona tus eventos de Commander.</p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="btn btn-gold">
          + Nuevo Torneo
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {tournaments.map((tournament) => (
          <Link key={tournament.id} href={`/tournaments/${tournament.id}`} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              border: tournament.status === 'active' ? '1px solid var(--color-gold)' : '1px solid #333'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                  <span style={{ 
                    fontSize: '0.75rem', 
                    padding: '2px 8px', 
                    borderRadius: '4px', 
                    background: tournament.status === 'active' ? 'var(--color-gold)' : '#333',
                    color: tournament.status === 'active' ? '#000' : '#888',
                    textTransform: 'uppercase',
                    fontWeight: 'bold'
                  }}>
                    {tournament.status === 'registration' ? 'Inscripción' : 
                     tournament.status === 'active' ? 'En Curso' : 'Finalizado'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#666' }}>
                    {new Date(tournament.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 style={{ marginBottom: '0.5rem', color: '#fff' }}>{tournament.name}</h3>
                <p style={{ color: '#888', fontSize: '0.9rem' }}>
                  Ronda {tournament.current_round} / {tournament.rounds_total}
                </p>
              </div>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="btn" style={{ background: '#222', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>
                  Gestionar →
                </span>
              </div>
            </div>
          </Link>
        ))}

        {tournaments.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem', color: '#666', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
            No hay torneos activos. ¡Crea el primero!
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{
            background: '#1a1a1a', padding: '2rem', borderRadius: '12px',
            width: '90%', maxWidth: '400px', border: '1px solid #333'
          }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)' }}>Nuevo Torneo</h3>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Nombre del Evento</label>
                <input 
                  type="text" 
                  value={newTournamentName}
                  onChange={e => setNewTournamentName(e.target.value)}
                  placeholder="Ej: FNM Commander"
                  style={{ width: '100%', padding: '0.8rem', background: '#222', border: '1px solid #444', color: '#fff', borderRadius: '4px' }}
                  autoFocus
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Número de Rondas</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#222', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444' }}>
                  <button 
                    type="button" 
                    onClick={() => setRounds(Math.max(1, rounds - 1))}
                    className="btn"
                    style={{ background: '#333', padding: '0.4rem 0.8rem', borderRadius: '4px' }}
                  >-</button>
                  <span style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>{rounds}</span>
                  <button 
                    type="button" 
                    onClick={() => setRounds(Math.min(10, rounds + 1))}
                    className="btn"
                    style={{ background: '#333', padding: '0.4rem 0.8rem', borderRadius: '4px' }}
                  >+</button>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Tiempo por Ronda (min)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: '#222', padding: '0.5rem', borderRadius: '4px', border: '1px solid #444' }}>
                  <button 
                    type="button" 
                    onClick={() => setTimerMinutes(Math.max(10, timerMinutes - 5))}
                    className="btn"
                    style={{ background: '#333', padding: '0.4rem 0.8rem', borderRadius: '4px' }}
                  >-</button>
                  <span style={{ flex: 1, textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}>{timerMinutes}</span>
                  <button 
                    type="button" 
                    onClick={() => setTimerMinutes(Math.min(120, timerMinutes + 5))}
                    className="btn"
                    style={{ background: '#333', padding: '0.4rem 0.8rem', borderRadius: '4px' }}
                  >+</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="btn"
                  style={{ flex: 1, background: '#333' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="btn btn-gold"
                  style={{ flex: 1 }}
                >
                  {creating ? 'Creando...' : 'Crear Torneo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
