import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { searchCards, ScryfallCard, getAveragePrice, getCollection, getCardPrints } from '@/lib/scryfall';
import { createPortal } from 'react-dom';
import ConfirmationDialog from './ConfirmationDialog';
import { MONTHLY_ALLOWANCE, Z_INDEX_MODAL } from '@/lib/constants';
import { DeckCard } from '@/types';

interface WishlistCard {
  id: string;
  card_name: string;
  price: number;
  image_url: string;
  priority: 'High' | 'Medium' | 'Low';
  target_month?: string; // YYYY-MM
  scryfall_id?: string;
  card_out?: string;
}

// Icon Components
const IconSwap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m7 21-4-4 4-4"/><path d="M3 17h18"/><path d="m17 3 4 4-4 4"/><path d="M21 7H3"/>
  </svg>
);

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/>
  </svg>
);

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14"/><path d="M5 12h14"/>
  </svg>
);

const IconInbox = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>
  </svg>
);

const IconRefresh = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
  </svg>
);

export default function Wishlist({ 
  deckId, 
  isOwner = false, 
  onUpdateDeck,
  trendingPrices: externalTrendingPrices,
  deckCards = []
}: { 
  deckId: string; 
  isOwner?: boolean;
  onUpdateDeck?: (change: { card_in?: any, card_out?: string, cost?: number, description?: string }) => Promise<void> | void;
  trendingPrices?: Record<string, number>;
  deckCards?: DeckCard[];
}) {
  const [wishlist, setWishlist] = useState<WishlistCard[]>([]);
  const [query, setQuery] = useState('');
  const [results, setAddResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingPrices, setTrendingPrices] = useState<Record<string, number>>(externalTrendingPrices || {});
  const [loadingTrending, setLoadingTrending] = useState(false);
  
  // Version Selection State
  const [editingVersion, setEditingVersion] = useState<{ id: string, name: string } | null>(null);
  const [prints, setPrints] = useState<ScryfallCard[]>([]);
  const [loadingPrints, setLoadingPrints] = useState(false);
  const [versionFilter, setVersionFilter] = useState('');
  
  // Single Card Swap State
  const [swapSelectionCard, setSwapSelectionCard] = useState<WishlistCard | null>(null);
  const [cardOutSearch, setCardOutSearch] = useState('');
  const [selectedCardOut, setSelectedCardOut] = useState<string | null>(null);
  
  // Dialog state
  const [errorDialog, setErrorDialog] = useState<{ title: string, message: string } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string, message: string, onConfirm: () => void } | null>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchWishlist = async () => {
    const { data, error } = await supabase
      .from('deck_wishlist')
      .select('*')
      .eq('deck_id', deckId)
      .order('target_month', { ascending: true })
      .order('created_at', { ascending: false });
      
    if (data) setWishlist(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchWishlist();
  }, [deckId]);

  // Fetch trending prices for wishlist items
  useEffect(() => {
    const fetchTrending = async () => {
      if (wishlist.length === 0) {
        setTrendingPrices({});
        return;
      }
      setLoadingTrending(true);
      const identifiers = wishlist.map(w => 
        w.scryfall_id ? { id: w.scryfall_id } : { name: w.card_name }
      );
      const cards = await getCollection(identifiers);
      const prices: Record<string, number> = {};
      cards.forEach(c => {
        prices[c.name.toLowerCase()] = parseFloat(c.prices.eur || '0');
        // Also map by ID to be more specific if possible
        if (c.id) prices[c.id] = parseFloat(c.prices.eur || '0');
      });
      setTrendingPrices(prices);
      setLoadingTrending(false);
    };
    fetchTrending();
  }, [wishlist]);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      // Use the improved search logic from scryfall.ts
      if (query.length > 2) {
        const res = await searchCards(query);
        if (!cancelled) {
          setAddResults(res.slice(0, 50));
        }
      } else {
        if (!cancelled) setAddResults([]);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const addToWishlist = async (card: ScryfallCard) => {
    let price = 0;
    if (card.prices?.eur) {
      price = parseFloat(card.prices.eur);
    } else {
      const avg = await getAveragePrice(card.name);
      price = avg?.price || 0;
    }

    const { error } = await supabase.from('deck_wishlist').insert({
      deck_id: deckId,
      card_name: card.name,
      price: price,
      image_url: card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '',
      priority: 'Medium',
      target_month: null // Default to Backlog
    });

    if (error) {
      setErrorDialog({
        title: 'Error al añadir carta',
        message: `No se pudo añadir "${card.name}" al Backlog. ${error.message}`
      });
    } else {
      fetchWishlist();
      setQuery('');
      setAddResults([]);
    }
  };

  const removeFromWishlist = async (id: string) => {
    await supabase.from('deck_wishlist').delete().eq('id', id);
    setWishlist(wishlist.filter(w => w.id !== id));
  };

  const addAllToMainboard = async (monthKey: string) => {
    const cardsToAdd = wishlist.filter(w => (w.target_month || 'backlog') === monthKey);
    if (cardsToAdd.length === 0) return;

    setConfirmDialog({
      title: 'Añadir cartas al mazo',
      message: `¿Deseas añadir ${cardsToAdd.length} carta(s) al mazo principal? Se usarán los precios actuales y las cartas se eliminarán del Wishlist.`,
      onConfirm: async () => {

    for (const card of cardsToAdd) {
      // Add to mainboard via onUpdateDeck
      if (onUpdateDeck) {
        const trending = card.scryfall_id ? trendingPrices[card.scryfall_id] : trendingPrices[card.card_name.toLowerCase()];
        const price = trending !== undefined ? trending : (card.price || 0);
        
        await onUpdateDeck({
          card_in: card.card_name,
          card_out: card.card_out || undefined,
          cost: price,
          description: `Añadido desde Wishlist (${monthKey})${card.card_out ? ` (Sustituye a ${card.card_out})` : ''}`
        });
      }
      
      // Remove from wishlist
      await supabase.from('deck_wishlist').delete().eq('id', card.id);
    }

        // Refresh wishlist
        fetchWishlist();
        setConfirmDialog(null);
      }
    });
  };

  const updateMonth = async (id: string, month: string | null) => {
    const { error } = await supabase
      .from('deck_wishlist')
      .update({ target_month: month })
      .eq('id', id);
    
    if (!error) {
       setWishlist(wishlist.map(w => w.id === id ? { ...w, target_month: month as string } : w));
    }
  };

  const handleOpenVersionPicker = async (item: WishlistCard) => {
    if (!isOwner) return;
    setEditingVersion({ id: item.id, name: item.card_name });
    setVersionFilter('');
    setLoadingPrints(true);
    const results = await getCardPrints(item.card_name);
    setPrints(results);
    setLoadingPrints(false);
  };

  const handleSelectVersion = async (wishlistId: string, card: ScryfallCard) => {
    const newPrice = parseFloat(card.prices.eur || '0');
    const newImageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '';
    
    const { error } = await supabase
      .from('deck_wishlist')
      .update({ 
        scryfall_id: card.id,
        image_url: newImageUrl,
        price: newPrice 
      })
      .eq('id', wishlistId);

    if (!error) {
      setWishlist(wishlist.map(w => w.id === wishlistId ? { 
        ...w, 
        scryfall_id: card.id, 
        image_url: newImageUrl, 
        price: newPrice 
      } : w));
    }
    setEditingVersion(null);
  };

  const renderVersionModal = () => {
    if (!editingVersion) return null;

    return createPortal(
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: Z_INDEX_MODAL,
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
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--color-gold)' }}>Cambiar Edición (Backlog)</h3>
              <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: '#888' }}>{editingVersion.name}</p>
            </div>
            <button 
              onClick={() => setEditingVersion(null)} 
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: 0,
                lineHeight: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-red)';
                e.currentTarget.style.borderColor = 'var(--color-red)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              &times;
            </button>
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

  const updateSwap = async (id: string, cardOut: string | null) => {
    const { error } = await supabase
      .from('deck_wishlist')
      .update({ card_out: cardOut })
      .eq('id', id);
    
    if (!error) {
       setWishlist(wishlist.map(w => w.id === id ? { ...w, card_out: cardOut || undefined } : w));
    } else {
       setErrorDialog({ title: 'Error', message: 'No se pudo guardar la sustitución.' });
    }
  };

  const renderSwapModal = () => {
    if (!swapSelectionCard) return null;

    const filteredDeckCards = deckCards.filter(c => 
      c.card_name.toLowerCase().includes(cardOutSearch.toLowerCase())
    );

    const handleConfirmSwap = async () => {
      await updateSwap(swapSelectionCard.id, selectedCardOut);
      setSwapSelectionCard(null);
      setSelectedCardOut(null);
      setCardOutSearch('');
    };

    return createPortal(
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: Z_INDEX_MODAL + 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(10px)'
      }} onClick={() => setSwapSelectionCard(null)}>
        <div 
          className="card" 
          style={{ 
            maxWidth: '550px', width: '100%', maxHeight: '90vh', 
            display: 'flex', flexDirection: 'column', 
            padding: '2.5rem', border: '1px solid var(--border-color)', 
            boxShadow: '0 25px 60px rgba(0,0,0,0.9)',
            background: 'var(--bg-card)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ margin: 0, color: 'var(--color-gold)', fontFamily: 'var(--font-title)', fontSize: '1.4rem', letterSpacing: '1px' }}>
              Seleccionar Sustitución
            </h3>
            <button 
              onClick={() => setSwapSelectionCard(null)} 
              style={{ 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)', 
                color: '#fff',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.2rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                padding: 0,
                lineHeight: 0
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--color-red)';
                e.currentTarget.style.borderColor = 'var(--color-red)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
              }}
            >
              &times;
            </button>
          </div>

          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '1.2rem', 
            marginBottom: '2rem', 
            background: 'rgba(255,255,255,0.03)', 
            padding: '1.2rem', 
            borderRadius: '16px', 
            border: '1px solid rgba(255,255,255,0.05)' 
          }}>
            <img src={swapSelectionCard.image_url} alt={swapSelectionCard.card_name} style={{ width: '70px', borderRadius: '6px', boxShadow: '0 5px 15px rgba(0,0,0,0.4)' }} />
            <div>
               <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#fff' }}>{swapSelectionCard.card_name}</div>
               <div style={{ color: 'var(--color-green)', fontSize: '0.85rem', fontWeight: '600', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                 <span style={{ fontSize: '1.1rem' }}>+</span> ENTRA AL MAZO
               </div>
            </div>
          </div>

          <div style={{ marginBottom: '1.2rem' }}>
             <label style={{ display: 'block', marginBottom: '0.6rem', color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
               ¿Sustituir por otra carta?
             </label>
             <div style={{ position: 'relative' }}>
               <input 
                 type="text"
                 placeholder="Buscar carta actual del mazo..."
                 value={cardOutSearch}
                 onChange={e => setCardOutSearch(e.target.value)}
                 style={{ 
                   width: '100%', padding: '1rem 1rem 1rem 2.8rem', 
                   background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', 
                   color: '#fff', borderRadius: '12px', fontSize: '0.95rem' 
                 }}
               />
               <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
             </div>
          </div>

          <div className="custom-scrollbar" style={{ 
            flex: 1, 
            minHeight: '180px', 
            maxHeight: '300px', 
            overflowY: 'auto', 
            marginBottom: '2rem', 
            border: '1px solid rgba(255,255,255,0.05)', 
            borderRadius: '12px', 
            background: 'rgba(0,0,0,0.2)' 
          }}>
             {selectedCardOut && (
                 <div 
                   onClick={() => setSelectedCardOut(null)}
                   style={{ 
                     padding: '1rem', 
                     background: 'rgba(239, 68, 68, 0.1)', 
                     borderBottom: '1px solid rgba(239, 68, 68, 0.2)', 
                     cursor: 'pointer', 
                     display: 'flex', 
                     justifyContent: 'space-between', 
                     alignItems: 'center',
                     animation: 'fadeIn 0.3s ease'
                   }}
                 >
                    <span style={{ color: '#fff', fontWeight: '600' }}>
                      <span style={{ color: 'var(--color-red)', marginRight: '8px' }}>-</span> {selectedCardOut}
                    </span>
                    <span style={{ color: 'var(--color-red)', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>Quitar ✕</span>
                 </div>
             )}
             {filteredDeckCards.length === 0 ? (
                 <div style={{ padding: '2rem', textAlign: 'center', color: '#555', fontSize: '0.9rem' }}>No se encontraron cartas.</div>
             ) : (
                 filteredDeckCards.filter(c => c.card_name !== selectedCardOut).map(c => (
                     <div 
                       key={c.id}
                       onClick={() => setSelectedCardOut(c.card_name)}
                       style={{ 
                         padding: '0.8rem 1rem', 
                         borderBottom: '1px solid rgba(255,255,255,0.03)', 
                         cursor: 'pointer', 
                         fontSize: '0.9rem', 
                         transition: 'all 0.2s',
                         color: '#ccc'
                       }}
                       onMouseEnter={e => {
                         e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                         e.currentTarget.style.color = '#fff';
                         e.currentTarget.style.paddingLeft = '1.25rem';
                       }}
                       onMouseLeave={e => {
                         e.currentTarget.style.background = 'transparent';
                         e.currentTarget.style.color = '#ccc';
                         e.currentTarget.style.paddingLeft = '1rem';
                       }}
                     >
                       {c.card_name}
                     </div>
                 ))
             )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'stretch', gap: '1rem' }}>
             <button 
               onClick={() => setSwapSelectionCard(null)}
               className="btn"
               style={{ 
                 flex: 1,
                 background: 'rgba(255,255,255,0.05)', 
                 border: '1px solid rgba(255,255,255,0.1)',
                 padding: '1rem',
                 borderRadius: '12px',
                 fontWeight: '700',
                 fontSize: '0.85rem',
                 textTransform: 'uppercase',
                 letterSpacing: '1px',
                 color: '#fff',
                 transition: 'all 0.2s'
               }}
               onMouseEnter={e => {
                 e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                 e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)';
               }}
               onMouseLeave={e => {
                 e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                 e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
               }}
             >
               Cancelar
             </button>
             <button 
               onClick={handleConfirmSwap}
               className="btn"
               style={{ 
                 flex: 2,
                 background: 'var(--color-gold)', 
                 color: '#000', 
                 fontWeight: '800',
                 padding: '1rem',
                 borderRadius: '12px',
                 fontSize: '0.85rem',
                 textTransform: 'uppercase',
                 letterSpacing: '1px',
                 boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)'
               }}
             >
               Guardar Sustitución
             </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Helper to generate next 6 months options
  const getMonthOptions = () => {
    const options = [];
    const date = new Date();
    // Start from current month
    date.setDate(1); 
    
    for (let i = 0; i < 6; i++) {
      const value = date.toISOString().slice(0, 7); // YYYY-MM
      const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
      const year = date.getFullYear();
      const label = `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;
      options.push({ value, label });
      date.setMonth(date.getMonth() + 1);
    }
    return options;
  };

  const monthOptions = getMonthOptions();

  // Group by target_month (or 'backlog')
  const grouped: Record<string, WishlistCard[]> = {};
  
  // Initialize current month key to ensure it always shows
  const currentMonthKey = new Date().toISOString().slice(0, 7);
  // grouped[currentMonthKey] = []; // Optional: force show current month even if empty

  wishlist.forEach(item => {
    const key = item.target_month || 'backlog';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });

  // Sort keys: backlog last, otherwise chronological
  const sortedKeys = Object.keys(grouped).sort((a, b) => {
    if (a === 'backlog') return 1;
    if (b === 'backlog') return -1;
    return a.localeCompare(b);
  });

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>🔄 Cargando planificador...</div>;

  return (
    <div className="card" style={{ borderTop: '4px solid var(--color-gold)', background: '#18181b' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--color-gold)' }}>📅 Planificador de Mejoras</h3>
        <p style={{ color: '#aaa', fontSize: '0.9rem', margin: 0 }}>
          Organiza tus futuras compras por meses para no pasarte del presupuesto.
        </p>
      </div>

      {/* SEARCH BAR */}
      <div style={{ marginBottom: '2rem', position: 'relative' }}>
        <input 
          type="text" 
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="🔍 Buscar carta para añadir al Backlog..."
          style={{ width: '100%' }}
        />
        {results.length > 0 && (
          <ul className="glass-panel" style={{ 
            position: 'absolute', top: '100%', left: 0, right: 0, 
            marginTop: '0.5rem',
            zIndex: 100, listStyle: 'none', padding: '0.5rem', 
            borderRadius: '16px',
            boxShadow: '0 15px 40px rgba(0,0,0,0.8)',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            {results.map(r => (
              <li 
                key={r.id} 
                onClick={() => addToWishlist(r)}
                style={{ padding: '0.8rem 1rem', cursor: 'pointer', borderBottom: '1px solid #333', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#3f3f46'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                   <img src={r.image_uris?.small || r.card_faces?.[0]?.image_uris?.small} style={{ width: '30px', borderRadius: '2px' }} />
                   <span>{r.name}</span>
                </div>
                <span style={{ color: 'var(--color-gold)' }}>{r.prices.eur ? `${r.prices.eur}€` : 'N/A'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* KANBAN / LISTS */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: '1.5rem', 
        overflowX: 'auto', 
        paddingBottom: '1rem',
        scrollSnapType: 'x mandatory',
        // Break out of card padding (assuming ~1.5rem or 2rem)
        margin: '0 -1.5rem', 
        padding: '0 1.5rem',
      }}>
        
        {sortedKeys.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', border: '2px dashed #333', borderRadius: '12px', color: '#666' }}>
                {isOwner ? 'Start adding cards to build your roadmap! 🛣️' : 'Este jugador no tiene cartas en su Wishlist todavía.'}
            </div>
        )}

        {sortedKeys.map(key => {
          const items = grouped[key];
          const isBacklog = key === 'backlog';
          
          // Calculate month total using trending prices if available
          const monthTotal = items.reduce((sum, item) => {
              const trending = trendingPrices[item.card_name.toLowerCase()];
              return sum + (trending !== undefined ? trending : (item.price || 0));
          }, 0);
          
          let statusColor = '#3f3f46'; // Default (Backlog / Safe)
          let headerBg = isBacklog ? '#3f3f46' : '#111';
          let textColor = '#fff';
          let borderColor = isBacklog ? '#3f3f46' : '#3f3f46';

          if (!isBacklog) {
            if (monthTotal > 11) {
              statusColor = 'var(--color-red)';
              headerBg = 'rgba(244, 67, 54, 0.1)';
              textColor = 'var(--color-red)';
              borderColor = 'var(--color-red)';
            } else if (monthTotal > MONTHLY_ALLOWANCE) {
              statusColor = '#ff9800'; // Orange
              headerBg = 'rgba(255, 152, 0, 0.1)';
              textColor = '#ff9800';
              borderColor = '#ff9800';
            }
          }
          
          const date = new Date(`${key}-01`);
          const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
          const year = date.getFullYear();
          let title = isBacklog ? <><IconInbox /> Backlog (Sin asignar)</> : `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

          return (
            <div key={key} style={{ 
                background: isBacklog ? '#27272a' : '#000', 
                borderRadius: '12px', 
                border: `1px solid ${borderColor}`,
                overflow: 'hidden',
                minWidth: '320px',
                scrollSnapAlign: 'start'
            }}>
              {/* HEADER */}
              <div style={{ 
                  padding: '1rem', 
                  background: headerBg,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1 }}>
                  <h4 style={{ margin: 0, fontSize: '1.1rem', color: textColor }}>
                      {title} <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>({items.length})</span>
                  </h4>
                  {/* Add All button - only show for current month with items */}
                  {!isBacklog && key === currentMonthKey && items.length > 0 && isOwner && (
                    <button
                      onClick={() => addAllToMainboard(key)}
                      className="btn"
                      style={{
                        padding: '6px 14px',
                        background: 'var(--color-gold)',
                        color: '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.75rem',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}
                    >
                      <IconPlus /> Añadir todo al mazo
                    </button>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>Total</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: !isBacklog && monthTotal > MONTHLY_ALLOWANCE ? textColor : 'var(--color-gold)' }}>
                        {monthTotal.toFixed(2)}€
                        {!isBacklog && <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '5px' }}>/ {MONTHLY_ALLOWANCE}.00€</span>}
                    </div>
                </div>
              </div>

              {/* LIST */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {items.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>Nada planificado para este mes.</div>
                ) : (
                    items.map(card => (
                        <div key={card.id} style={{ display: 'flex', gap: '1rem', background: '#1c1c1c', padding: '1rem', borderRadius: '8px', border: '1px solid #333' }}>
                             {/* Left side: Image + Text */}
                             <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: '90px' }}>
                               <div 
                                 onClick={() => handleOpenVersionPicker(card)}
                                 style={{ cursor: isOwner ? 'pointer' : 'default', position: 'relative' }}
                                 className="wishlist-image-container"
                               >
                                {card.image_url ? (
                                  <img src={card.image_url} style={{ width: '70px', borderRadius: '6px' }} alt={card.card_name} />
                                ) : (
                                  <div style={{ width: '70px', height: '98px', background: '#333', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#666' }}>?</div>
                                )}
                                 {isOwner && (
                                   <div style={{ 
                                     position: 'absolute', bottom: -2, right: -2, background: 'var(--color-gold)', 
                                     width: '20px', height: '20px', borderRadius: '50%', 
                                     display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
                                     boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
                                     border: '2px solid #1c1c1c'
                                   }}><IconRefresh size={10} /></div>
                                 )}
                               </div>
                               
                               <div style={{ textAlign: 'center', width: '100%' }}>
                                 <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '0.85rem', lineHeight: '1.2' }}>{card.card_name}</div>
                                 <div style={{ fontSize: '0.85rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                    {(() => {
                                        const trending = card.scryfall_id ? trendingPrices[card.scryfall_id] : trendingPrices[card.card_name.toLowerCase()];
                                        const price = trending !== undefined ? trending : card.price;
                                        return (
                                            <>
                                                {price?.toFixed(2)}€
                                                {trending !== undefined && <span style={{ fontSize: '0.7rem', opacity: 0.6 }} title="Precio en tendencia real">🔥</span>}
                                            </>
                                        );
                                    })()}
                                 </div>
                                 {card.card_out && (
                                   <div 
                                      onClick={() => isOwner && updateSwap(card.id, null)}
                                      style={{ fontSize: '0.75rem', color: 'var(--color-red)', marginTop: '4px', cursor: isOwner ? 'pointer' : 'default', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', background: 'rgba(244, 67, 54, 0.1)', padding: '2px 8px', borderRadius: '4px' }}
                                      title="Quitar sustitución"
                                   >
                                      <span><IconRefresh size={10} /> Sale: {card.card_out}</span>
                                      {isOwner && <span>✖</span>}
                                   </div>
                                 )}
                               </div>
                             </div>

                             {/* Right side: Controls */}
                             {isOwner && (
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: 'auto', justifyContent: 'center', minWidth: '150px' }}>
                                   <select 
                                      className="select-premium"
                                      value={card.target_month || 'backlog'}
                                      onChange={(e) => updateMonth(card.id, e.target.value === 'backlog' ? null : e.target.value)}
                                   >
                                       <option value="backlog">📥 Backlog</option>
                                       <optgroup label="Planificar para...">
                                           {monthOptions.map(opt => (
                                               <option key={opt.value} value={opt.value}>{opt.label}</option>
                                           ))}
                                       </optgroup>
                                   </select>
                                   
                                   <div style={{ display: 'flex', gap: '6px' }}>
                                       <button 
                                          onClick={() => {
                                            setSelectedCardOut(card.card_out || null);
                                            setSwapSelectionCard(card);
                                          }}
                                          className="btn"
                                          title="Seleccionar carta a sustituir"
                                          style={{ 
                                            flex: 1, 
                                            padding: '8px 0', 
                                            background: card.card_out ? 'rgba(255,255,255,0.05)' : 'rgba(212, 175, 55, 0.1)', 
                                            color: card.card_out ? '#fff' : 'var(--color-gold)', 
                                            fontSize: '0.75rem', 
                                            border: `1px solid ${card.card_out ? '#333' : 'var(--border-gold)'}`, 
                                            borderRadius: '8px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center', 
                                            fontWeight: '700',
                                            textTransform: 'uppercase',
                                            letterSpacing: '0.5px'
                                          }}
                                       >
                                          {card.card_out ? '✏️ Cambiar' : <><IconSwap /> SUSTITUIR...</>}
                                       </button>
                                       <button 
                                          onClick={() => removeFromWishlist(card.id)}
                                          className="btn"
                                          title="Eliminar del backlog"
                                          style={{ 
                                            padding: '8px 12px', 
                                            background: 'rgba(255,255,255,0.03)', 
                                            fontSize: '0.85rem', 
                                            border: '1px solid #333', 
                                            borderRadius: '8px', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            justifyContent: 'center'
                                          }}
                                       >
                                          <IconTrash />
                                       </button>
                                   </div>
                               </div>
                             )}
                        </div>
                    ))
                )}
              </div>
            </div>
          );
        })}
      </div>
      {renderSwapModal()}
      {renderVersionModal()}
      
      {/* Error Dialog */}
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

      {/* Confirm Dialog */}
      <ConfirmationDialog
        isOpen={confirmDialog !== null}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmText="Sí, añadir"
        cancelText="Cancelar"
        isDestructive={false}
        onConfirm={() => confirmDialog?.onConfirm()}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
