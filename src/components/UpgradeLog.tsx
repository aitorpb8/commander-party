import React, { useState, useEffect } from 'react';
import { searchCards, ScryfallCard } from '@/lib/scryfall';

interface Upgrade {
  id: string;
  month: string;
  card_in: string;
  card_out: string;
  cost: number;
  description?: string;
}

interface UpgradeLogProps {
  upgrades: Upgrade[];
  currentDeckList: string[];
  onAddUpgrade: (upgrade: Partial<Upgrade>) => void;
  onDeleteUpgrade: (id: string) => void;
  initialCardIn?: string;
  initialCost?: number;
  isOwner?: boolean;
}

export default function UpgradeLog({ upgrades, currentDeckList, onAddUpgrade, onDeleteUpgrade, isOwner = false }: UpgradeLogProps) {
  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexShrink: 0 }}>
        <h2 style={{ color: 'var(--color-gold)', margin: 0 }}>Historial de Mejoras</h2>
      </div>


      <div style={{ overflowX: 'auto', width: '100%', flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px', height: '100%' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 1, boxShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
            <tr style={{ borderBottom: '2px solid #444', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <th style={{ padding: '1rem 0.75rem', fontWeight: '600' }}>Mes</th>
              <th style={{ padding: '1rem 0.75rem', fontWeight: '600' }}>Entra</th>
              <th style={{ padding: '1rem 0.75rem', fontWeight: '600' }}>Sale</th>
              <th style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: '600' }}>Coste</th>
              {isOwner && <th style={{ padding: '1rem 0.75rem', width: '50px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {upgrades.length === 0 ? (
              <tr>
                <td colSpan={isOwner ? 5 : 4} style={{ padding: '3rem', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                  No hay mejoras registradas.
                </td>
              </tr>
            ) : (
              upgrades.map(u => (
                <tr 
                  key={u.id} 
                  style={{ 
                    borderBottom: '1px solid #222',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#1a1a1a'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '1rem 0.75rem', fontSize: '0.85rem', color: '#aaa' }}>
                    {u.month}
                  </td>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    {u.card_in ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: 'var(--color-green)', fontSize: '1.2rem' }}>↑</span>
                        <span style={{ color: 'var(--color-green)' }}>{u.card_in}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#444' }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: '1rem 0.75rem' }}>
                    {u.card_out ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#dd3333', fontSize: '1.2rem' }}>↓</span>
                        <span style={{ color: '#dd3333', opacity: 0.7 }}>{u.card_out}</span>
                      </div>
                    ) : (
                      <span style={{ color: '#444' }}>-</span>
                    )}
                  </td>
                  <td style={{ 
                    padding: '1rem 0.75rem', 
                    textAlign: 'right', 
                    fontWeight: 'bold',
                    color: u.cost > 0 ? 'var(--color-gold)' : '#666'
                  }}>
                    {u.cost.toFixed(2)}€
                  </td>
                  {isOwner && (
                    <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                      <button 
                        onClick={() => {
                          if (confirm(`¿Seguro que quieres borrar la mejora de ${u.card_in}?`)) {
                            onDeleteUpgrade(u.id);
                          }
                        }}
                        style={{ 
                          background: 'none', 
                          border: 'none', 
                          cursor: 'pointer', 
                          fontSize: '1.1rem',
                          opacity: 0.5,
                          transition: 'opacity 0.2s, transform 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = '1';
                          e.currentTarget.style.transform = 'scale(1.2)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = '0.5';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                        title="Borrar mejora (deshacer)"
                      >
                        🗑️
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
