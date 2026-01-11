'use client'

import React from 'react';

interface Upgrade {
  id: string;
  card_in: string | null;
  card_out: string | null;
  cost: number;
  month: string;
  description: string;
}

interface MonthlyBreakdownProps {
  upgrades: Upgrade[];
}

export default function MonthlyBreakdown({ upgrades }: MonthlyBreakdownProps) {
  // Group upgrades by month
  const grouped = upgrades.reduce((acc, u) => {
    const m = u.month || 'Desconocido';
    if (!acc[m]) acc[m] = { upgrades: [], total: 0 };
    acc[m].upgrades.push(u);
    acc[m].total += u.cost;
    return acc;
  }, {} as Record<string, { upgrades: Upgrade[], total: 0 }>);

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
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)' }}>Desglose</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', flex: 1, overflowY: 'auto', paddingRight: '0.5rem' }}>
        {months.map(m => (
          <div key={m} style={{ borderBottom: '1px solid #333', paddingBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h4 style={{ textTransform: 'capitalize', margin: 0 }}>{formatMonth(m)}</h4>
              <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{grouped[m].total.toFixed(2)}€</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {grouped[m].upgrades.map(u => (
                <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa' }}>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <span style={{ color: 'var(--color-green)' }}>↑ {u.card_in || 'N/A'}</span>
                    {u.card_out && <span style={{ color: 'var(--color-red)', opacity: 0.6 }}>↓ {u.card_out}</span>}
                  </div>
                  <span>{u.cost.toFixed(2)}€</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
