import React from 'react';
import { TournamentPlayer } from '@/lib/tournamentUtils';
import { calculateDeckBudget } from '@/lib/budgetUtils';
import Image from 'next/image';

interface TournamentRegistrationProps {
  participants: TournamentPlayer[];
  onAddPlayer: () => void;
  onOpenDeckModal: (p: TournamentPlayer) => void;
  onOpenCommanderModal: (pid: string) => void;
  isOwner?: boolean;
}

const TournamentRegistration: React.FC<TournamentRegistrationProps> = ({
  participants,
  onAddPlayer,
  onOpenDeckModal,
  onOpenCommanderModal,
  isOwner = false
}) => {
  return (
    <div className="registration-tab">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>Jugadores Inscritos</h3>
            <p style={{ color: '#666', fontSize: '0.9rem', margin: '4px 0 0' }}>{participants.length} participantes registrados para la Party.</p>
        </div>
        {isOwner && (
            <button onClick={onAddPlayer} className="btn-premium btn-premium-gold">
                + Añadir Jugadores
            </button>
        )}
      </div>

      {participants.length === 0 ? (
        <div style={{ padding: '6rem 2rem', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '32px', border: '1px dashed rgba(255,255,255,0.1)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.2 }}>👥</div>
            <p style={{ color: '#444', fontSize: '1.1rem', margin: 0 }}>No hay jugadores inscritos en este torneo.</p>
            {isOwner && <button onClick={onAddPlayer} className="btn-premium btn-premium-gold" style={{ marginTop: '1.5rem' }}>Empezar Inscripción</button>}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '2rem' }}>
          {participants.map(p => {
            const deck = (p as any).decks || {};
            const { dynamicLimit, totalSpent } = (deck.created_at) 
                ? calculateDeckBudget(deck.created_at, (p as any).decks?.budget_spent || 0)
                : { dynamicLimit: 0, totalSpent: 0 };
            
            const isOverBudget = totalSpent > dynamicLimit;
            const statusColor = p.is_dropped ? 'var(--color-red)' : (isOverBudget ? '#ff9800' : 'var(--color-green)');

            return (
              <div key={p.id} className="tournament-player-card" style={{ 
                background: 'var(--bg-card)',
                backdropFilter: 'blur(12px)',
                border: `1px solid ${p.is_dropped ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255, 255, 255, 0.05)'}`,
                borderRadius: '24px',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                minHeight: '380px',
                opacity: p.is_dropped ? 0.6 : 1,
                transition: 'all 0.3s ease',
                position: 'relative'
              }}>
                {/* Header Image (Commander) */}
                <div style={{ height: '180px', position: 'relative', overflow: 'hidden' }}>
                    <img 
                        src={(p as any).commander_image_url || 'https://via.placeholder.com/600x200?text=Sin+Comandante'} 
                        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center 20%' }} 
                        alt={p.profiles?.username}
                    />
                    <div style={{ 
                        position: 'absolute', inset: 0, 
                        background: 'linear-gradient(to bottom, transparent 30%, rgba(10, 10, 11, 0.95) 100%)', 
                        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', padding: '1.25rem' 
                    }}>
                        <h4 style={{ margin: 0, color: '#fff', fontSize: '1.1rem', fontWeight: '900', letterSpacing: '0.05em', lineHeight: '1.1', textTransform: 'uppercase', fontFamily: 'var(--font-title)' }}>
                            {((p as any).decks?.name || (p as any).commander_name || 'Sin mazo')}
                        </h4>
                        <div style={{ fontSize: '0.65rem', color: 'var(--color-gold)', fontWeight: 'bold', letterSpacing: '0.5px', marginTop: '0.3rem', opacity: 0.8 }}>
                            {(p as any).commander_name}
                        </div>
                    </div>
                    {p.is_dropped && (
                        <div style={{ position: 'absolute', top: '15px', right: '15px', background: 'var(--color-red)', color: '#fff', padding: '4px 10px', borderRadius: '8px', fontSize: '0.65rem', fontWeight: '900', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}>
                            RETIRADO
                        </div>
                    )}
                </div>

                {/* Info Content */}
                <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                        <div style={{ position: 'relative', width: '44px', height: '44px' }}>
                            {p.profiles?.avatar_url ? (
                                <img src={p.profiles.avatar_url} style={{ width: '100%', height: '100%', borderRadius: '50%', border: `2px solid ${statusColor}`, objectFit: 'cover' }} />
                            ) : (
                                <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.05)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem', fontWeight: '900', color: '#fff' }}>
                                    {p.profiles?.username?.charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div style={{ position: 'absolute', bottom: -1, right: -1, width: '13px', height: '13px', borderRadius: '50%', background: statusColor, border: '2.5px solid #0a0a0b' }}></div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1.5px', fontWeight: 'bold' }}>PILOTO</span>
                            <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>{p.profiles?.username}</div>
                        </div>
                    </div>

                    <div style={{ marginTop: 'auto' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1rem' }}>
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.6rem 0.8rem', borderRadius: '10px', borderLeft: `3px solid ${isOverBudget ? 'var(--color-red)' : 'var(--color-green)'}` }}>
                                <span style={{ display: 'block', fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>INVERSIÓN</span>
                                <span style={{ fontSize: '1.1rem', color: isOverBudget ? 'var(--color-red)' : '#fff', fontWeight: '900', fontFamily: 'monospace' }}>{totalSpent.toFixed(2)}€</span>
                            </div>
                            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '0.6rem 0.8rem', borderRadius: '10px', borderRight: '3px solid var(--color-gold)', textAlign: 'right' }}>
                                <span style={{ display: 'block', fontSize: '0.55rem', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '3px' }}>CUPO TOTAL</span>
                                <span style={{ fontSize: '1.1rem', color: 'var(--color-gold)', fontWeight: '900', fontFamily: 'monospace' }}>{dynamicLimit.toFixed(2)}€</span>
                            </div>
                        </div>

                        {isOwner && (
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button onClick={() => onOpenDeckModal(p)} className="btn-premium btn-premium-dark btn-premium-sm" style={{ flex: 1, height: '36px' }}>CAMBIAR MAZO</button>
                                <button onClick={() => onOpenCommanderModal(p.id)} className="btn-premium btn-premium-gold btn-premium-sm" style={{ flex: 1, height: '36px' }}>EDITAR CMDR</button>
                            </div>
                        )}
                    </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TournamentRegistration;
