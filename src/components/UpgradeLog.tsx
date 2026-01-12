import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScryfallCard, getCardPrints, getCollection } from '@/lib/scryfall';

interface Upgrade {
  id: string;
  month: string;
  card_in: string;
  card_out: string;
  cost: number;
  description?: string;
  scryfall_id?: string;
}

interface UpgradeLogProps {
  upgrades: Upgrade[];
  currentDeckList: string[];
  onAddUpgrade: (upgrade: Partial<Upgrade>) => void;
  onDeleteUpgrade: (id: string) => void;
  onUpdateUpgrade?: (id: string, updates: Partial<Upgrade>) => void;
  initialCardIn?: string;
  initialCost?: number;
  isOwner?: boolean;
  trendingPrices?: Record<string, number>;
  loadingPrices?: boolean;
}

export default function UpgradeLog({ 
  upgrades, 
  onDeleteUpgrade, 
  onUpdateUpgrade,
  isOwner = false,
  trendingPrices = {},
  loadingPrices = false
}: UpgradeLogProps) {
  const [editingVersion, setEditingVersion] = useState<{ id: string, name: string } | null>(null);
  const [prints, setPrints] = useState<ScryfallCard[]>([]);
  const [loadingPrints, setLoadingPrints] = useState(false);

  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (editingVersion) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editingVersion]);

  const handleOpenVersionPicker = async (upgrade: Upgrade) => {
    if (!isOwner || !upgrade.card_in) return;
    setEditingVersion({ id: upgrade.id, name: upgrade.card_in });
    setLoadingPrints(true);
    const results = await getCardPrints(upgrade.card_in);
    setPrints(results);
    setLoadingPrints(false);
  };

  const handleSelectVersion = (upgradeId: string, card: ScryfallCard) => {
    if (onUpdateUpgrade) {
      const newCost = parseFloat(card.prices.eur || '0');
      onUpdateUpgrade(upgradeId, {
        scryfall_id: card.id,
        cost: newCost,
        description: `Versión actualizada a tendencia: ${card.set_name}`
      });
    }
    setEditingVersion(null);
  };

  const renderModal = () => {
    if (!editingVersion) return null;

    return createPortal(
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: 11000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(5px)'
      }} onClick={() => setEditingVersion(null)}>
        <div 
          className="card" 
          style={{ 
            maxWidth: '650px', width: '100%', maxHeight: '85vh', 
            display: 'flex', flexDirection: 'column', 
            padding: '1.5rem', border: '1px solid #444', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            transform: 'translateZ(0)' // Fix some rendering blinks
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--color-gold)' }}>Seleccionar Edición</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#888' }}>{editingVersion.name}</p>
            </div>
            <button onClick={() => setEditingVersion(null)} className="modal-close-btn" style={{ position: 'relative', top: 0, right: 0 }}>&times;</button>
          </div>

          {loadingPrints ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '1rem', color: '#888' }}>Obteniendo versiones y precios...</p>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1.2rem' }}>
                {prints.map(p => (
                  <div 
                    key={p.id}
                    onClick={() => handleSelectVersion(editingVersion.id, p)}
                    style={{ 
                      cursor: 'pointer', padding: '8px', borderRadius: '10px',
                      background: '#1a1a1a', border: '1px solid #333',
                      transition: 'all 0.2s', textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#252525';
                      e.currentTarget.style.borderColor = 'var(--color-gold)';
                      e.currentTarget.style.transform = 'translateY(-4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1a1a1a';
                      e.currentTarget.style.borderColor = '#333';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <img src={p.image_uris?.small || p.card_faces?.[0]?.image_uris?.small} alt={p.set_name} style={{ width: '100%', borderRadius: '6px', marginBottom: '8px' }} />
                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold', height: '2.4em', overflow: 'hidden', color: '#aaa', margin: '4px 0' }}>{p.set_name}</div>
                    <div style={{ color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '0.9rem' }}>{p.prices?.eur ? `${p.prices.eur}€` : 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ color: 'var(--color-gold)', margin: 0 }}>Historial de Mejoras</h2>
        {loadingPrices && <div className="spinner-small" title="Actualizando precios de tendencia..."></div>}
      </div>

      <div style={{ overflowX: 'auto', width: '100%', flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '550px' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
            <tr style={{ borderBottom: '2px solid #444', color: '#888', fontSize: '0.85rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '1rem 0.75rem' }}>Mes</th>
              <th style={{ padding: '1rem 0.75rem' }}>Entra</th>
              <th style={{ padding: '1rem 0.75rem' }}>Sale</th>
              <th style={{ padding: '1rem 0.75rem', textAlign: 'right' }}>Coste Trend</th>
              {isOwner && <th style={{ padding: '1rem 0.75rem', width: '50px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {upgrades.length === 0 ? (
              <tr><td colSpan={isOwner ? 5 : 4} style={{ padding: '3rem', textAlign: 'center', color: '#666' }}>No hay mejoras registradas.</td></tr>
            ) : (
              upgrades.map(u => {
                const isCurrentMonth = u.month === currentMonth;
                const trending = u.scryfall_id ? trendingPrices[u.scryfall_id] : (u.card_in ? trendingPrices[u.card_in.toLowerCase()] : null);
                const displayCost = (isCurrentMonth && typeof trending === 'number') ? trending : (u.cost || 0);

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #222' }}>
                    <td style={{ padding: '1rem 0.75rem', fontSize: '0.85rem', color: '#aaa' }}>{u.month}</td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      {u.card_in ? (
                        <div onClick={() => handleOpenVersionPicker(u)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isOwner ? 'pointer' : 'default' }}>
                          <span style={{ color: 'var(--color-green)' }}>↑</span>
                          <span style={{ color: 'var(--color-green)', textDecoration: isOwner ? 'underline dotted' : 'none' }}>{u.card_in}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '1rem 0.75rem' }}>
                      {u.card_out ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}>
                          <span style={{ color: 'var(--color-red)' }}>↓</span>
                          <span style={{ color: 'var(--color-red)' }}>{u.card_out}</span>
                        </div>
                      ) : '-'}
                    </td>
                    <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-gold)' }}>
                      {(displayCost || 0).toFixed(2)}€
                      {isCurrentMonth && typeof trending === 'number' && <span style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.5 }} title="Precio en tendencia real">🔥</span>}
                    </td>
                    {isOwner && (
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                        <button onClick={() => confirm(`¿Borrar mejora?`) && onDeleteUpgrade(u.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5 }}>🗑️</button>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      {renderModal()}
    </div>
  );
}
