import { useState } from 'react';
import { createPortal } from 'react-dom';
import { ScryfallCard } from '@/lib/scryfall';
import ConfirmationDialog from './ConfirmationDialog';
import { Z_INDEX_MODAL } from '@/lib/constants';
import { DeckCard } from '@/types';
import { useWishlist, WishlistCard } from '@/hooks/useWishlist';
import WishlistColumn from './deck/wishlist/WishlistColumn';
import { IconInbox } from '@/components/deck/wishlist/WishlistIcons';
import { getCardPrints, getCollection } from '@/lib/scryfall';

interface WishlistProps { 
  deckId: string; 
  isOwner?: boolean;
  onUpdateDeck?: (change: { card_in?: any, card_out?: string, cost?: number, description?: string }) => Promise<void> | void;
  trendingPrices?: Record<string, number>;
  deckCards?: DeckCard[];
}

export default function Wishlist({ 
  deckId, 
  isOwner = false, 
  onUpdateDeck,
  trendingPrices: externalTrendingPrices,
  deckCards = []
}: WishlistProps) {
  
  const {
    wishlist,
    loading,
    trendingPrices,
    query,
    setQuery,
    searchResults,
    addToWishlist,
    removeFromWishlist,
    updateMonth,
    updateSwap,
    selectVersion,
    addAllToMainboard,
    getMonthOptions,
    grouped,
    sortedKeys
  } = useWishlist({ deckId, onUpdateDeck, externalTrendingPrices });

  // UI States for Modals
  const [editingVersion, setEditingVersion] = useState<{ id: string, name: string } | null>(null);
  const [prints, setPrints] = useState<ScryfallCard[]>([]);
  const [loadingPrints, setLoadingPrints] = useState(false);
  const [versionFilter, setVersionFilter] = useState('');
  
  const [swapSelectionCard, setSwapSelectionCard] = useState<WishlistCard | null>(null);
  const [cardOutSearch, setCardOutSearch] = useState('');
  const [selectedCardOut, setSelectedCardOut] = useState<string | null>(null);
  
  const [errorDialog, setErrorDialog] = useState<{ title: string, message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthOptions = getMonthOptions();

  const handleOpenVersionPicker = async (item: WishlistCard) => {
    setEditingVersion({ id: item.id, name: item.card_name });
    setVersionFilter('');
    setLoadingPrints(true);
    const results = await getCardPrints(item.card_name);
    setPrints(results);
    setLoadingPrints(false);
  };

  const handleConfirmAddAll = (key: string) => {
    const cardsToAdd = grouped[key] || [];
    setConfirmDialog({
      title: 'Aplicar cambios al mazo',
      message: `¿Deseas añadir ${cardsToAdd.length} carta(s) al mazo principal? Las cartas se eliminarán del planificador y se registrarán en el historial de mejoras.`,
      onConfirm: async () => {
        setConfirmDialog(null);
        const count = await addAllToMainboard(key);
        setSuccessCount(count);
      }
    });
  };

  if (loading) return <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--color-gold)' }}>🔄 Cargando planificador...</div>;

  return (
    <div className="card glass-panel" style={{ borderTop: '4px solid var(--color-gold)', background: 'rgba(24, 24, 27, 0.4)', borderRadius: '24px' }}>
      <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-gold)', fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>📅 Planificador de Mejoras</h3>
          <p style={{ color: '#888', fontSize: '0.95rem', margin: 0 }}>
            Organiza tus futuras adquisiciones y mantén el control de tu presupuesto mensual.
          </p>
        </div>
      </div>

      {/* SEARCH BAR */}
      {isOwner && (
        <div style={{ marginBottom: '2.5rem', position: 'relative' }}>
          <div className="search-container-premium" style={{ position: 'relative' }}>
            <input 
              type="text" 
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="🔍 Busca una carta para añadir al Backlog..."
              style={{ 
                width: '100%', 
                padding: '1.2rem 1.5rem 1.2rem 3.5rem', 
                background: 'rgba(0,0,0,0.3)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                color: '#fff',
                fontSize: '1rem',
                outline: 'none',
                transition: 'all 0.3s'
              }}
              className="wishlist-search-input"
            />
            <span style={{ position: 'absolute', left: '1.5rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '1.2rem' }}>🔍</span>
          </div>
          
          {searchResults.length > 0 && (
            <ul className="glass-panel" style={{ 
              position: 'absolute', top: '110%', left: 0, right: 0, 
              zIndex: 100, listStyle: 'none', padding: '0.75rem', 
              borderRadius: '20px',
              boxShadow: '0 20px 50px rgba(0,0,0,0.9)',
              background: 'rgba(20, 20, 20, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '400px',
              overflowY: 'auto'
            }}>
              {searchResults.map(r => (
                <li 
                  key={r.id} 
                  onClick={() => addToWishlist(r)}
                  style={{ 
                    padding: '1rem', cursor: 'pointer', 
                    borderBottom: '1px solid rgba(255,255,255,0.05)', 
                    fontSize: '0.95rem', display: 'flex', 
                    justifyContent: 'space-between', alignItems: 'center',
                    borderRadius: '12px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                     <img src={r.image_uris?.small || r.card_faces?.[0]?.image_uris?.small} style={{ width: '35px', borderRadius: '4px', boxShadow: '0 2px 5px rgba(0,0,0,0.5)' }} />
                     <span style={{ fontWeight: '600' }}>{r.name}</span>
                  </div>
                  <span style={{ color: 'var(--color-gold)', fontWeight: '800' }}>{r.prices.eur ? `${r.prices.eur}€` : 'N/A'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* HORIZONTAL PLANNING BOARD */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: '1.5rem', 
        overflowX: 'auto', 
        paddingBottom: '1.5rem',
        scrollSnapType: 'x mandatory',
        margin: '0 -2rem', 
        padding: '0 2rem 1.5rem',
      }} className="custom-scrollbar">
        
        {sortedKeys.length === 0 && (
            <div style={{ 
              width: '100%', textAlign: 'center', padding: '5rem 2rem', 
              border: '2px dashed rgba(255,255,255,0.05)', borderRadius: '24px', 
              color: '#444', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem'
            }}>
                <div style={{ fontSize: '3rem', opacity: 0.2 }}><IconInbox /></div>
                <div style={{ maxWidth: '300px' }}>
                  {isOwner ? 'Tu planificador está vacío. Busca cartas arriba para empezar a organizar tus mejoras.' : 'Este jugador no tiene cartas en su Wishlist todavía.'}
                </div>
            </div>
        )}

        {sortedKeys.map(key => (
          <WishlistColumn 
            key={key}
            monthKey={key}
            items={grouped[key] || []}
            isOwner={isOwner}
            currentMonthKey={currentMonthKey}
            trendingPrices={trendingPrices}
            monthOptions={monthOptions}
            onAddAllToMainboard={handleConfirmAddAll}
            onOpenVersionPicker={handleOpenVersionPicker}
            onUpdateMonth={updateMonth}
            onUpdateSwap={updateSwap}
            onRemove={removeFromWishlist}
            onStartSwap={(card) => {
              setSelectedCardOut(card.card_out || null);
              setSwapSelectionCard(card);
            }}
          />
        ))}
      </div>

      {/* VERSION PICKER MODAL */}
      {editingVersion && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: Z_INDEX_MODAL,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(5px)'
        }} onClick={() => setEditingVersion(null)}>
          <div 
            className="card glass-panel" 
            style={{ 
              maxWidth: '800px', width: '100%', maxHeight: '85vh', 
              display: 'flex', flexDirection: 'column', 
              padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)', 
              boxShadow: '0 30px 70px rgba(0,0,0,0.9)',
              borderRadius: '24px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <div>
                <h3 style={{ margin: 0, color: 'var(--color-gold)', fontSize: '1.4rem' }}>Cambiar Edición</h3>
                <p style={{ margin: '4px 0 0', fontSize: '0.95rem', color: '#888' }}>{editingVersion.name}</p>
              </div>
              <button onClick={() => setEditingVersion(null)} className="btn-close-premium">✕</button>
            </div>

            <input 
              type="text"
              placeholder="🔍 Filtra por edición (Zendikar, Collector, SLD...)"
              value={versionFilter}
              onChange={e => setVersionFilter(e.target.value)}
              style={{ 
                width: '100%', padding: '1rem', 
                background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
                color: '#fff', borderRadius: '12px', fontSize: '1rem', marginBottom: '1.5rem'
              }}
            />

            {loadingPrints ? (
              <div style={{ textAlign: 'center', padding: '4rem' }}>
                <div className="spinner-gold"></div>
                <p style={{ marginTop: '1rem', color: '#666' }}>Buscando ediciones disponibles...</p>
              </div>
            ) : (
              <div className="custom-scrollbar" style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                  {prints
                    .filter(p => 
                      (p.set_name?.toLowerCase().includes(versionFilter.toLowerCase())) || 
                      (p.set?.toLowerCase().includes(versionFilter.toLowerCase()))
                    )
                    .map(p => (
                    <div 
                      key={p.id}
                      onClick={() => {
                        selectVersion(editingVersion.id, p);
                        setEditingVersion(null);
                      }}
                      className="version-card-premium"
                      style={{ 
                        cursor: 'pointer', padding: '10px', borderRadius: '14px',
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)',
                        transition: 'all 0.3s', textAlign: 'center'
                      }}
                    >
                      <img src={p.image_uris?.small || p.card_faces?.[0]?.image_uris?.small} alt={p.set_name} style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }} />
                      <div style={{ fontSize: '0.75rem', fontWeight: 'bold', height: '2.5em', overflow: 'hidden', color: '#aaa' }}>{p.set_name}</div>
                      <div style={{ color: 'var(--color-gold)', fontWeight: '900', fontSize: '1rem', marginTop: '5px' }}>{p.prices?.eur ? `${p.prices.eur}€` : 'N/A'}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* SWAP MODAL */}
      {swapSelectionCard && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: Z_INDEX_MODAL + 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
          backdropFilter: 'blur(10px)'
        }} onClick={() => setSwapSelectionCard(null)}>
          <div 
            className="card glass-panel" 
            style={{ 
              maxWidth: '550px', width: '100%', maxHeight: '90vh', 
              display: 'flex', flexDirection: 'column', 
              padding: '2.5rem', border: '1px solid rgba(255,255,255,0.1)', 
              boxShadow: '0 30px 80px rgba(0,0,0,0.9)',
              borderRadius: '24px'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, color: 'var(--color-gold)', fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>Seleccionar Sustitución</h3>
              <button onClick={() => setSwapSelectionCard(null)} className="btn-close-premium">✕</button>
            </div>

            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '1.25rem', 
              marginBottom: '2rem', background: 'rgba(212, 175, 55, 0.05)', 
              padding: '1.25rem', borderRadius: '16px', border: '1px solid rgba(212, 175, 55, 0.1)' 
            }}>
              <img src={swapSelectionCard.image_url} alt={swapSelectionCard.card_name} style={{ width: '80px', borderRadius: '8px', boxShadow: '0 5px 15px rgba(0,0,0,0.5)' }} />
              <div>
                 <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#fff' }}>{swapSelectionCard.card_name}</div>
                 <div style={{ color: 'var(--color-green)', fontSize: '0.85rem', fontWeight: '800', marginTop: '4px' }}>
                   + ENTRAR AL MAZO
                 </div>
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
               <label style={{ display: 'block', marginBottom: '0.75rem', color: '#666', fontSize: '0.75rem', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px' }}>
                 ¿QUÉ CARTA SALE?
               </label>
               <input 
                 type="text"
                 placeholder="Busca en tu mazo actual..."
                 value={cardOutSearch}
                 onChange={e => setCardOutSearch(e.target.value)}
                 style={{ 
                   width: '100%', padding: '1rem 1.25rem', 
                   background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', 
                   color: '#fff', borderRadius: '12px', fontSize: '1rem' 
                 }}
               />
            </div>

            <div className="custom-scrollbar" style={{ 
              flex: 1, minHeight: '150px', maxHeight: '250px', 
              overflowY: 'auto', marginBottom: '2rem', 
              border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', 
              background: 'rgba(0,0,0,0.2)' 
            }}>
               {selectedCardOut && (
                   <div 
                     onClick={() => setSelectedCardOut(null)}
                     style={{ 
                       padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', 
                       borderBottom: '1px solid rgba(239, 68, 68, 0.2)', 
                       cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                     }}
                   >
                      <span style={{ color: '#fff', fontWeight: 'bold' }}>
                        <span style={{ color: 'var(--color-red)', marginRight: '8px' }}>-</span> {selectedCardOut}
                      </span>
                      <span style={{ color: 'var(--color-red)', fontSize: '0.7rem', fontWeight: '900' }}>QUITAR ✕</span>
                   </div>
               )}
               {deckCards
                 .filter(c => c.card_name.toLowerCase().includes(cardOutSearch.toLowerCase()) && c.card_name !== selectedCardOut)
                 .map(c => (
                   <div 
                     key={c.id}
                     onClick={() => setSelectedCardOut(c.card_name)}
                     style={{ 
                       padding: '0.9rem 1.25rem', borderBottom: '1px solid rgba(255,255,255,0.03)', 
                       cursor: 'pointer', fontSize: '0.95rem', color: '#aaa', transition: 'all 0.2s'
                     }}
                     onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#fff'; }}
                     onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
                   >
                     {c.card_name}
                   </div>
               ))}
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
               <button onClick={() => setSwapSelectionCard(null)} className="btn-premium" style={{ flex: 1, background: 'rgba(255,255,255,0.05)', color: '#888' }}>
                 CANCELAR
               </button>
               <button 
                 onClick={() => {
                   updateSwap(swapSelectionCard.id, selectedCardOut);
                   setSwapSelectionCard(null);
                 }}
                 className="btn-premium btn-premium-gold"
                 style={{ flex: 2 }}
               >
                 GUARDAR CAMBIOS
               </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* DIALOGS */}
      <ConfirmationDialog
        isOpen={errorDialog !== null}
        title={errorDialog?.title || ''}
        message={errorDialog?.message || ''}
        confirmText="Entendido"
        cancelText=""
        isDestructive={true}
        onConfirm={() => setErrorDialog(null)}
        onCancel={() => setErrorDialog(null)}
      />

      <ConfirmationDialog
        isOpen={confirmDialog !== null}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmText="Sí, Aplicar Cambios"
        cancelText="Cancelar"
        isDestructive={false}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />

      {successCount !== null && (
        <ConfirmationDialog 
          isOpen={true}
          title="¡Cambios Aplicados!"
          message={`Se han añadido ${successCount} carta(s) a tu mazo principal correctamente.`}
          confirmText="Genial"
          cancelText=""
          onConfirm={() => {
            setSuccessCount(null);
            window.location.reload(); // Hard reload to ensure all components sync
          }}
          onCancel={() => setSuccessCount(null)}
        />
      )}

      <style jsx>{`
        .btn-close-premium {
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1);
          color: #fff;
          width: 36px; height: 36px;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-close-premium:hover {
          background: var(--color-red);
          border-color: var(--color-red);
        }
        .version-card-premium:hover {
          background: rgba(255,255,255,0.08) !important;
          border-color: var(--color-gold) !important;
          transform: translateY(-5px);
        }
      `}</style>
    </div>
  );
}
