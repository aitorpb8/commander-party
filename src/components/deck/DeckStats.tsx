'use client'

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DeckCard } from '@/types';
import { calculateDeckBracket, EXTRA_TURN_CARDS } from '@/lib/magicUtils';

interface DeckStatsProps {
  cards: DeckCard[];
}

export default function DeckStats({ cards }: DeckStatsProps) {
  const [showBracketInfo, setShowBracketInfo] = useState(false);

  // 1. Calculate Deck Stats
  const totalCards = cards.reduce((acc, c) => acc + c.quantity, 0);
  const isLegalSize = totalCards === 100;

  // 2. Use Centralized Logic
  const bracketResult = calculateDeckBracket(cards);
  const { 
    level: bracketLevel, 
    reason: determinationReason, 
    detectedCombos, 
    restrictedCards, 
    extraTurnCount 
  } = bracketResult;

  // 3. Custom Bracket Label (Visual Only)
  const getBracketLabel = (level: number) => {
    switch (level) {
      case 1: return { 
          label: 'BRACKET 1', 
          sub: 'Exhibition',
          gradient: 'linear-gradient(135deg, #FDD835, #FBC02D)', 
          shadow: '0 0 10px rgba(253, 216, 53, 0.4)',
          color: '#FDD835'
      }; 
      case 2: return { 
          label: 'BRACKET 2', 
          sub: 'Core',
          gradient: 'linear-gradient(135deg, #66BB6A, #43A047)', 
          shadow: '0 0 10px rgba(102, 187, 106, 0.4)', 
          color: '#66BB6A'
      };
      case 3: return { 
          label: 'BRACKET 3', 
          sub: 'Upgraded',
          gradient: 'linear-gradient(135deg, #FFA726, #FB8C00)', 
          shadow: '0 0 10px rgba(255, 167, 38, 0.4)', 
          color: '#FFA726'
      };
      case 4: return { 
          label: 'BRACKET 4', 
          sub: 'Optimized',
          gradient: 'linear-gradient(135deg, #EF5350, #E53935)', 
          shadow: '0 0 10px rgba(239, 83, 80, 0.4)', 
          color: '#EF5350'
      };
      case 5: return { 
          label: 'BRACKET 5', 
          sub: 'cEDH',
          gradient: 'linear-gradient(135deg, #7f00ff, #e100ff)', 
          shadow: '0 0 15px rgba(225, 0, 255, 0.5)', 
          color: '#e100ff'
      }; 
      default: return { label: '?', sub: 'Unknown', gradient: '#444', color: '#888', shadow: 'none' };
    }
  };
  
  const bracketInfo = getBracketLabel(bracketLevel);

  return (
    <>
      {/* 1. Deck Count Validator */}
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '6px', 
        padding: '6px 14px', borderRadius: '30px', 
        background: isLegalSize ? 'rgba(76, 175, 80, 0.15)' : 'rgba(244, 67, 54, 0.15)',
        border: `1px solid ${isLegalSize ? '#4caf50' : '#f44336'}`,
        fontSize: '0.75rem', fontWeight: 'bold',
        height: '36px'
      }}>
        <span style={{ color: isLegalSize ? '#66bb6a' : '#ef5350', whiteSpace: 'nowrap' }}>
          {totalCards}/100
        </span>
        <span style={{ fontSize: '0.9rem' }}>{isLegalSize ? '✅' : '⚠️'}</span>
      </div>

      {/* 2. Bracket Display (Clickable Tooltip) */}
      <div 
        style={{ 
          position: 'relative',
          padding: '2px 3px', 
          borderRadius: '30px', 
          background: `linear-gradient(to bottom right, #333, #000)`,
          cursor: 'pointer',
          boxShadow: bracketInfo.shadow,
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          height: '36px',
          display: 'flex', alignItems: 'center'
        }}
        title="Ver nivel de poder"
        onClick={() => setShowBracketInfo(true)}
      >
        <div style={{
            background: bracketInfo.gradient,
            borderRadius: '24px',
            padding: '0 16px',
            height: '100%',
            display: 'flex', alignItems: 'center', gap: '10px',
            color: '#fff',
            textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            boxSizing: 'border-box'
        }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', letterSpacing: '0.05em' }}>{bracketInfo.label}</span>
            <div style={{ 
                background: 'rgba(255,255,255,0.2)', 
                borderRadius: '50%', 
                width: '20px', height: '20px', 
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid rgba(255,255,255,0.4)'
            }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
            </div>
        </div>
      </div>

      {/* Bracket Info Modal */}
      {showBracketInfo && typeof document !== 'undefined' && createPortal(
        <div 
          style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.8)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '2rem'
          }}
          onClick={() => setShowBracketInfo(false)}
        >
          <div 
            style={{
              background: '#1e1e1e',
              padding: '2rem',
              borderRadius: '16px',
              maxWidth: '800px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid #333',
              boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
              position: 'relative'
            }}
            onClick={e => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowBracketInfo(false)}
              style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}
            >
              &times;
            </button>
            
            <h3 style={{ marginTop: 0, color: 'var(--color-gold)', marginBottom: '0.5rem' }}>
              Commander Brackets (Beta)
            </h3>
            <p style={{ color: '#888', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
              Guía de niveles de poder para alinear expectativas antes de la partida.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
              {[1, 2, 3, 4, 5].map(lvl => {
                const info = getBracketLabel(lvl);
                return (
                  <div key={lvl} style={{ 
                    background: '#2a2a2a', 
                    padding: '1rem', 
                    borderRadius: '8px', 
                    border: bracketLevel === lvl ? `2px solid ${info.color}` : '1px solid #333',
                    opacity: bracketLevel === lvl ? 1 : 0.6
                  }}>
                    <h4 style={{ color: info.color, margin: '0 0 0.5rem 0', fontSize: '1rem' }}>{lvl}. {info.sub}</h4>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', background: bracketInfo.color + '22', border: `1px solid ${bracketInfo.color}`, borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <strong style={{ color: bracketInfo.color, fontSize: '1.1rem' }}>Resultado: {bracketInfo.label}</strong>
              </div>
              <p style={{ margin: '0.5rem 0 0 0', color: '#ddd', fontSize: '0.95rem' }}>
                  {determinationReason}
              </p>
                
                {(restrictedCards.length > 0 || detectedCombos.length > 0) && (
                  <div style={{ marginTop: '1rem' }}>
                     {detectedCombos.length > 0 && (
                        <div style={{ marginBottom: '1rem' }}>
                            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Combos Detectados:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                {detectedCombos.map(name => (
                                    <span key={name} style={{ background: 'rgba(255,0,0,0.2)', color: '#ff9999', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{name}</span>
                                ))}
                            </div>
                        </div>
                     )}
                     
                     {extraTurnCount > 0 && (
                          <div style={{ marginBottom: '1rem' }}>
                              <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Turnos Extra ({extraTurnCount}):</span>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                  {cards.filter(c => EXTRA_TURN_CARDS.has(c.card_name.toLowerCase())).map((c, idx) => (
                                      <span key={idx} style={{ background: 'rgba(255, 152, 0, 0.2)', color: '#ffb74d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{c.card_name}</span>
                                  ))}
                              </div>
                          </div>
                     )}

                     {restrictedCards.length > 0 && (
                        <div>
                             <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Cartas Restringidas:</span>
                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                {restrictedCards.map((c, idx) => (
                                    <div key={idx} style={{ 
                                        background: c.reason.includes('Game Changer') ? 'rgba(255, 152, 0, 0.15)' : 'rgba(244, 67, 54, 0.15)', 
                                        border: c.reason.includes('Game Changer') ? '1px solid rgba(255, 152, 0, 0.3)' : '1px solid rgba(244, 67, 54, 0.3)',
                                        color: '#eee', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' 
                                    }}>
                                        {c.name}
                                        <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>
                                            {c.reason.includes('Game Changer') ? '⚡ GC' : c.reason.includes('Mass') ? '💣 MLD' : '⛔'}
                                        </span>
                                    </div>
                                ))}
                             </div>
                        </div>
                     )}
                  </div>
                )}
            </div>

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
