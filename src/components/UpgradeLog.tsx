import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScryfallCard, getCardPrints, getCardByName } from '@/lib/scryfall';
import { DeckUpgrade } from '@/types';
import ConfirmationDialog from './ConfirmationDialog';

interface UpgradeLogProps {
  upgrades: DeckUpgrade[];
  currentDeckList: string[];
  onAddUpgrade: (upgrade: Partial<DeckUpgrade>) => void;
  onDeleteUpgrade: (id: string) => void;
  onUpdateUpgrade?: (id: string, updates: Partial<DeckUpgrade>) => void;
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
  loadingPrices = false,
  preconCardNames = new Set() // Add new prop with default empty set
}: UpgradeLogProps & { preconCardNames?: Set<string> }) {
  const [editingVersion, setEditingVersion] = useState<{ id: string, name: string, isUpgrade?: boolean } | null>(null);
  const [prints, setPrints] = useState<ScryfallCard[]>([]);
  const [loadingPrints, setLoadingPrints] = useState(false);
  const [versionFilter, setVersionFilter] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Hover Preview State
  const [previewCard, setPreviewCard] = useState<{ name: string, image: string, x: number, y: number } | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout|null>(null);

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

  const handleOpenVersionPicker = async (upgrade: DeckUpgrade) => {
    if (!isOwner || !upgrade.card_in) return;
    setEditingVersion({ 
      id: upgrade.id, 
      name: upgrade.card_in,
      isUpgrade: true
    });
    setVersionFilter('');
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

  const startHoverTimer = async (name: string, e: React.MouseEvent) => {
     if (!name) return;
     // Clear any existing timer to prevent race conditions
     if (hoverTimer) clearTimeout(hoverTimer);
     
     const timer = setTimeout(async () => {
         const card = await getCardByName(name);
         if (card) {
            const imageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '';
            setPreviewCard({ name, image: imageUrl, x: e.clientX, y: e.clientY });
         }
     }, 400); // 400ms delay for log preview to avoid too many jumps
     setHoverTimer(timer);
  };

  const stopHoverTimer = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setHoverTimer(null);
    setPreviewCard(null);
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
            maxWidth: '750px', width: '100%', maxHeight: '85vh', 
            display: 'flex', flexDirection: 'column', 
            padding: '3rem', border: '1px solid #444', 
            boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
            transform: 'translateZ(0)' // Fix some rendering blinks
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--color-gold)' }}>Cambiar Edición</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#888' }}>{editingVersion.name}</p>
            </div>
            <button onClick={() => setEditingVersion(null)} className="modal-close-btn" style={{ position: 'relative', top: 0, right: 0 }}>&times;</button>
          </div>

          {!loadingPrints && (
            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                type="text"
                placeholder="🔍 Filtrar por set (ej: Zendikar, SLD...)"
                value={versionFilter}
                onChange={e => setVersionFilter(e.target.value)}
                style={{ 
                  width: '100%', padding: '0.8rem 1rem', 
                  background: '#000', border: '1px solid #444', 
                  color: '#fff', borderRadius: '8px', fontSize: '0.9rem' 
                }}
              />
            </div>
          )}

          {loadingPrints ? (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '1rem', color: '#888' }}>Buscando ediciones...</p>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '1rem', marginRight: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '1.2rem' }}>
                {prints
                  .filter(p => 
                    (p.set_name?.toLowerCase().includes(versionFilter.toLowerCase())) || 
                    (p.set?.toLowerCase().includes(versionFilter.toLowerCase()))
                  )
                  .map(p => (
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

      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        {/* Fixed height 1010px ensures it matches the neighbor card (~1014px) and forces the container size while preventing infinite grow */}
        <div className="custom-scrollbar" style={{ overflowX: 'auto', width: '100%', height: '1010px', overflowY: 'auto', paddingRight: '4px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '550px' }}>
            <thead style={{ position: 'sticky', top: 0, background: '#151515', zIndex: 1 }}>
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
                  
                  // FIX: Check if card is precon
                  const isPrecon = u.card_in && preconCardNames?.has(u.card_in.toLowerCase());
                  
                  // If it's a precon card, FORCE 0€, otherwise use trending or recorded cost
                  const displayCost = isPrecon ? 0 : (isCurrentMonth && typeof trending === 'number') ? trending : (u.cost || 0);

                  return (
                    <tr key={u.id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={{ padding: '1rem 0.75rem', fontSize: '0.85rem', color: '#aaa' }}>{u.month}</td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        {u.card_in ? (
                          <div 
                            onClick={() => handleOpenVersionPicker(u)} 
                            onMouseEnter={e => u.card_in && startHoverTimer(u.card_in, e)}
                            onMouseLeave={stopHoverTimer}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: isOwner ? 'pointer' : 'default' }}
                          >
                            <span style={{ color: 'var(--color-green)' }}>↑</span>
                            <span style={{ color: 'var(--color-green)', textDecoration: isOwner ? 'underline dotted' : 'none' }}>{u.card_in}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '1rem 0.75rem' }}>
                        {u.card_out ? (
                          <div 
                             onMouseEnter={e => u.card_out && startHoverTimer(u.card_out, e)}
                             onMouseLeave={stopHoverTimer}
                             style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: 0.7 }}
                          >
                            <span style={{ color: 'var(--color-red)' }}>↓</span>
                            <span style={{ color: 'var(--color-red)' }}>{u.card_out}</span>
                          </div>
                        ) : '-'}
                      </td>
                      <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: 'bold', color: 'var(--color-gold)' }}>
                        {(displayCost || 0).toFixed(2)}€
                        {isCurrentMonth && typeof trending === 'number' && !isPrecon && <span style={{ fontSize: '0.65rem', marginLeft: '4px', opacity: 0.5 }} title="Precio en tendencia real">🔥</span>}
                      </td>
                      {isOwner && (
                        <td style={{ padding: '1rem 0.75rem', textAlign: 'center' }}>
                          <button 
                            onClick={() => setDeleteConfirmId(u.id)} 
                            style={{ background: 'none', border: 'none', cursor: 'pointer', opacity: 0.5, transition: 'opacity 0.2s' }}
                            onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                            onMouseLeave={e => e.currentTarget.style.opacity = '0.5'}
                          >
                            🗑️
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
              {/* Fill remaining space with empty rows to maintain grid height */}
              {Array.from({ length: Math.max(0, 18 - upgrades.length) }).map((_, i) => (
                <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #222', height: '58px' }}>
                  <td colSpan={isOwner ? 5 : 4}>&nbsp;</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Conditional Scroll Indicator */}
        {upgrades.length > 18 && (
           <div style={{
             position: 'absolute', bottom: 0, left: 0, right: 0, height: '45px',
             background: 'linear-gradient(to bottom, transparent, #151515 100%)',
             pointerEvents: 'none',
             zIndex: 2,
             display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: '4px'
           }}>
             <span style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>↓ Scroll ↓</span>
           </div>
        )}
      </div>
      {renderModal()}
      
      <ConfirmationDialog
        isOpen={deleteConfirmId !== null}
        title="Borrar Mejora"
        message="¿Estás seguro de que quieres eliminar esta mejora del historial? Esta acción no se puede deshacer."
        confirmText="Sí, borrar"
        cancelText="No, mantener"
        isDestructive={true}
        onConfirm={() => {
          if (deleteConfirmId) onDeleteUpgrade(deleteConfirmId);
          setDeleteConfirmId(null);
        }}
        onCancel={() => setDeleteConfirmId(null)}
      />

      {previewCard && typeof document !== 'undefined' && createPortal(
        (() => {
          const cardWidth = 240;
          const cardHeight = 330; 
          const offset = 20;
          
          let left = previewCard.x + offset;
          let top = previewCard.y + offset;
          
          if (left + cardWidth > window.innerWidth) {
            left = previewCard.x - cardWidth - offset;
          }
          
          if (top + cardHeight > window.innerHeight) {
            top = Math.max(10, window.innerHeight - cardHeight - 10);
          }

          return (
            <div 
              style={{ 
                position: 'fixed', 
                top: top, 
                left: left, 
                zIndex: 9999999, 
                pointerEvents: 'none',
                animation: 'fadeIn 0.2s ease-out'
              }}
            >
              <img 
                src={previewCard.image} 
                alt={previewCard.name}
                style={{ 
                  width: `${cardWidth}px`, 
                  borderRadius: '12px', 
                  boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
                  border: '1px solid rgba(255,255,255,0.2)'
                }}
              />
            </div>
          );
        })(),
        document.body
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
