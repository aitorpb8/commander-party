'use client'

import React from 'react';
import { DeckUpgrade } from '@/types';

interface MonthlyBreakdownProps {
  upgrades: DeckUpgrade[];
  trendingPrices?: Record<string, number>;
  preconCardNames: Set<string>;
}

export default function MonthlyBreakdown({ upgrades, trendingPrices = {}, preconCardNames }: MonthlyBreakdownProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  // Group upgrades by month
  const grouped = upgrades.reduce((acc, u) => {
    const m = u.month || 'Desconocido';
    if (!acc[m]) acc[m] = { upgrades: [], total: 0 };
    
    // Default to the locked historical price from the database
    let displayPrice = u.cost || 0;
    
    // If it's the current month, try to use the dynamic trending price
    if (m === currentMonth) {
      if (u.scryfall_id && trendingPrices[u.scryfall_id] !== undefined) {
        displayPrice = trendingPrices[u.scryfall_id];
      } else if (u.card_in && trendingPrices[u.card_in.toLowerCase()] !== undefined) {
        displayPrice = trendingPrices[u.card_in.toLowerCase()];
      }
    }
    
    // If it's a precon card, it's always included for free
    if (u.card_in && preconCardNames.has(u.card_in.toLowerCase())) {
        displayPrice = 0;
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
    <div className="card" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)', flexShrink: 0 }}>Desglose de Mejoras</h3>
      
      {/* Horizontal Scroll Container */}
      <div 
        className="custom-scrollbar" 
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          gap: '1.5rem', 
          overflowX: 'auto', 
          paddingBottom: '1rem' 
        }}
      >
        {months.map(m => (
          <div 
            key={m} 
            style={{ 
              minWidth: '300px', 
              maxWidth: '350px', 
              background: '#1a1a1a', 
              border: '1px solid #333', 
              borderRadius: '8px', 
              padding: '1.2rem',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '400px'
            }}
          >
            {/* Month Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid #333', paddingBottom: '0.8rem' }}>
              <h4 style={{ textTransform: 'capitalize', margin: 0, fontSize: '1.1rem' }}>{formatMonth(m)}</h4>
              <span style={{ color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '1.1rem' }}>{grouped[m].total.toFixed(2)}€</span>
            </div>
            
            {/* Scrollable Upgrades within the Month Card */}
            <div className="custom-scrollbar custom-scrollbar-thin" style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', paddingRight: '4px' }}>
              {grouped[m].upgrades.map(u => (
                <div key={u.id} className="breakdown-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#aaa', gap: '0.5rem', padding: '6px', borderRadius: '4px', transition: 'background 0.2s' }}>
                  <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: 0, flexDirection: 'column' }}>
                    {u.card_in && (
                      <span style={{ color: 'var(--color-green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ↑ {u.card_in}
                      </span>
                    )}
                    {u.card_out && (
                      <span style={{ color: 'var(--color-red)', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingLeft: u.card_in ? '1rem' : '0' }}>
                        ↓ {u.card_out}
                      </span>
                    )}
                    {!u.card_in && !u.card_out && (
                      <span style={{ color: 'var(--color-green)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        ↑ N/A
                      </span>
                    )}
                  </div>
                  <span style={{ flexShrink: 0, alignSelf: 'center' }}>{(u.cost || 0).toFixed(2)}€</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      
      <style jsx>{`
        .breakdown-row:hover {
            background: rgba(255, 255, 255, 0.05) !important;
            color: #fff !important;
        }
        /* Custom scrollbar sizing specifically for inner lists */
        .custom-scrollbar-thin::-webkit-scrollbar {
            width: 4px;
        }
      `}</style>
    </div>
  );
}
