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

  // 2. Calculate Bracket
  const cardNames = new Set(cards.map(c => c.card_name.toLowerCase()));
  const detectedBracketCards = cards.map(c => {
    const match = BRACKETS.find(b => b.name === c.card_name);
    return match ? { ...match, card: c } : null;
  }).filter(Boolean) as { name: string, bracket: number, reason: string, card: DeckCard }[];

  const gameChangers = detectedBracketCards.filter(c => c.reason.includes("Game Changer") || c.reason.includes("Tutor") || c.reason.includes("Fast Mana"));
  const mldCards = detectedBracketCards.filter(c => c.reason.includes("Mass Land Denial") || c.reason.includes("Stax"));
  
  // Combo Detection
  const combos = [
    { name: "Thoracle Combo", cards: ["thassa's oracle", "demonic consultation"], bracket: 4 },
    { name: "Thoracle Combo (Pact)", cards: ["thassa's oracle", "tainted pact"], bracket: 4 },
    { name: "Dramatic Scepter", cards: ["isochron scepter", "dramatic reversal"], bracket: 4 },
    { name: "Heliod Ballista", cards: ["heliod, sun-crowned", "walking ballista"], bracket: 4 },
    { name: "Breach LED", cards: ["underworld breach", "lion's eye diamond"], bracket: 4 }
  ];

  const detectedCombos = combos.filter(combo => 
    combo.cards.every(name => cardNames.has(name))
  );

  let bracketLevel = 2; // Default to Core
  
  if (detectedCombos.length > 0) {
    bracketLevel = 4;
  } else if (mldCards.length > 0) {
    bracketLevel = 4;
  } else if (gameChangers.length > 0) {
     if (gameChangers.length <= 3) bracketLevel = 3;
     else bracketLevel = 4;
  }
  
  // Custom Bracket Label
  const getBracketLabel = (level: number) => {
    switch (level) {
      case 1: return { label: 'Bracket 1: Exhibition', color: '#8bc34a' }; // Hard to detect purely by list
      case 2: return { label: 'Bracket 2: Core', color: '#4caf50' };
      case 3: return { label: 'Bracket 3: Upgraded', color: '#ff9800' };
      case 4: return { label: 'Bracket 4: Optimized/cEDH', color: '#f44336' };
      default: return { label: 'Unknown', color: '#888' };
    }
  };
  
  const bracketInfo = getBracketLabel(bracketLevel);

  return (
    <>
      {/* 1. Deck Count Validator */}
      <div style={{ 
        display: 'flex', alignItems: 'center', gap: '6px', 
        padding: '4px 10px', borderRadius: '20px', 
        background: isLegalSize ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
        border: `1px solid ${isLegalSize ? '#4caf50' : '#f44336'}`,
        fontSize: '0.8rem', fontWeight: 'bold'
      }}>
        <span style={{ color: isLegalSize ? '#4caf50' : '#f44336' }}>
          {totalCards} / 100 Cartas
        </span>
        {isLegalSize ? '✅' : '⚠️'}
      </div>

      {/* 2. Bracket Display (Clickable Tooltip) */}
      <div 
        style={{ 
          position: 'relative',
          padding: '4px 10px', borderRadius: '6px',
          background: bracketInfo.color,
          color: '#fff', fontSize: '0.75rem', fontWeight: 'bold',
          cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '6px'
        }}
        title="Haz clic para ver detalles de los niveles de poder"
        onClick={() => setShowBracketInfo(true)}
      >
        <span>{bracketInfo.label}</span>
        <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>ℹ️</span>
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
              maxWidth: '600px',
              width: '100%',
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
            
            <h3 style={{ marginTop: 0, color: 'var(--color-gold)', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
              Niveles de Poder (Brackets)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <h4 style={{ color: '#8bc34a', margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                  Bracket 1: Exhibition / Precon
                </h4>
                <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  Mazos preconstruidos sin modificar, mazos temáticos (arte de sillas, solo cartas antiguas) o setups de muy bajo presupuesto/poder. Priorizan la diversión o el "flavor" sobre la eficiencia.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#4caf50', margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                  Bracket 2: Core (Casual Estándar)
                </h4>
                <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  El nivel más común. Mazos con un plan de juego claro, buenas sinergias y una curva de maná razonable. Pueden ganar, pero no suelen hacerlo antes del turno 8-10.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#ff9800', margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                  Bracket 3: High Power
                </h4>
                <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  Mazos altamente optimizados. Incluyen tutores eficientes, mana rápido (Mana Crypt, etc.) y combos compactos. Buscan ganar de forma consistente y resiliente, amenazando victorias en turnos 6-8.
                </p>
              </div>

              <div>
                <h4 style={{ color: '#f44336', margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                  Bracket 4: Optimized / cEDH
                </h4>
                <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
                  El límite de lo posible. Sin restricciones presupuestarias. Combos de victoria instantánea (Thoracle, Breach), Stax opresivo, y capacidad de ganar en turnos 1-3. <br/>
                  <span style={{ fontSize: '0.85rem', color: '#ff6b6b', marginTop: '0.5rem', display: 'block' }}>
                    * Tu mazo está aquí si contiene cartas "Game Changer" (ej. Mana Crypt, Rhystic Study) o Combos Infinitos conocidos.
                  </span>
                </p>
              </div>
            </div>

            {detectedBracketCards.length > 0 && (
              <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', borderRadius: '8px' }}>
                <strong style={{ display: 'block', color: '#f44336', marginBottom: '0.5rem' }}>Tu mazo está en Bracket {bracketLevel} por:</strong>
                <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#ddd', fontSize: '0.9rem' }}>
                  {detectedBracketCards.map(c => (
                    <li key={c.name}>
                      {c.name} <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>({c.reason})</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

          </div>
        </div>,
        document.body
      )}
    </>
  );
}
