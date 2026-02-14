
import React from 'react';

interface DeckCardProps {
  playerName: string;
  playerAvatar?: string;
  deckName: string;
  commanderName: string;
  spent: number;
  budget: number; // monthly limit (usually from MONTHLY_ALLOWANCE)

  imageUrl: string;
  colors: string[]; // e.g. ['R', 'U']
}

export default function DeckCard({ playerName, playerAvatar, deckName, commanderName, spent, budget, imageUrl }: DeckCardProps) {
  const percentage = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0);
  const getStatusColor = () => {
    if (spent > budget + 1) return 'var(--color-red)';
    if (spent > budget) return '#ff9800'; // Orange
    return 'var(--color-green)';
  };

  const statusColor = getStatusColor();

  return (
    <div className="card deck-card">
      <img 
        src={imageUrl} 
        alt={commanderName} 
        className="deck-card-img"
      />
      
      <div style={{ flex: 1, width: '100%' }}>
        <h3 style={{ marginBottom: '0.5rem', color: 'var(--text-primary)', fontSize: '1.6rem', fontWeight: '900' }}>{deckName}</h3>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          {playerAvatar ? (
            <img src={playerAvatar} alt={playerName} style={{ width: '28px', height: '28px', borderRadius: '50%', border: '1px solid var(--color-gold)' }} />
          ) : (
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--color-gold)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: '900' }}>
              {playerName[0].toUpperCase()}
            </div>
          )}
          <p style={{ fontSize: '1.15rem', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'white', fontWeight: '600' }}>{playerName}</span>
          </p>
        </div>

        {/* Budget Bar */}
        <div style={{ background: '#333', height: '8px', borderRadius: '4px', overflow: 'hidden', marginBottom: '0.6rem' }}>
          <div style={{ 
            width: `${percentage}%`, 
            height: '100%', 
            background: statusColor,
            transition: 'width 0.5s ease'
          }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', color: '#888' }}>
          <span style={{ color: spent > budget ? statusColor : '#FFF', fontWeight: 'bold' }}>{spent.toFixed(2)}€</span>
          <span>Cupo: {budget.toFixed(2)}€</span>
        </div>
      </div>
    </div>
  );
}
