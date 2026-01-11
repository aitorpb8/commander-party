'use client'

import React, { useState } from 'react';

interface DeckListProps {
  cards: string[];
}

export default function DeckList({ cards }: DeckListProps) {
  const [filter, setFilter] = useState('');

  const filteredCards = cards.filter(card => 
    card.toLowerCase().includes(filter.toLowerCase())
  ).sort();

  return (
    <div className="card" style={{ marginTop: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>Lista del Mazo ({cards.length})</h3>
        <input 
          type="text" 
          placeholder="Filtrar cartas..." 
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ 
            padding: '0.4rem 0.8rem', 
            borderRadius: '6px', 
            border: '1px solid #333', 
            background: '#111', 
            color: 'white',
            fontSize: '0.8rem',
            width: '150px'
          }}
        />
      </div>

      <div style={{ 
        maxHeight: '400px', 
        overflowY: 'auto', 
        paddingRight: '0.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '0.5rem'
      }}>
        {filteredCards.length === 0 ? (
          <p style={{ color: '#666', gridColumn: '1 / -1', textAlign: 'center', padding: '1rem' }}>
            No se encontraron cartas.
          </p>
        ) : (
          filteredCards.map((card, idx) => (
            <div 
              key={idx} 
              style={{ 
                padding: '0.5rem', 
                background: '#1a1a1a', 
                borderRadius: '6px', 
                border: '1px solid #222',
                fontSize: '0.85rem',
                color: '#fff',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={card}
            >
              {card}
            </div>
          ))
        )}
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #222', textAlign: 'center' }}>
        <button 
          onClick={() => {
            const list = cards.join('\n');
            navigator.clipboard.writeText(list);
            alert('¡Lista del mazo copiada!');
          }}
          className="btn"
          style={{ padding: '0.4rem 1rem', fontSize: '0.75rem', background: '#222' }}
        >
          Copiar Lista Completa
        </button>
      </div>
    </div>
  );
}
