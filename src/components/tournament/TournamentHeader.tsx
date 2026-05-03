import React from 'react';
import Link from 'next/link';
import TournamentTimer from '@/components/TournamentTimer';

interface TournamentHeaderProps {
  tournament: any;
  onStart: () => void;
  onNextRound: () => void;
  onPrevRound: () => void;
  onDelete: () => void;
}

const TournamentHeader: React.FC<TournamentHeaderProps> = ({
  tournament,
  onStart,
  onNextRound,
  onPrevRound,
  onDelete
}) => {
  return (
    <header style={{ 
        marginBottom: '2.5rem', 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        background: 'rgba(255, 255, 255, 0.02)',
        padding: '1.5rem 2rem',
        borderRadius: '24px',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(10px)'
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.85rem' }}>
          <Link href="/tournaments" style={{ color: '#666', textDecoration: 'none', fontWeight: '800', letterSpacing: '1px' }}>TORNEOS</Link>
          <span style={{ color: '#333' }}>/</span>
          <span style={{ color: 'var(--color-gold)', fontWeight: '800', letterSpacing: '1px' }}>{tournament.name.toUpperCase()}</span>
        </div>
        <h1 style={{ color: '#fff', margin: 0, fontSize: '2.2rem', fontFamily: 'var(--font-title)', letterSpacing: '1px' }}>
            {tournament.name}
        </h1>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <span style={{ 
            fontSize: '0.7rem', padding: '4px 12px', borderRadius: '20px', 
            background: tournament.status === 'active' ? 'var(--color-gold)' : '#1a1a1b',
            color: tournament.status === 'active' ? '#000' : '#888',
            fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px',
            boxShadow: tournament.status === 'active' ? '0 0 15px rgba(212, 175, 55, 0.3)' : 'none'
          }}>
            {tournament.status === 'registration' ? 'Inscripción Abierta' : 
             tournament.status === 'active' ? 'Torneo en Curso' : 'Finalizado'}
          </span>
          <span style={{ color: '#555', fontSize: '0.9rem', fontWeight: 'bold' }}>
              Ronda <span style={{ color: '#fff' }}>{tournament.current_round}</span> de <span style={{ color: '#fff' }}>{tournament.rounds_total}</span>
          </span>
        </div>
      </div>
      
      <div style={{ display: 'flex', gap: '1.2rem', alignItems: 'center' }}>
         {tournament.status === 'active' && tournament.current_round_start_time && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem 1.25rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <TournamentTimer 
                    startTime={tournament.current_round_start_time} 
                    durationMinutes={tournament.round_timer_minutes || 50} 
                />
            </div>
         )}
         
         <div style={{ display: 'flex', gap: '0.75rem' }}>
            {tournament.status === 'registration' && (
                <button onClick={onStart} className="btn-premium btn-premium-gold" style={{ padding: '0.8rem 1.8rem' }}>
                    Comenzar Torneo
                </button>
            )}
            {tournament.status === 'active' && (
                <>
                    {tournament.current_round > 1 && (
                        <button onClick={onPrevRound} className="btn-premium btn-premium-dark" title="Volver a ronda anterior">
                            ← Ronda {tournament.current_round - 1}
                        </button>
                    )}
                    <button onClick={onNextRound} className="btn-premium btn-premium-gold">
                        {tournament.current_round === tournament.rounds_total ? 'Finalizar Torneo' : `Ronda ${tournament.current_round + 1} →`}
                    </button>
                </>
            )}
            <button onClick={onDelete} className="btn-premium btn-premium-red" style={{ padding: '0.8rem 1rem' }} title="Eliminar Torneo">
                🗑️
            </button>
         </div>
      </div>
    </header>
  );
};

export default TournamentHeader;
