'use client'

import React from 'react';

interface DeckCard {
  card_name: string;
  quantity: number;
  type_line: string | null;
  mana_cost: string | null;
  oracle_text: string | null;
}

interface ManaAnalysisProps {
  cards: DeckCard[];
}

export default function ManaAnalysis({ cards }: ManaAnalysisProps) {
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const prod = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const curve = new Array(8).fill(0); // 0, 1, 2, 3, 4, 5, 6, 7+

  const getCMC = (mana_cost: string | null) => {
    if (!mana_cost) return 0;
    const matches = mana_cost.match(/\{(\d+|X|W|U|B|R|G|C|S|P)\}/g);
    if (!matches) {
       // Fallback for simple numbers
       const num = parseInt(mana_cost);
       return isNaN(num) ? 0 : num;
    };
    let cmc = 0;
    matches.forEach(m => {
      const val = m.replace(/\{|\}/g, '');
      if (!isNaN(parseInt(val))) cmc += parseInt(val);
      else if (['W', 'U', 'B', 'R', 'G', 'C', 'S', 'P'].includes(val)) cmc += 1;
    });
    return cmc;
  };

  cards.forEach(c => {
    const isLand = c.type_line?.toLowerCase().includes('land');
    const cost = c.mana_cost || '';
    const text = c.oracle_text || '';

    if (!isLand) {
      // Curve
      const cmc = Math.min(getCMC(cost), 7);
      curve[cmc] += c.quantity;

      // Pips
      (cost.match(/W/g) || []).forEach(() => pips.W += c.quantity);
      (cost.match(/U/g) || []).forEach(() => pips.U += c.quantity);
      (cost.match(/B/g) || []).forEach(() => pips.B += c.quantity);
      (cost.match(/R/g) || []).forEach(() => pips.R += c.quantity);
      (cost.match(/G/g) || []).forEach(() => pips.G += c.quantity);
    } else {
      // Production
      if (text.includes('{W}') || text.includes('Plains')) prod.W += c.quantity;
      if (text.includes('{U}') || text.includes('Island')) prod.U += c.quantity;
      if (text.includes('{B}') || text.includes('Swamp')) prod.B += c.quantity;
      if (text.includes('{R}') || text.includes('Mountain')) prod.R += c.quantity;
      if (text.includes('{G}') || text.includes('Forest')) prod.G += c.quantity;
      if (text.includes('Add one mana of any color')) {
         prod.W += c.quantity; prod.U += c.quantity; prod.B += c.quantity; prod.R += c.quantity; prod.G += c.quantity;
      }
    }
  });

  const colors = [
    { key: 'W', name: 'Blanco', color: '#f9fafb' },
    { key: 'U', name: 'Azul', color: '#3b82f6' },
    { key: 'B', name: 'Negro', color: '#6b7280' },
    { key: 'R', name: 'Rojo', color: '#ef4444' },
    { key: 'G', name: 'Verde', color: '#10b981' },
  ];

  const maxCurve = Math.max(...curve, 1);
  const maxColors = Math.max(...Object.values(pips), ...Object.values(prod), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* CMC Curve */}
      <div>
        <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Curva de CMC (Hechizos)</h4>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: '120px', paddingBottom: '1.5rem', borderBottom: '1px solid #333' }}>
          {curve.map((count, i) => {
            const height = (count / maxCurve) * 100;
            return (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.7rem', color: count > 0 ? 'var(--color-gold)' : '#444' }}>{count}</span>
                <div style={{ width: '100%', height: `${height}%`, background: count > 0 ? 'linear-gradient(to top, #d4af37, #f1d374)' : '#222', borderRadius: '4px 4px 0 0', minHeight: count > 0 ? '4px' : '0' }}></div>
                <span style={{ fontSize: '0.7rem', color: '#666' }}>{i === 7 ? '7+' : i}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Color Balance */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
        <div>
          <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Símbolos de Maná</h4>
          {colors.map(col => {
            const val = (pips as any)[col.key];
            const pct = (val / maxColors) * 100;
            return (
              <div key={col.key} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: '#aaa' }}>{col.name}</span>
                  <span style={{ fontWeight: 'bold' }}>{val}</span>
                </div>
                <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: col.color, transition: 'width 0.5s ease', boxShadow: `0 0 10px ${col.color}44` }}></div>
                </div>
              </div>
            );
          })}
        </div>
        <div>
          <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Fuentes de Maná</h4>
          {colors.map(col => {
            const val = (prod as any)[col.key];
            const pct = (val / maxColors) * 100;
            return (
              <div key={col.key} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', marginBottom: '0.3rem' }}>
                  <span style={{ color: '#aaa' }}>{col.name}</span>
                  <span style={{ fontWeight: 'bold' }}>{val}</span>
                </div>
                <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: col.color, transition: 'width 0.5s ease', boxShadow: `0 0 10px ${col.color}44` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
