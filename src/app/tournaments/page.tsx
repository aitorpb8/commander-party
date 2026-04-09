'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user } = useAuth();

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
        <button 
          onClick={() => {
            if (!user) {
              router.push('/login?returnUrl=/tournaments');
              return;
            }
            setShowCreateModal(true);
          }} 
          className="btn btn-gold"
        >
          + Nuevo Torneo
        </button>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: '2rem' }}>
        {tournaments.map((tournament) => (
          <Link key={tournament.id} href={`/tournaments/${tournament.id}`} style={{ textDecoration: 'none' }}>
            <div className="card glass-panel" style={{ 
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              padding: '2rem',
              border: tournament.status === 'active' ? '1px solid var(--color-gold)' : '1px solid var(--border-color)',
              boxShadow: tournament.status === 'active' ? '0 0 30px rgba(212,175,55,0.1)' : 'none'
            }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                  <span style={{ 
                    fontSize: '0.7rem', 
                    padding: '4px 12px', 
                    borderRadius: '20px', 
                    background: tournament.status === 'active' ? 'var(--color-gold)' : 'rgba(255,255,255,0.05)',
                    color: tournament.status === 'active' ? '#000' : '#888',
                    textTransform: 'uppercase',
                    fontWeight: '800',
                    letterSpacing: '1px'
                  }}>
                    {tournament.status === 'registration' ? 'Inscripción' : 
                     tournament.status === 'active' ? 'En Curso' : 'Finalizado'}
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#555', fontWeight: 'bold' }}>
                    {new Date(tournament.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h3 style={{ marginBottom: '0.5rem', color: '#fff', fontFamily: 'var(--font-title)', letterSpacing: '1px' }}>{tournament.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  <span style={{ color: 'var(--color-gold)' }}>●</span>
                  Ronda {tournament.current_round} / {tournament.rounds_total}
                </div>
              </div>
              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="btn-premium btn-premium-sm" style={{ background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold)', borderRadius: '30px' }}>
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
          background: 'rgba(0,0,0,0.9)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}>
          <div className="glass-panel premium-border" style={{
            padding: '2.5rem', borderRadius: '24px',
            width: '90%', maxWidth: '440px',
            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.9)',
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <h2 style={{ marginBottom: '2rem', color: 'var(--color-gold)', fontFamily: 'var(--font-title)', letterSpacing: '1px', textAlign: 'center' }}>Nuevo Torneo</h2>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Nombre del Evento</label>
                <input 
                  type="text" 
                  value={newTournamentName}
                  onChange={e => setNewTournamentName(e.target.value)}
                  placeholder="Ej: FNM Commander"
                  style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '12px', fontSize: '1rem', outline: 'none' }}
                  autoFocus
                  className="search-input-premium"
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Número de Rondas</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button 
                    type="button" 
                    onClick={() => setRounds(Math.max(1, rounds - 1))}
                    className="btn-premium btn-premium-sm"
                    style={{ background: '#222', padding: '0.5rem 1rem' }}
                  >-</button>
                  <span style={{ flex: 1, textAlign: 'center', fontSize: '1.3rem', fontWeight: '900', color: 'var(--color-gold)', fontFamily: 'monospace' }}>{rounds}</span>
                  <button 
                    type="button" 
                    onClick={() => setRounds(Math.min(10, rounds + 1))}
                    className="btn-premium btn-premium-sm"
                    style={{ background: '#222', padding: '0.5rem 1rem' }}
                  >+</button>
                </div>
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', marginBottom: '0.75rem', color: '#888', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Tiempo (minutos)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '0.75rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <button 
                    type="button" 
                    onClick={() => setTimerMinutes(Math.max(10, timerMinutes - 5))}
                    className="btn-premium btn-premium-sm"
                    style={{ background: '#222', padding: '0.5rem 1rem' }}
                  >-</button>
                  <span style={{ flex: 1, textAlign: 'center', fontSize: '1.3rem', fontWeight: '900', color: 'var(--color-gold)', fontFamily: 'monospace' }}>{timerMinutes}</span>
                  <button 
                    type="button" 
                    onClick={() => setTimerMinutes(Math.min(120, timerMinutes + 5))}
                    className="btn-premium btn-premium-sm"
                    style={{ background: '#222', padding: '0.5rem 1rem' }}
                  >+</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  className="btn-premium"
                  style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#888' }}
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={creating}
                  className="btn-premium btn-premium-gold"
                  style={{ flex: 1.5 }}
                >
                  {creating ? 'Creando...' : 'FORJAR EVENTO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
