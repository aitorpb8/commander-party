'use client'

import React from 'react';
import { DeckUpgrade } from '@/types';

interface MonthlyBreakdownProps {
  upgrades: DeckUpgrade[];
  trendingPrices?: Record<string, number>;
}

export default function MonthlyBreakdown({ upgrades, trendingPrices = {} }: MonthlyBreakdownProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Group upgrades by month
  const grouped = upgrades.reduce((acc, u) => {
    const m = u.month || 'Desconocido';
    if (!acc[m]) acc[m] = { upgrades: [], total: 0 };
    
    // Resolve price (live if current month)
    let displayPrice = u.cost || 0;
    if (m === currentMonth && u.card_in) {
        const trending = u.scryfall_id ? trendingPrices[u.scryfall_id] : trendingPrices[u.card_in.toLowerCase()];
        if (trending !== undefined) displayPrice = trending;
    }

    acc[m].upgrades.push({ ...u, cost: displayPrice });
    acc[m].total += displayPrice;
    return acc;
  }, {} as Record<string, { upgrades: DeckUpgrade[], total: number }>);

  // Sort months descending
  const months = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  const formatMonth = (m: string) => {
    if (m === 'Desconocido') return m;
    const [year, month] = m.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  };

  if (upgrades.length === 0) return null;

  return (
    <div className="card" style={{ height: '100%', maxHeight: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)', flexShrink: 0 }}>Desglose</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem', minHeight: 0 }}>
        {months.map(m => (
          <div key={m} style={{ borderBottom: '1px solid #333', paddingBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ textTransform: 'capitalize', margin: 0 }}>{formatMonth(m)}</h4>
              <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{grouped[m].total.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {grouped[m].upgrades.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 0 }}>
                    <span style={{ color: 'var(--color-green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>↑ {u.card_in || 'N/A'}</span>
                    {u.card_out && <span style={{ color: 'var(--color-red)', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>↓ {u.card_out}</span>}
                  </div>
                  <span style={{ flexShrink: 0 }}>{(u.cost || 0).toFixed(2)}€</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
