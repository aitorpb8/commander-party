'use client'

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import styles from './DeckDetail.module.css';
import DeckHeader from '@/components/deck/DeckHeader';
import DeckActionButtons from '@/components/deck/DeckActionButtons';

import { Deck, DeckCard, DeckUpgrade } from '@/types';
import UpgradeLog from '@/components/UpgradeLog';
import BudgetChart from '@/components/BudgetChart';
import ManaAnalysis from '@/components/ManaAnalysis';
import Wishlist from '@/components/Wishlist';
import MonthlyBreakdown from '@/components/MonthlyBreakdown';
import { searchCards, getCollection } from '@/lib/scryfall';
import CommanderPicker from '@/components/CommanderPicker';
import DeckVisualizer from '@/components/DeckVisualizer';
import TagStats from '@/components/TagStats';
import DeckAlerts from '@/components/DeckAlerts';
import { calculateDeckBudget } from '@/lib/budgetUtils';
import ConfirmationDialog from '@/components/ConfirmationDialog';

export default function DeckDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [upgrades, setUpgrades] = useState<DeckUpgrade[]>([]);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const [userCollection, setUserCollection] = useState<Set<string>>(new Set());
  const [showPicker, setShowPicker] = useState(false);

  const [preconCardNames, setPreconCardNames] = useState<Set<string>>(new Set());

  const [cardTags, setCardTags] = useState<Record<string, string[]>>({});
  const [tagFilter, setTagFilter] = useState<string | null>(null);

  const [trendingPrices, setTrendingPrices] = useState<Record<string, number>>({});
  const [loadingTrending, setLoadingTrending] = useState(false);

  const [messageDialog, setMessageDialog] = useState<{ title: string, message: string, isError?: boolean } | null>(null);
  const [activeCmcFilter, setActiveCmcFilter] = useState<number | null>(null);

  const activeIdRef = React.useRef(id);

  useEffect(() => {
    activeIdRef.current = id;
    
    setDeck(null);
    setUpgrades([]);
    setDeckCards([]);
    setLoading(true);
    setError(null);
    setPreconCardNames(new Set());
    setTrendingPrices({});
  }, [id]);

  const supabase = createClient();

  const fetchData = async (retries = 5, silent = false) => {
    if (activeIdRef.current !== id) return;
    
    if (!silent) setLoading(true);

    const { data: deckData, error: dbError } = await supabase
      .from('decks')
      .select('*, profiles:user_id(username)')
      .eq('id', id)
      .maybeSingle(); 
    
    if (activeIdRef.current !== id) return;

    if (dbError) {
      console.error("Supabase fetch error:", dbError);
      setError(dbError.message);
      setLoading(false);
      return;
    }
    
    if (!deckData && retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (activeIdRef.current !== id) return;
      return fetchData(retries - 1, silent);
    }

    if (!deckData) {
      setLoading(false);
      return;
    }

    const { data: upgradeData } = await supabase
      .from('deck_upgrades')
      .select('*')
      .eq('deck_id', id)
      .order('created_at', { ascending: false });

    if (activeIdRef.current !== id) return;

    const { data: cardsData } = await supabase
      .from('deck_cards')
      .select('*')
      .eq('deck_id', id);

    if (activeIdRef.current !== id) return;

    setDeckCards(cardsData || []);
    setDeck(deckData as Deck);
    setUpgrades((upgradeData || []) as DeckUpgrade[]);

    if (user) {
      const { data: colData } = await supabase
        .from('user_collection')
        .select('card_name')
        .eq('user_id', user.id);
      
      if (activeIdRef.current !== id) return;

      if (colData) {
        setUserCollection(new Set(colData.map(c => c.card_name.toLowerCase())));
      }
    }

    if (deckData?.precon_cards && deckData.precon_cards.length > 0) {
      setPreconCardNames(new Set(deckData.precon_cards.map((n: string) => n.toLowerCase())));
    } 

    if (!silent) setLoading(false);
    setError(null);
  };

  const fetchTags = async () => {
    if (activeIdRef.current !== id) return;

    const { data, error } = await supabase
      .from('deck_card_tags')
      .select('card_name, tags')
      .eq('deck_id', id);
    
    if (activeIdRef.current !== id) return;
    
    if (error) return;

    const tagsMap: Record<string, string[]> = {};
    data?.forEach(row => {
      tagsMap[row.card_name] = row.tags || [];
    });
    setCardTags(tagsMap);
  };

  useEffect(() => {
    fetchData();
    fetchTags();
  }, [id]);

  const handleUpdateDeck = async (change: any) => {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const { error: upgradeError } = await supabase
        .from('deck_upgrades')
        .insert({
          deck_id: id,
          card_in: typeof change.card_in === 'string' ? change.card_in : (change.card_in?.card_name || change.card_in?.name || null),
          card_out: change.card_out || null,
          cost: change.cost || 0,
          description: change.description || '',
          month,
          scryfall_id: typeof change.card_in === 'object' ? (change.card_in?.scryfall_id || change.card_in?.id) : null
        });
      
      if (upgradeError) throw upgradeError;
      
      if (change.cost !== 0) {
         await supabase.from('decks').update({ budget_spent: (deck?.budget_spent || 0) + (change.cost || 0) }).eq('id', id);
      }

      await fetchData(5, false);
    } catch (err: any) {
      setMessageDialog({ title: 'Error al actualizar', message: `No se pudo actualizar el mazo: ${err.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleAddUpgrade = (newUpgrade: any) => handleUpdateDeck(newUpgrade);

  const handleDeleteUpgrade = async (upgradeId: string) => {
    try {
      const { data: upgrade, error: fetchError } = await supabase
        .from('deck_upgrades')
        .select('*')
        .eq('id', upgradeId)
        .single();
      
      if (fetchError) throw fetchError;

      if (upgrade.cost && upgrade.cost !== 0) {
        await supabase.from('decks').update({ budget_spent: (deck?.budget_spent || 0) - upgrade.cost }).eq('id', id);
      }

      await supabase.from('deck_upgrades').delete().eq('id', upgradeId);
      await fetchData(5, true);
    } catch (err: any) {
      setMessageDialog({ title: 'Error al deshacer', message: `No se pudo deshacer la mejora: ${err.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUpgrade = async (upgradeId: string, updates: any) => {
    try {
      const { data: current } = await supabase.from('deck_upgrades').select('*').eq('id', upgradeId).single();
      await supabase.from('deck_upgrades').update(updates).eq('id', upgradeId);

      if (updates.cost !== undefined && updates.cost !== current.cost) {
        const diff = updates.cost - current.cost;
        await supabase.from('decks').update({ budget_spent: (deck?.budget_spent || 0) + diff }).eq('id', id);
      }

      await fetchData(5, true);
    } catch (err: any) {
      setMessageDialog({ title: 'Error al actualizar', message: `No se pudo actualizar la mejora: ${err.message}`, isError: true });
    }
  };

  const handleUpdateImage = async (imageUrl: string) => {
    const { error } = await supabase.from('decks').update({ image_url: imageUrl }).eq('id', id);
    if (!error) {
      setDeck({ ...deck, image_url: imageUrl } as Deck);
      setShowPicker(false);
    }
  };

  const handleSyncCards = async () => {
    if (!deck || !deck.archidekt_id) return;
    setLoading(true);
    try {
      const res = await fetch('/api/import/archidekt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: `https://www.archidekt.com/decks/${deck.archidekt_id}` })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      await supabase.from('deck_cards').delete().eq('deck_id', id);
      await supabase.from('deck_cards').insert(data.cards.map((c: any) => ({ ...c, deck_id: id })));
      
      setMessageDialog({ title: '¡Éxito!', message: 'Mazo sincronizado.', isError: false });
      await fetchData(5, false);
    } catch (err: any) {
      setMessageDialog({ title: 'Error', message: err.message, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const exportToText = () => {
    const list = deckCards.map(c => `${c.quantity} ${c.card_name}`).join('\n');
    navigator.clipboard.writeText(list);
    setMessageDialog({ title: '¡Exportado!', message: 'Mazo copiado al portapapeles.', isError: false });
  };

  const copyToClipboard = () => {
    const list = upgrades.map(u => `1 ${u.card_in}`).join('\n');
    navigator.clipboard.writeText(list);
    setMessageDialog({ title: '¡Copiado!', message: 'Lista de mejoras copiada.', isError: false });
  };

  useEffect(() => {
    const fetchTrending = async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      const currentMonthUpgrades = upgrades.filter(u => u.month === currentMonth && u.card_in);
      if (currentMonthUpgrades.length === 0) return;

      setLoadingTrending(true);
      const identifiers = currentMonthUpgrades.map(u => u.scryfall_id ? { id: u.scryfall_id } : { name: u.card_in || '' });
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

  const budgetInfo = React.useMemo(() => {
    return calculateDeckBudget(deck?.created_at || new Date(), deck?.budget_spent || 0);
  }, [deck]);

  if (loading) return (
    <div className={styles.pageContainer} style={{ opacity: 0.6 }}>
      <div className={styles.topGrid}>
        <div className="skeleton-pulse" style={{ height: '450px', borderRadius: '12px' }} />
        <div className="skeleton-pulse" style={{ height: '450px', borderRadius: '12px' }} />
      </div>
      <div className="skeleton-pulse" style={{ height: '600px', borderRadius: '12px' }} />
    </div>
  );
  
  if (!deck) return (
    <div style={{ textAlign: 'center', marginTop: '5rem' }}>
      <h2 style={{ color: 'var(--color-red)' }}>Mazo no encontrado</h2>
      <button onClick={() => fetchData(5)} className="btn btn-gold">Reintentar</button>
    </div>
  );

  const isOwner = user?.id === deck.user_id;
  const currentDeckListNames = deckCards.map(c => c.card_name);

  if (deckCards.length === 0 && !loading) {
    return (
      <div className={styles.emptyDeckContainer}>
        <h1 className={styles.emptyDeckTitle}>{deck.name}</h1>
        <div className={`card ${styles.emptyDeckCard}`}>
          <div className={styles.emptyDeckIcon}>📭</div>
          <h2>Mazo sin cartas</h2>
          {isOwner && deck.archidekt_id ? (
            <div className={styles.syncHelperBox}>
              <button onClick={handleSyncCards} className="btn btn-gold">🔄 Sincronizar</button>
            </div>
          ) : (
             <p>Carga cartas para empezar.</p>
          )}
        </div>
      </div>
    );
  }

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthSpent = upgrades.reduce((sum, u) => {
       if (u.month !== currentMonth) return sum;
       if (u.card_in && preconCardNames.has(u.card_in.toLowerCase())) return sum;
       return sum + (u.cost || 0);
  }, 0);
  const spentPrevious = budgetInfo.totalSpent - currentMonthSpent;
  const effectiveMonthlyLimit = Math.max(0, budgetInfo.dynamicLimit - spentPrevious);

  return (
    <div className={styles.pageContainer}>
      
      <div className={styles.topGrid}>
        <aside>
          <DeckHeader 
            name={deck.name}
            commander={deck.commander}
            imageUrl={deck.image_url || ''}
            isOwner={isOwner}
            onShowPicker={() => setShowPicker(true)}
            budgetInfo={budgetInfo}
            currentMonthSpent={currentMonthSpent}
            effectiveMonthlyLimit={effectiveMonthlyLimit}
            cards={deckCards}
          />
          <DeckActionButtons 
            isOwner={isOwner}
            hasArchidektId={!!deck.archidekt_id}
            onCopyMejoras={copyToClipboard}
            onExportMazo={exportToText}
            onSyncArchidekt={handleSyncCards}
          />
        </aside>

        <div style={{ height: '100%' }}>
          <UpgradeLog 
            upgrades={upgrades} 
            onAddUpgrade={handleAddUpgrade}
            onDeleteUpgrade={handleDeleteUpgrade}
            onUpdateUpgrade={handleUpdateUpgrade}
            isOwner={isOwner}
            preconCardNames={preconCardNames}
            trendingPrices={trendingPrices}
            currentDeckList={currentDeckListNames}
          />
        </div>
      </div>

      <div className={styles.visualEditorSection}>
        <DeckVisualizer 
          cards={deckCards} 
          isOwner={isOwner} 
          onUpdateDeck={handleUpdateDeck} 
          preconCardNames={preconCardNames}
          deckId={id as string}
          cardTags={cardTags}
          onTagsUpdate={fetchTags}
          userCollection={userCollection}
          externalCmcFilter={activeCmcFilter}
        />
      </div>

      <DeckAlerts 
          cards={deckCards}
          cardTags={cardTags}
          totalSpent={budgetInfo.totalSpent}
          budgetLimit={budgetInfo.dynamicLimit}
      />

      <div className={styles.statsGrid}>
         <div className="card glass-panel" style={{ padding: '1.5rem' }}>
            <ManaAnalysis cards={deckCards} onCMCFilter={setActiveCmcFilter} activeFilter={activeCmcFilter} />
         </div>
         <TagStats 
            cardTags={Object.entries(cardTags).map(([card_name, tags]) => ({ card_name, tags }))}
            onFilterByTag={setTagFilter}
            activeFilter={tagFilter}
         />
         <div className="card" style={{ display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
            <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)' }}>Evolución del Presupuesto</h3>
            <div style={{ flex: 1, minHeight: '300px', position: 'relative' }}>
               <BudgetChart upgrades={upgrades} creationDate={deck.created_at} />
            </div>
         </div>
      </div>

      <div className={styles.fullWidthRow}>
         <MonthlyBreakdown upgrades={upgrades} trendingPrices={trendingPrices} preconCardNames={preconCardNames} />
      </div>

      <div className={styles.fullWidthRow}>
            <Wishlist 
              deckId={id as string} 
              isOwner={isOwner} 
              onUpdateDeck={handleUpdateDeck}
              trendingPrices={trendingPrices}
              deckCards={deckCards}
            />
      </div>

      {showPicker && (
        <CommanderPicker 
          commanderName={deck.commander} 
          onSelect={handleUpdateImage} 
          onClose={() => setShowPicker(false)} 
        />
      )}

      <ConfirmationDialog
        isOpen={messageDialog !== null}
        title={messageDialog?.title || ''}
        message={messageDialog?.message || ''}
        confirmText="Entendido"
        cancelText=""
        isDestructive={false}
        onConfirm={() => setMessageDialog(null)}
        onCancel={() => setMessageDialog(null)}
      />
    </div>
  );
}
