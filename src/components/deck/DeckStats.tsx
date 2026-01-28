'use client'

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DeckCard } from '@/types';
import BRACKETS_DATA from '@/data/brackets.json';

const BRACKETS = BRACKETS_DATA as { name: string, bracket: number, reason: string }[];

interface DeckStatsProps {
  cards: DeckCard[];
}

export default function DeckStats({ cards }: DeckStatsProps) {
  const [showBracketInfo, setShowBracketInfo] = useState(false);

  // 1. Calculate Deck Stats
  const totalCards = cards.reduce((acc, c) => acc + c.quantity, 0);
  const isLegalSize = totalCards === 100;

  // 2. Constants & Lists
  const EXTRA_TURN_CARDS = new Set([
    "time warp", "temporal manipulation", "capture of jingzhou", "expropriate", 
    "time stretch", "nexus of fate", "beacon of tomorrows", "temporal mastery", 
    "walk the aeons", "part the waterveil", "karn's temporal sundering", 
    "alrund's epiphany", "plea for power", "time siege", "notorious throng"
  ]);

  const cardNames = new Set(cards.map(c => c.card_name.toLowerCase()));
  
  // 3. Categorize Restricted Cards
  const detectedBracketCards = cards.map(c => {
    const match = BRACKETS.find(b => b.name === c.card_name);
    return match ? { ...match, card: c } : null;
  }).filter(Boolean) as { name: string, bracket: number, reason: string, card: DeckCard }[];

  const gameChangers = detectedBracketCards.filter(c => c.reason.includes("Game Changer") || c.reason.includes("Tutor") || c.reason.includes("Fast Mana"));
  const mldCards = detectedBracketCards.filter(c => c.reason.includes("Mass Land Denial") || c.reason.includes("Stax"));
  const extraTurnCount = cards.filter(c => EXTRA_TURN_CARDS.has(c.card_name.toLowerCase())).reduce((acc, c) => acc + c.quantity, 0);

  // Combo Detection (cEDH / Infinite)
  const cEDHCombos = [
    { name: "Thoracle Combo", cards: ["thassa's oracle", "demonic consultation"] },
    { name: "Thoracle Combo (Pact)", cards: ["thassa's oracle", "tainted pact"] },
    { name: "Breach LED", cards: ["underworld breach", "lion's eye diamond"] },
    { name: "IsoRev", cards: ["isochron scepter", "dramatic reversal"] } // Often High Power, can be cEDH
  ];

  const detectedCombos = cEDHCombos.filter(combo => 
    combo.cards.every(name => cardNames.has(name))
  );

  // 4. Determine Bracket Level
  let bracketLevel = 2; // Default to Core
  let determinationReason = "Standard Commander Deck";

  // Check Bracket 5 (cEDH)
  if (detectedCombos.length > 0) {
    bracketLevel = 5;
    determinationReason = "Contains known cEDH win conditions (Combos).";
  } 
  // Check Bracket 4 (Optimized)
  else if (mldCards.length > 0) {
    bracketLevel = 4;
    determinationReason = "Contains Mass Land Denial or Stax.";
  } else if (extraTurnCount > 1) { // "Chaining" extra turns
    bracketLevel = 4;
    determinationReason = "Potential for chaining Extra Turns (>1 card).";
  } else if (gameChangers.length > 3) {
    bracketLevel = 4;
    determinationReason = `High density of Game Changers (${gameChangers.length}).`;
  }
  // Check Bracket 3 (Upgraded)
  else if (gameChangers.length > 0) {
    bracketLevel = 3;
    determinationReason = `Contains Game Changers (${gameChangers.length} <= 3).`;
  }
  // Check Bracket 2 (Core) vs 1 (Exhibition)
  else {
    // Differentiation between 1 and 2 is subtle (Theme vs Staples).
    // B1: NO Extra Turns. B2: NO Chaining.
    // If has 1 extra turn, it's B2 or B3. Since GCs=0, it's B2.
    // If 0 Extra Turns, 0 GCs, 0 MLD -> B2 (Default).
    // Verification for B1 is hard without manual flag.
    bracketLevel = 2;
    if (extraTurnCount > 0) {
      determinationReason = "Contains an Extra Turn spell.";
    } else {
        determinationReason = "Balanced deck with no restricted power cards found.";
    }
  }
  
  // Custom Bracket Label
  const getBracketLabel = (level: number) => {
    switch (level) {
      case 1: return { 
          label: 'BRACKET 1', 
          sub: 'Exhibition',
          gradient: 'linear-gradient(135deg, #FDD835, #FBC02D)', // Sunny Gold
          shadow: '0 0 10px rgba(253, 216, 53, 0.4)',
          color: '#FDD835'
      }; 
      case 2: return { 
          label: 'BRACKET 2', 
          sub: 'Core',
          gradient: 'linear-gradient(135deg, #66BB6A, #43A047)', // Fresh Green
          shadow: '0 0 10px rgba(102, 187, 106, 0.4)', 
          color: '#66BB6A'
      };
      case 3: return { 
          label: 'BRACKET 3', 
          sub: 'Upgraded',
          gradient: 'linear-gradient(135deg, #FFA726, #FB8C00)', // Energetic Orange
          shadow: '0 0 10px rgba(255, 167, 38, 0.4)', 
          color: '#FFA726'
      };
      case 4: return { 
          label: 'BRACKET 4', 
          sub: 'Optimized',
          gradient: 'linear-gradient(135deg, #EF5350, #E53935)', // Intense Red
          shadow: '0 0 10px rgba(239, 83, 80, 0.4)', 
          color: '#EF5350'
      };
      case 5: return { 
          label: 'BRACKET 5', 
          sub: 'cEDH',
          gradient: 'linear-gradient(135deg, #7f00ff, #e100ff)', // Mythic Purple/Pink
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
          borderRadius: '30px', // Outer container for border effect
          background: `linear-gradient(to bottom right, #333, #000)`,
          cursor: 'pointer',
          boxShadow: bracketInfo.shadow,
          transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
          height: '36px',
          display: 'flex', alignItems: 'center'
        }}
        title="Ver nivel de poder"
        onClick={() => setShowBracketInfo(true)}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05) translateY(-2px)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1) translateY(0)'}
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
            
            {/* Premium Info Icon */}
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
              {/* Bracket 1 */}
              <div style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', border: bracketLevel === 1 ? '2px solid #eab308' : '1px solid #333' }}>
                <h4 style={{ color: '#eab308', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>1. Exhibition</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#aaa', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  <li>Prioriza tema sobre poder</li>
                  <li style={{ color: '#ff6b6b' }}>NO Game Changers</li>
                  <li style={{ color: '#ff6b6b' }}>NO MLD</li>
                  <li style={{ color: '#ff6b6b' }}>NO Turnos Extra</li>
                </ul>
              </div>

              {/* Bracket 2 */}
              <div style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', border: bracketLevel === 2 ? '2px solid #4caf50' : '1px solid #333' }}>
                <h4 style={{ color: '#4caf50', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>2. Core</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#aaa', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  <li>Foco mecánico</li>
                  <li>Sinergias claras</li>
                  <li style={{ color: '#ff6b6b' }}>NO Game Changers</li>
                  <li style={{ color: '#ff6b6b' }}>NO MLD</li>
                  <li style={{ color: '#ff6b6b' }}>NO Encadenar Turnos</li>
                </ul>
              </div>

               {/* Bracket 3 */}
               <div style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', border: bracketLevel === 3 ? '2px solid #ff9800' : '1px solid #333' }}>
                <h4 style={{ color: '#ff9800', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>3. Upgraded</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#aaa', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  <li>Alta sinergia y poder</li>
                  <li style={{ color: '#4caf50' }}>0 - 3 Game Changers</li>
                  <li style={{ color: '#ff6b6b' }}>NO MLD</li>
                  <li style={{ color: '#ff6b6b' }}>NO Encadenar Turnos</li>
                </ul>
              </div>

               {/* Bracket 4 */}
               <div style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', border: bracketLevel === 4 ? '2px solid #f44336' : '1px solid #333' }}>
                <h4 style={{ color: '#f44336', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>4. Optimized</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#aaa', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  <li>Letal, consistente, rápido</li>
                  <li>Más de 3 Game Changers</li>
                  <li>Puede contener MLD/Stax</li>
                  <li>Sin restricciones</li>
                </ul>
              </div>

               {/* Bracket 5 */}
               <div style={{ background: '#2a2a2a', padding: '1rem', borderRadius: '8px', border: bracketLevel === 5 ? '2px solid #990000' : '1px solid #333' }}>
                <h4 style={{ color: '#990000', margin: '0 0 0.5rem 0', fontSize: '1rem' }}>5. cEDH</h4>
                <ul style={{ paddingLeft: '1.2rem', margin: 0, color: '#aaa', fontSize: '0.75rem', lineHeight: '1.4' }}>
                  <li>Meta competitivo</li>
                  <li>Victoria t1-t3</li>
                  <li>Combos compactos</li>
                  <li>Eficiencia máxima</li>
                </ul>
              </div>
            </div>

            <div style={{ marginTop: '1rem', padding: '1rem', background: bracketInfo.color + '22', border: `1px solid ${bracketInfo.color}`, borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                 <strong style={{ color: bracketInfo.color, fontSize: '1.1rem' }}>Result: {bracketInfo.label}</strong>
              </div>
              <p style={{ margin: '0.5rem 0 0 0', color: '#ddd', fontSize: '0.95rem' }}>
                  {determinationReason}
              </p>
                {/* List Reasons */}
                {(detectedBracketCards.length > 0 || detectedCombos.length > 0) && (
                  <div style={{ marginTop: '1rem' }}>
                     {detectedCombos.length > 0 && (
                        <div style={{ marginBottom: '0.5rem' }}>
                            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Combos Detectados:</span>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                {detectedCombos.map(c => (
                                    <span key={c.name} style={{ background: 'rgba(255,0,0,0.2)', color: '#ff9999', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{c.name}</span>
                                ))}
                            </div>
                        </div>
                     )}
                     
                     {extraTurnCount > 0 && (
                         <div style={{ marginBottom: '0.5rem' }}>
                             <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Turnos Extra:</span>
                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                 {cards.filter(c => EXTRA_TURN_CARDS.has(c.card_name.toLowerCase())).map(c => (
                                     <span key={c.card_name} style={{ background: 'rgba(255, 152, 0, 0.2)', color: '#ffb74d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{c.card_name}</span>
                                 ))}
                             </div>
                         </div>
                     )}

                     {detectedBracketCards.length > 0 && (
                        <div>
                             <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#888', fontWeight: 'bold' }}>Cartas Restringidas:</span>
                             <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
                                {detectedBracketCards.map(c => (
                                    <div key={c.name} style={{ 
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
