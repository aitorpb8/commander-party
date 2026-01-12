'use client'

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';

import UpgradeLog from '@/components/UpgradeLog';
import BudgetChart from '@/components/BudgetChart';
import ManaAnalysis from '@/components/ManaAnalysis';
import Wishlist from '@/components/Wishlist';
import MonthlyBreakdown from '@/components/MonthlyBreakdown';
import { searchCards, ScryfallCard, getCollection } from '@/lib/scryfall';
import CommanderPicker from '@/components/CommanderPicker';
import DeckVisualizer from '@/components/DeckVisualizer';
import TagStats from '@/components/TagStats';
import DeckAlerts from '@/components/DeckAlerts';
import { calculateDeckBudget } from '@/lib/budgetUtils';

export default function DeckDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [deck, setDeck] = useState<any>(null);
  const [upgrades, setUpgrades] = useState<any[]>([]);
  const [deckCards, setDeckCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userCollection, setUserCollection] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);

  const [preconCardNames, setPreconCardNames] = useState<Set<string>>(new Set());

  const [editingPrecon, setEditingPrecon] = useState(false);
  const [tempPreconUrl, setTempPreconUrl] = useState('');
  const [cardTags, setCardTags] = useState<Record<string, string[]>>({});
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  // COORDINATED TRENDING PRICES
  const [trendingPrices, setTrendingPrices] = useState<Record<string, number>>({});
  const [loadingTrending, setLoadingTrending] = useState(false);

  const supabase = createClient();

  const fetchData = async (retries = 5, silent = false) => {
    const { data: { user: authUser } } = await supabase.auth.getUser();
    setUser(authUser);
    const user = authUser; // Local reference for remaining function logic
    if (!silent) setLoading(true);

    const { data: deckData, error: dbError } = await supabase
      .from('decks')
      .select('*, profiles!user_id(username)')
      .eq('id', id)
      .maybeSingle(); 
    
    if (dbError) {
      console.error("Supabase fetch error:", dbError);
      setError(dbError.message);
      setLoading(false);
      return;
    }
    
    if (!deckData && retries > 0) {
      console.log(`Deck not found, retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      return fetchData(retries - 1, silent);
    }

    if (!deckData) {
      setLoading(false);
      return;
    }

    const { data: upgradeData, error: upgradeError } = await supabase
      .from('deck_upgrades')
      .select('*')
      .eq('deck_id', id)
      .order('created_at', { ascending: false });

    if (upgradeError) console.error("Upgrades error:", upgradeError);

    const { data: cardsData, error: cardsError } = await supabase
      .from('deck_cards')
      .select('*')
      .eq('deck_id', id);

    if (cardsError) console.error("Cards error:", cardsError);

    setDeckCards(cardsData || []);
    setDeck(deckData);
    setUpgrades(upgradeData || []);

    // Fetch user collection
    if (user) {
      const { data: colData } = await supabase
        .from('user_collection')
        .select('card_name')
        .eq('user_id', user.id);
      
      if (colData) {
        setUserCollection(new Set(colData.map(c => c.card_name.toLowerCase())));
      }
    }

    // Fetch precon cards for zero-cost logic
    if (deckData?.precon_url) {
      try {
        let endpoint = '';
        if (deckData.precon_url.includes('archidekt.com')) endpoint = '/api/import/archidekt';
        else if (deckData.precon_url.includes('moxfield.com')) endpoint = '/api/import/moxfield';
        
        if (endpoint) {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: deckData.precon_url })
          });
          const data = await res.json();
          if (data.cards) {
            const names = new Set<string>(data.cards.map((c: any) => c.name.toLowerCase()));
            setPreconCardNames(names);
          }
        }
      } catch (err) {
        console.error("Error loading precon for comparison:", err);
      }
    }

    if (!silent) setLoading(false);
    setError(null);
  };

  const fetchTags = async () => {
    const { data, error } = await supabase
      .from('deck_card_tags')
      .select('card_name, tags')
      .eq('deck_id', id);
    
    if (error) {
      console.error('Error fetching tags:', error);
      return;
    }

    const tagsMap: Record<string, string[]> = {};
    data?.forEach(row => {
      tagsMap[row.card_name] = row.tags || [];
    });
    setCardTags(tagsMap);
  };

  useEffect(() => {
    fetchData();
    fetchTags();
  }, [id, supabase]);

  const handleUpdateDeck = async (change: { 
    card_in?: any, 
    card_out?: string, 
    cost?: number, 
    description?: string 
  }) => {
    setLoading(true);
    try {
      const month = new Date().toISOString().slice(0, 7);
      
      // 1. Log the upgrade
      const { error: upgradeError } = await supabase
        .from('deck_upgrades')
        .insert({
          deck_id: id,
          card_in: typeof change.card_in === 'string' ? change.card_in : (change.card_in?.name || null),
          card_out: change.card_out || null,
          cost: change.cost || 0,
          description: change.description || '',
          month,
          scryfall_id: typeof change.card_in === 'object' ? change.card_in?.id : null
        });
      if (upgradeError) {
        // Fallback for when the column doesn't exist yet (user hasn't run the migration)
        if (upgradeError.code === '42703') {
           const { error: fallbackError } = await supabase
            .from('deck_upgrades')
            .insert({
              deck_id: id,
              card_in: typeof change.card_in === 'string' ? change.card_in : (change.card_in?.name || null),
              card_out: change.card_out || null,
              cost: change.cost || 0,
              description: change.description || '',
              month
            });
            if (fallbackError) throw fallbackError;
        } else {
          throw upgradeError;
        }
      }

      // 2. Update current mainboard (deck_cards)
      if (change.card_out) {
        // Fetch current quantity
        const { data: existing } = await supabase
          .from('deck_cards')
          .select('quantity')
          .eq('deck_id', id)
          .eq('card_name', change.card_out)
          .single();

        if (existing && existing.quantity > 1) {
          const { error: updError } = await supabase
            .from('deck_cards')
            .update({ quantity: existing.quantity - 1 })
            .eq('deck_id', id)
            .eq('card_name', change.card_out);
          if (updError) throw updError;
        } else {
          const { error: delError } = await supabase
            .from('deck_cards')
            .delete()
            .eq('deck_id', id)
            .eq('card_name', change.card_out);
          if (delError) throw delError;
        }
      }

      if (change.card_in) {
        let cardData = typeof change.card_in === 'object' ? change.card_in : null;
        if (!cardData) {
          const results = await searchCards(change.card_in);
          cardData = results[0];
        }

        if (cardData) {
          const { data: existing } = await supabase
            .from('deck_cards')
            .select('id, quantity')
            .eq('deck_id', id)
            .eq('card_name', cardData.name)
            .maybeSingle();

          if (existing) {
            const { error: updError } = await supabase
              .from('deck_cards')
              .update({ quantity: (existing.quantity || 1) + 1 })
              .eq('id', existing.id);
            if (updError) throw updError;
          } else {
             const backImage = cardData.card_faces?.[1]?.image_uris?.normal || null;
             const combinedOracle = cardData.oracle_text || cardData.card_faces?.map((f: any) => `${f.name}: ${f.oracle_text}`).join('\n\n') || null;

             const { error: insError } = await supabase
               .from('deck_cards')
               .insert({
                 deck_id: id,
                 card_name: cardData.name,
                 quantity: 1,
                 is_commander: false,
                 type_line: cardData.type_line,
                 mana_cost: cardData.mana_cost,
                 image_url: cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal,
                 back_image_url: backImage,
                 oracle_text: combinedOracle
               });
            if (insError) throw insError;
          }
        }
      }

      // 3. Update deck budget
      if (change.cost && change.cost !== 0) {
        const { error: budgetError } = await supabase
          .from('decks')
          .update({ budget_spent: (deck.budget_spent || 0) + change.cost })
          .eq('id', id);
        if (budgetError) throw budgetError;
      }


      await fetchData();
    } catch (err: any) {
      alert("Error actualizando mazo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpgrade = (newUpgrade: any) => handleUpdateDeck(newUpgrade);

  const handleDeleteUpgrade = async (upgradeId: string) => {
    setLoading(true);
    try {
      const { data: upgrade, error: fetchError } = await supabase
        .from('deck_upgrades')
        .select('*')
        .eq('id', upgradeId)
        .single();
      
      if (fetchError) throw fetchError;

      // 1. Revert Card In (Remove)
      if (upgrade.card_in) {
        const { data: existing } = await supabase
          .from('deck_cards')
          .select('id, quantity')
          .eq('deck_id', id)
          .eq('card_name', upgrade.card_in)
          .maybeSingle();

        if (existing) {
          if (existing.quantity > 1) {
            await supabase.from('deck_cards').update({ quantity: existing.quantity - 1 }).eq('id', existing.id);
          } else {
            await supabase.from('deck_cards').delete().eq('id', existing.id);
          }
        }
      }

      // 2. Revert Card Out (Add back)
      if (upgrade.card_out) {
        const { data: existing } = await supabase
          .from('deck_cards')
          .select('id, quantity')
          .eq('deck_id', id)
          .eq('card_name', upgrade.card_out)
          .maybeSingle();

        if (existing) {
          await supabase.from('deck_cards').update({ quantity: existing.quantity + 1 }).eq('id', existing.id);
        } else {
          // Note: Full card data for re-inserting might be incomplete if we don't have it saved
          // For now, we search Scryfall to get basic data back
          const results = await searchCards(upgrade.card_out);
          const cardData = results[0];
          if (cardData) {
            await supabase.from('deck_cards').insert({
              deck_id: id,
              card_name: cardData.name,
              quantity: 1,
              type_line: cardData.type_line,
              mana_cost: cardData.mana_cost,
              image_url: cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal,
              oracle_text: cardData.oracle_text
            });
          }
        }
      }

      // 3. Revert Budget
      if (upgrade.cost && upgrade.cost !== 0) {
        await supabase.from('decks').update({ budget_spent: (deck.budget_spent || 0) - upgrade.cost }).eq('id', id);
      }

      // 4. Delete the upgrade log entry
      await supabase.from('deck_upgrades').delete().eq('id', upgradeId);

      await fetchData();
    } catch (err: any) {
      alert("Error al deshacer mejora: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUpgrade = async (upgradeId: string, updates: any) => {
    // We don't use the global setLoading(true) here because it unmounts the whole page (flicker)
    try {
      // 1. Fetch current upgrade to calculate budget difference
      const { data: current, error: fetchError } = await supabase
        .from('deck_upgrades')
        .select('*')
        .eq('id', upgradeId)
        .single();
      
      if (fetchError) throw fetchError;

      // 2. Update the upgrade
      const { error: updateError } = await supabase
        .from('deck_upgrades')
        .update(updates)
        .eq('id', upgradeId);
      
      if (updateError) throw updateError;

      // 3. Update deck budget if cost changed
      if (updates.cost !== undefined && updates.cost !== current.cost) {
        const diff = updates.cost - current.cost;
        const { error: budgetError } = await supabase
          .from('decks')
          .update({ budget_spent: (deck.budget_spent || 0) + diff })
          .eq('id', id);
        if (budgetError) throw budgetError;
      }

      // 4. Fetch data without full page spinner
      const { data: upgradeData } = await supabase
        .from('deck_upgrades')
        .select('*')
        .eq('deck_id', id)
        .order('created_at', { ascending: false });
      
      const { data: deckData } = await supabase
        .from('decks')
        .select('*, profiles!user_id(username)')
        .eq('id', id)
        .single();

      if (upgradeData) setUpgrades(upgradeData);
      if (deckData) setDeck(deckData);

    } catch (err: any) {
      alert("Error actualizando mejora: " + err.message);
    }
  };

  const handleUpdateImage = async (imageUrl: string) => {
    const { error } = await supabase
      .from('decks')
      .update({ image_url: imageUrl })
      .eq('id', id);
    
    if (error) alert('Error: ' + error.message);
    else {
      setDeck({ ...deck, image_url: imageUrl });
      setShowPicker(false);
    }
  };

  const handleUpdatePreconUrl = async () => {
    const { error } = await supabase
      .from('decks')
      .update({ precon_url: tempPreconUrl })
      .eq('id', id);
    
    if (error) alert('Error: ' + error.message);
    else {
      setDeck({ ...deck, precon_url: tempPreconUrl });
      setEditingPrecon(false);
    }
  };

  const handleSyncCards = async () => {
    if (!deck.moxfield_id && !deck.archidekt_id) {
      alert("No se puede sincronizar un mazo manual.");
      return;
    }

    setLoading(true);
    try {
      let endpoint = '';
      let url = '';
      if (deck.moxfield_id) {
        endpoint = '/api/import/moxfield';
        url = `https://www.moxfield.com/decks/${deck.moxfield_id}`;
      } else {
        endpoint = '/api/import/archidekt';
        url = `https://www.archidekt.com/decks/${deck.archidekt_id}`;
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Delete existing cards and insert new ones
      await supabase.from('deck_cards').delete().eq('deck_id', id);
      
      const deckCards = data.cards.map((c: any) => ({
        deck_id: id,
        card_name: c.name,
        quantity: c.quantity || 1,
        is_commander: c.is_commander || false,
        type_line: c.type_line || null,
        mana_cost: c.mana_cost || null,
        image_url: c.image_url || null,
        oracle_text: c.oracle_text || null
      }));

      const { error: cardsError } = await supabase
        .from('deck_cards')
        .insert(deckCards);

      if (cardsError) throw cardsError;
      
      alert("¡Mazo sincronizado con éxito!");
      fetchData();
    } catch (err: any) {
      alert("Error al sincronizar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToText = () => {
    const list = deckCards.map(c => `${c.quantity} ${c.card_name}`).join('\n');
    navigator.clipboard.writeText(list);
    alert('¡Mazo exportado al portapapeles!');
  };

  const copyToClipboard = () => {
    const list = upgrades.map(u => `1 ${u.card_in}`).join('\n');
    navigator.clipboard.writeText(list);
    alert('¡Lista de mejoras copiada al portapapeles!');
  };

  // 1. Fetch Trending Prices once for all components
  useEffect(() => {
    const fetchTrending = async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentMonthUpgrades = upgrades.filter(u => u.month === currentMonth && u.card_in);
      if (currentMonthUpgrades.length === 0) {
        setTrendingPrices({});
        return;
      }

      setLoadingTrending(true);
      const identifiers = currentMonthUpgrades.map(u => u.scryfall_id ? { id: u.scryfall_id } : { name: u.card_in });
      const cards = await getCollection(identifiers);
      
      const prices: Record<string, number> = {};
      cards.forEach(c => {
        if (c.id) prices[c.id] = parseFloat(c.prices.eur || '0');
        prices[c.name.toLowerCase()] = parseFloat(c.prices.eur || '0');
      });
      setTrendingPrices(prices);
      setLoadingTrending(false);
    };

    if (upgrades.length > 0) fetchTrending();
  }, [upgrades]);

  // 2. Calculate coordinated budget info
  const budgetInfo = React.useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Sum all registered costs
    // BUT we need to swap current month costs with live trending if they exist
    const totalWithTrending = upgrades.reduce((sum, u) => {
      if (u.month === currentMonth && u.card_in) {
        const trending = u.scryfall_id ? trendingPrices[u.scryfall_id] : trendingPrices[u.card_in.toLowerCase()];
        return sum + (trending !== undefined ? trending : (u.cost || 0));
      }
      return sum + (u.cost || 0);
    }, 0);

    return calculateDeckBudget(deck?.created_at || new Date(), deck?.budget_spent || 0, totalWithTrending);
  }, [deck, upgrades, trendingPrices]);

  if (loading) return (
    <div style={{ textAlign: 'center', marginTop: '5rem' }}>
      <div className="spinner" style={{ marginBottom: '1rem' }}></div>
      <p>Cargando mazo...</p>
    </div>
  );
  
  if (!deck) return (
    <div style={{ textAlign: 'center', marginTop: '5rem' }}>
      <h2 style={{ color: 'var(--color-red)' }}>Mazo no encontrado</h2>
      {error && <p style={{ color: 'var(--color-red)', fontWeight: 'bold' }}>Error: {error}</p>}
      <p style={{ color: '#888', marginBottom: '2rem' }}>Es posible que el mazo aún se esté procesando o la URL sea incorrecta.</p>
      <button onClick={() => fetchData(5)} className="btn btn-gold">Reintentar Conexión</button>
      <button onClick={() => router.push('/decks')} className="btn" style={{ marginLeft: '1rem', background: '#333' }}>Volver a Mis Mazos</button>
    </div>
  );

  const isOwner = user?.id === deck.user_id;
  const currentDeckListNames = deckCards.map(c => c.card_name);

  // Special state for empty decks
  if (deckCards.length === 0 && !loading) {
    return (
      <div style={{ maxWidth: '800px', margin: '4rem auto', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--color-gold)', marginBottom: '1rem' }}>{deck.name}</h1>
        <div className="card" style={{ padding: '3rem', border: '1px solid #333' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
          <h2 style={{ marginBottom: '1rem' }}>Mazo sin cartas</h2>
          <p style={{ color: '#888', marginBottom: '2rem' }}>
            Este mazo se ha registrado correctamente, pero la lista de cartas no se ha cargado todavía.
          </p>
          
          {isOwner && (deck.moxfield_id || deck.archidekt_id) ? (
            <div style={{ background: '#111', padding: '2rem', borderRadius: '12px' }}>
              <p style={{ marginBottom: '1.5rem', fontWeight: 'bold' }}>¿Quieres intentar sincronizar las cartas ahora?</p>
              <button 
                onClick={handleSyncCards} 
                className="btn btn-gold" 
                style={{ padding: '0.8rem 2rem' }}
              >
                🔄 Sincronizar con {deck.moxfield_id ? 'Moxfield' : 'Archidekt'}
              </button>
            </div>
          ) : (
            <div style={{ background: '#111', padding: '2rem', borderRadius: '12px' }}>
              <p style={{ marginBottom: '1rem' }}>Puedes añadir cartas manualmente usando el editor visual o el registro de mejoras.</p>
              <button onClick={() => router.push('/decks')} className="btn" style={{ background: '#333' }}>Volver a Mis Mazos</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container" style={{ 
      margin: '0 auto', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '3rem',
      paddingBottom: '4rem'
    }}>
      
      {/* SECTION 1: Top Grid (Deck Info + Upgrades) */}
      <div className="deck-detail-grid" style={{ display: 'grid', gap: '2rem' }}>
        
        {/* Left Column: Deck Info */}
        <aside style={{ height: '100%' }}>
          {/* ... commander img card ... */}
          <div className="card" style={{ textAlign: 'center', position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
             <div className="commander-img-container" style={{ position: 'relative' }}>
               <img 
                 src={deck.image_url || 'https://via.placeholder.com/300x400'} 
                 alt={deck.commander} 
                 style={{ width: '100%', borderRadius: '12px', marginBottom: '1rem', border: '1px solid #333' }}
               />
               {isOwner && (
                 <button 
                  onClick={() => setShowPicker(true)}
                  className="btn btn-gold"
                  style={{ position: 'absolute', bottom: '20px', right: '10px', padding: '5px 10px', fontSize: '0.7rem' }}
                 >
                   Cambiar Arte
                 </button>
               )}
             </div>
             
             <h1 style={{ color: 'var(--color-gold)', fontSize: '1.5rem' }}>{deck.name}</h1>
             <p style={{ color: '#888', marginBottom: '1rem' }}>Comandante: {deck.commander}</p>
             
             {(() => {
                const { monthsActive, dynamicLimit, totalSpent, remaining, statusColor } = budgetInfo;

                return (
                 <div style={{ padding: '1rem', background: '#111', borderRadius: '8px', marginBottom: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        <span>Presupuesto (Mes {monthsActive}):</span>
                         <span style={{ color: statusColor }}>
                            {totalSpent.toFixed(2)}€ / {dynamicLimit}€
                        </span>
                    </div>
                    <div style={{ background: '#222', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${Math.min((totalSpent / dynamicLimit) * 100, 100)}%`, 
                            height: '100%', 
                            background: statusColor
                        }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem', textAlign: 'right' }}>
                        {totalSpent > dynamicLimit 
                            ? `Te has pasado ${ Math.abs(remaining).toFixed(2) }€ del acumulado.` 
                            : `Tienes ${ remaining.toFixed(2) }€ disponibles.`
                        }
                    </div>
                 </div>
                );
             })()}

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button onClick={copyToClipboard} className="btn" style={{ flex: 1, background: '#333', fontSize: '0.8rem' }}>
                  Copiar Mejoras
                </button>
                <button onClick={exportToText} className="btn" style={{ flex: 1, background: '#333', fontSize: '0.8rem' }}>
                   Exportar Mazo
                </button>
              </div>
              {isOwner && (deck.moxfield_id || deck.archidekt_id) && (
                <button 
                  onClick={handleSyncCards} 
                  className="btn" 
                  style={{ width: '100%', marginTop: '0.5rem', background: '#222', fontSize: '0.8rem', border: '1px solid #333' }}
                >
                  🔄 Sincronizar con Web
                </button>
              )}
          </div>
        </aside>

        {/* Right Column: Upgrades */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <UpgradeLog 
            upgrades={upgrades} 
            currentDeckList={currentDeckListNames}
            onAddUpgrade={handleAddUpgrade}
            onDeleteUpgrade={handleDeleteUpgrade}
            onUpdateUpgrade={handleUpdateUpgrade}
            isOwner={isOwner}
            trendingPrices={trendingPrices}
          />
        </div>
      </div>

      {/* SECTION 2: Visual Editor */}
      <div style={{ width: '100%' }}>
        <DeckVisualizer 
          cards={deckCards} 
          isOwner={isOwner} 
          onUpdateDeck={handleUpdateDeck} 
          preconCardNames={preconCardNames}
          deckId={id as string}
          cardTags={cardTags}
          onTagsUpdate={fetchTags}
          userCollection={userCollection}
        />
      </div>

      {/* SECTION 3: Alerts & Stats */}
      {(() => {
          const { dynamicLimit, totalSpent } = budgetInfo;
          
          return (
            <DeckAlerts 
                cards={deckCards}
                cardTags={cardTags}
                totalSpent={totalSpent}
                budgetLimit={dynamicLimit}
            />
          );
      })()}

      {/* SECTION 4: Stats & Details */}
      <div className="stats-grid">
        <div className="card">
           <h3 style={{ marginBottom: '1.5rem' }}>Análisis de Maná</h3>
           <ManaAnalysis cards={deckCards} />
        </div>

         <TagStats 
           cardTags={Object.entries(cardTags).map(([card_name, tags]) => ({ card_name, tags }))}
           onFilterByTag={setTagFilter}
           activeFilter={tagFilter}
         />
         <div className="budget-stats-grid" style={{ gridColumn: 'span 3', display: 'grid', gap: '2rem' }}>
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)' }}>Evolución del Presupuesto</h3>
              <div style={{ flex: 1, position: 'relative' }}>
                 <BudgetChart upgrades={upgrades} creationDate={deck.created_at} />
              </div>
            </div>
            <div style={{ height: '100%' }}>
               <MonthlyBreakdown upgrades={upgrades} trendingPrices={trendingPrices} />
            </div>
         </div>
         <div style={{ gridColumn: '1 / -1' }}>
            <Wishlist deckId={id as string} isOwner={isOwner} />
         </div>
      </div>


      {showPicker && (
        <CommanderPicker 
          commanderName={deck.commander} 
          onSelect={handleUpdateImage} 
          onClose={() => setShowPicker(false)} 
        />
      )}
    </div>
  );
}
