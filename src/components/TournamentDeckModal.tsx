'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { Z_INDEX_MODAL } from '@/lib/constants';

interface TournamentDeckModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerDecks: any[];
  onSelect: (deck: any) => void;
  playerName: string;
}

export default function TournamentDeckModal({
  isOpen,
  onClose,
  playerDecks,
  onSelect,
  playerName
}: TournamentDeckModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: Z_INDEX_MODAL,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      backdropFilter: 'blur(8px)'
    }} onClick={onClose}>
      <div 
        className="card" 
        style={{ 
          maxWidth: '500px', width: '100%', maxHeight: '80vh', 
          display: 'flex', flexDirection: 'column',
          background: '#121212', border: '1px solid #333',
          padding: '2rem', borderRadius: '16px'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--color-gold)' }}>Seleccionar Mazo</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>
        
        <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Elige el mazo que usará <strong>{playerName}</strong> en este torneo.
        </p>

        <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {playerDecks.length > 0 ? (
            playerDecks.map(deck => (
              <button
                key={deck.id}
                onClick={() => onSelect(deck)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '1rem',
                  background: '#1a1a1a',
                  border: '1px solid #333',
                  borderRadius: '12px',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--color-gold)';
                  e.currentTarget.style.background = '#222';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = '#333';
                  e.currentTarget.style.background = '#1a1a1a';
                }}
              >
                <div style={{ 
                  width: '40px', height: '40px', borderRadius: '8px', 
                  background: '#333', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {deck.image_url ? (
                    <img src={deck.image_url} style={{ width: '100%', height: '100%', borderRadius: '8px', objectFit: 'cover' }} />
                  ) : '🃏'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold' }}>{deck.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888' }}>{deck.commander}</div>
                </div>
              </button>
            ))
          ) : (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#555', fontStyle: 'italic' }}>
              Este jugador no tiene mazos registrados.
            </div>
          )}
        </div>

        <button 
          onClick={onClose} 
          className="btn" 
          style={{ marginTop: '1.5rem', background: '#333', width: '100%' }}
        >
          Cancelar
        </button>
      </div>
    </div>,
    document.body
  );
}
