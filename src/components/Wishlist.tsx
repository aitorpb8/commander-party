import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { searchCards, ScryfallCard, getAveragePrice, getCollection } from '@/lib/scryfall';

interface WishlistCard {
  id: string;
  card_name: string;
  price: number;
  image_url: string;
  priority: 'High' | 'Medium' | 'Low';
  target_month?: string; // YYYY-MM
}

export default function Wishlist({ deckId, isOwner = false }: { deckId: string; isOwner?: boolean }) {
  const [wishlist, setWishlist] = useState<WishlistCard[]>([]);
  const [query, setQuery] = useState('');
  const [results, setAddResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingPrices, setTrendingPrices] = useState<Record<string, number>>({});
  const [loadingTrending, setLoadingTrending] = useState(false);
  
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
      const identifiers = wishlist.map(w => ({ name: w.card_name }));
      const cards = await getCollection(identifiers);
      const prices: Record<string, number> = {};
      cards.forEach(c => {
        prices[c.name.toLowerCase()] = parseFloat(c.prices.eur || '0');
      });
      setTrendingPrices(prices);
      setLoadingTrending(false);
    };
    fetchTrending();
  }, [wishlist]);

  useEffect(() => {
    // ...
    const timer = setTimeout(async () => {
      // Use the improved search logic from scryfall.ts
      if (query.length > 2) {
        const res = await searchCards(query);
        setAddResults(res.slice(0, 5));
      } else {
        setAddResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
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
      alert('Error añadiendo a wishlist: ' + error.message);
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

  const updateMonth = async (id: string, month: string | null) => {
    const { error } = await supabase
      .from('deck_wishlist')
      .update({ target_month: month })
      .eq('id', id);
    
    if (!error) {
       setWishlist(wishlist.map(w => w.id === id ? { ...w, target_month: month as string } : w));
    }
  };

  // Helper to generate next 6 months options
  const getMonthOptions = () => {
    const options = [];
    const date = new Date();
    // Start from current month
    date.setDate(1); 
    
    for (let i = 0; i < 6; i++) {
      const value = date.toISOString().slice(0, 7); // YYYY-MM
      const label = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      options.push({ value, label: label.charAt(0).toUpperCase() + label.slice(1) });
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
          style={{ width: '100%', padding: '1rem', background: '#27272a', border: '1px solid #3f3f46', color: 'white', borderRadius: '8px', fontSize: '1rem' }}
        />
        {results.length > 0 && (
          <ul style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#27272a', border: '1px solid #3f3f46', borderRadius: '0 0 8px 8px', zIndex: 100, listStyle: 'none', padding: 0, boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
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
            } else if (monthTotal > 10) {
              statusColor = '#ff9800'; // Orange
              headerBg = 'rgba(255, 152, 0, 0.1)';
              textColor = '#ff9800';
              borderColor = '#ff9800';
            }
          }
          
          let title = isBacklog ? '📥 Backlog (Sin asignar)' : new Date(`${key}-01`).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
          title = title.charAt(0).toUpperCase() + title.slice(1);

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
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <h4 style={{ margin: 0, fontSize: '1.1rem', color: textColor }}>
                    {title} <span style={{ opacity: 0.5, fontSize: '0.9rem' }}>({items.length})</span>
                </h4>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>Total</div>
                    <div style={{ fontWeight: 'bold', fontSize: '1.1rem', color: !isBacklog && monthTotal > 10 ? textColor : 'var(--color-gold)' }}>
                        {monthTotal.toFixed(2)}€
                        {!isBacklog && <span style={{ fontSize: '0.8rem', color: '#666', marginLeft: '5px' }}>/ 10.00€</span>}
                    </div>
                </div>
              </div>

              {/* LIST */}
              <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                {items.length === 0 ? (
                    <div style={{ padding: '1rem', textAlign: 'center', color: '#666', fontStyle: 'italic' }}>Nada planificado para este mes.</div>
                ) : (
                    items.map(card => (
                        <div key={card.id} style={{ display: 'flex', gap: '1rem', alignItems: 'center', background: '#1c1c1c', padding: '0.8rem', borderRadius: '8px', border: '1px solid #333' }}>
                             <img src={card.image_url} style={{ width: '40px', borderRadius: '4px' }} alt="" />
                             
                             <div style={{ flex: 1 }}>
                                 <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{card.card_name}</div>
                                 <div style={{ fontSize: '0.85rem', color: 'var(--color-gold)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    {(() => {
                                        const trending = trendingPrices[card.card_name.toLowerCase()];
                                        const price = trending !== undefined ? trending : card.price;
                                        return (
                                            <>
                                                {price?.toFixed(2)}€
                                                {trending !== undefined && <span style={{ fontSize: '0.7rem', opacity: 0.6 }} title="Precio en tendencia real">🔥</span>}
                                            </>
                                        );
                                    })()}
                                 </div>
                             </div>

                             {isOwner && (
                               <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: '140px' }}>
                                   <select 
                                      style={{ padding: '6px', background: '#000', color: '#fff', border: '1px solid #444', borderRadius: '4px', fontSize: '0.8rem' }}
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
                                   
                                   <button 
                                      onClick={() => removeFromWishlist(card.id)}
                                      style={{ padding: '4px', background: 'transparent', border: '1px solid #444', color: '#888', borderRadius: '4px', fontSize: '0.75rem', cursor: 'pointer' }}
                                   >
                                      Eliminar
                                   </button>
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
    </div>
  );
}
