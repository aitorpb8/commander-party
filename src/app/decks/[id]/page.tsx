'use client'

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import styles from './DeckDetail.module.css';
import DeckHeader from '@/components/deck/DeckHeader';
import DeckActionButtons from '@/components/deck/DeckActionButtons';

import { Deck, DeckCard, DeckUpgrade, ScryfallCard } from '@/types';
import UpgradeLog from '@/components/UpgradeLog';
import BudgetChart from '@/components/BudgetChart';
import ManaAnalysis from '@/components/ManaAnalysis';
import Wishlist from '@/components/Wishlist';
import MonthlyBreakdown from '@/components/MonthlyBreakdown';
import { searchCards, getCollection, getCardByName } from '@/lib/scryfall';
import CommanderPicker from '@/components/CommanderPicker';
import DeckVisualizer from '@/components/DeckVisualizer';
import TagStats from '@/components/TagStats';
import DeckAlerts from '@/components/DeckAlerts';
import { calculateDeckBudget } from '@/lib/budgetUtils';
import ConfirmationDialog from '@/components/ConfirmationDialog';

export default function DeckDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  
  const [deck, setDeck] = useState<Deck | null>(null);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [upgrades, setUpgrades] = useState<DeckUpgrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [messageDialog, setMessageDialog] = useState<{ title: string, message: string, isError: boolean } | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [trendingPrices, setTrendingPrices] = useState<Record<string, number>>({});
  const [loadingTrending, setLoadingTrending] = useState(false);
  const [cardTags, setCardTags] = useState<Record<string, string[]>>({});
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [activeCmcFilter, setActiveCmcFilter] = useState<number | null>(null);
  const [userCollection, setUserCollection] = useState<any[]>([]);

  const supabase = createClient();

  const fetchData = async (retries = 3, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: deckData, error: deckError } = await supabase.from('decks').select('*, profiles(username)').eq('id', id).single();
      if (deckError) throw deckError;

      const { data: upgrades, error: upError } = await supabase.from('deck_upgrades').select('*').eq('deck_id', id).order('month', { ascending: false }).order('created_at', { ascending: false });
      if (upError) throw upError;

      const { data: cards, error: cardsError } = await supabase.from('deck_cards').select('*').eq('deck_id', id).order('card_name', { ascending: true });
      if (cardsError) throw cardsError;

      const preconCards = new Set((deckData.precon_cards || []).map((n: string) => n.toLowerCase().trim()));

      const totalSpentDB = (upgrades || []).reduce((sum, u) => {
        const nameIn = (u.card_in || '').toLowerCase().trim();
        if (nameIn && preconCards.has(nameIn)) return sum;
        return sum + Number(u.cost || 0);
      }, 0);

      if (Math.abs(totalSpentDB - (deckData.budget_spent || 0)) > 0.01) {
        await supabase.from('decks').update({ budget_spent: totalSpentDB }).eq('id', id);
        deckData.budget_spent = totalSpentDB;
      }

      setDeck(deckData);
      setUpgrades(upgrades || []);
      setDeckCards(cards || []);
      fetchTags();
      fetchCollection();
    } catch (err: any) {
      if (retries > 0) setTimeout(() => fetchData(retries - 1, silent), 1000);
      else setMessageDialog({ title: 'Error', message: `No se pudieron cargar los datos: ${err.message}`, isError: true });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchTags = async () => {
    const { data } = await supabase.from('card_tags').select('*').eq('deck_id', id);
    const tagsMap: Record<string, string[]> = {};
    data?.forEach(t => {
      if (!tagsMap[t.card_name]) tagsMap[t.card_name] = [];
      tagsMap[t.card_name].push(t.tag);
    });
    setCardTags(tagsMap);
  };

  const fetchCollection = async () => {
    if (!user) return;
    const { data } = await supabase.from('user_collection').select('*').eq('user_id', user.id);
    setUserCollection(data || []);
  };

  useEffect(() => {
    if (id) fetchData();
  }, [id, user]);

  const handleUpdateDeck = async (change: any) => {
    try {
      const month = new Date().toISOString().slice(0, 7);
      const cardNameIn = typeof change.card_in === 'string' ? change.card_in : (change.card_in?.name || '');
      const cardNameOut = typeof change.card_out === 'string' ? change.card_out : (change.card_out?.name || '');
      
      const preconCards = new Set((deck?.precon_cards || []).map(n => n.toLowerCase().trim()));
      const isPrecon = cardNameIn && preconCards.has(cardNameIn.toLowerCase().trim());
      const upgradeCost = isPrecon ? 0 : (change.cost || 0);

      // 1. Insert into history
      const { error: upgradeError } = await supabase.from('deck_upgrades').insert({
          deck_id: id,
          card_in: cardNameIn || null,
          card_out: cardNameOut || null,
          cost: upgradeCost,
          month,
          description: change.description || null,
          scryfall_id: typeof change.card_in === 'string' ? null : (change.card_in?.id || null)
      });
      if (upgradeError) throw upgradeError;

      // 2. Update deck_cards table (The visual state)
      if (cardNameOut) {
        await supabase.from('deck_cards').delete().eq('deck_id', id).eq('card_name', cardNameOut);
      }

      if (change.card_in && typeof change.card_in !== 'string') {
        const sc: ScryfallCard = change.card_in;
        const imageUrl = sc.image_uris?.normal || sc.card_faces?.[0]?.image_uris?.normal || '';
        const backImageUrl = sc.card_faces?.[1]?.image_uris?.normal || null;
        const oracleText = sc.oracle_text || sc.card_faces?.map(f => `${f.name}: ${f.oracle_text}`).join('\n\n') || null;

        await supabase.from('deck_cards').insert({
          deck_id: id,
          card_name: sc.name,
          quantity: 1,
          is_commander: false,
          type_line: sc.type_line,
          mana_cost: sc.mana_cost || sc.card_faces?.[0]?.mana_cost || null,
          image_url: imageUrl,
          back_image_url: backImageUrl,
          oracle_text: oracleText,
          scryfall_id: sc.id
        });
      }

      await fetchData(5, true);
    } catch (err: any) {
      setMessageDialog({ title: 'Error', message: err.message, isError: true });
    }
  };

  const handleDeleteUpgrade = async (upgradeId: string) => {
    try {
      const { data: upgrade } = await supabase.from('deck_upgrades').select('*').eq('id', upgradeId).single();
      if (!upgrade) return;

      // Reverse in deck_cards
      if (upgrade.card_in) {
        await supabase.from('deck_cards').delete().eq('deck_id', id).eq('card_name', upgrade.card_in);
      }
      
      if (upgrade.card_out) {
        // We need to restore the card. We fetch its data from Scryfall to be accurate.
        const sc = await getCardByName(upgrade.card_out);
        if (sc) {
          const imageUrl = sc.image_uris?.normal || sc.card_faces?.[0]?.image_uris?.normal || '';
          const backImageUrl = sc.card_faces?.[1]?.image_uris?.normal || null;
          
          await supabase.from('deck_cards').insert({
            deck_id: id,
            card_name: sc.name,
            quantity: 1,
            is_commander: false,
            type_line: sc.type_line,
            mana_cost: sc.mana_cost || sc.card_faces?.[0]?.mana_cost || null,
            image_url: imageUrl,
            back_image_url: backImageUrl,
            oracle_text: sc.oracle_text || null,
            scryfall_id: sc.id
          });
        }
      }

      await supabase.from('deck_upgrades').delete().eq('id', upgradeId);
      await fetchData(5, true);
    } catch (err: any) {
      setMessageDialog({ title: 'Error', message: err.message, isError: true });
    }
  };

  const handleUpdateUpgrade = async (upgradeId: string, updates: any) => {
    try {
      await supabase.from('deck_upgrades').update(updates).eq('id', upgradeId);
      await fetchData(5, true);
    } catch (err: any) {
      setMessageDialog({ title: 'Error', message: err.message, isError: true });
    }
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

  const currentMonth = new Date().toISOString().slice(0, 7);
  const preconNames = new Set((deck?.precon_cards || []).map(n => n.toLowerCase().trim()));
  
  const totalSpentCalc = upgrades.reduce((sum, u) => {
    const nameIn = (u.card_in || '').toLowerCase().trim();
    if (nameIn && preconNames.has(nameIn)) return sum;
    const isCurrentMonth = u.month === currentMonth;
    const trending = u.scryfall_id ? trendingPrices[u.scryfall_id] : (nameIn ? trendingPrices[nameIn] : null);
    const actualCost = (isCurrentMonth && typeof trending === 'number') ? trending : Number(u.cost || 0);
    return sum + actualCost;
  }, 0);

  const currentMonthSpent = upgrades
    .filter(u => u.month === currentMonth)
    .reduce((sum, u) => {
      const nameIn = (u.card_in || '').toLowerCase().trim();
      if (nameIn && preconNames.has(nameIn)) return sum;
      const trending = u.scryfall_id ? trendingPrices[u.scryfall_id] : (nameIn ? trendingPrices[nameIn] : null);
      return sum + (typeof trending === 'number' ? trending : Number(u.cost || 0));
    }, 0);

  const budgetInfo = calculateDeckBudget(deck?.created_at || new Date(), totalSpentCalc);
  const spentPrevious = totalSpentCalc - currentMonthSpent;
  const effectiveMonthlyLimit = Math.max(0, budgetInfo.dynamicLimit - spentPrevious);

  if (loading) return <div className="spinner-gold" style={{ margin: '10rem auto' }} />;

  return (
    <div className={styles.pageContainer}>
      <DeckHeader 
        name={deck?.name || ''} 
        commander={deck?.commander || ''} 
        imageUrl={deck?.image_url || ''} 
        isOwner={user?.id === deck?.user_id}
        onShowPicker={() => setShowPicker(true)}
        currentMonthSpent={currentMonthSpent}
        effectiveMonthlyLimit={effectiveMonthlyLimit}
        budgetInfo={{ ...budgetInfo, totalSpent: totalSpentCalc }}
        cards={deckCards}
      />

      <div className={styles.topGrid}>
        <div style={{ height: '100%' }}>
          <UpgradeLog 
            upgrades={upgrades} 
            onAddUpgrade={(u) => handleUpdateDeck(u)}
            onDeleteUpgrade={handleDeleteUpgrade}
            onUpdateUpgrade={handleUpdateUpgrade}
            isOwner={user?.id === deck?.user_id}
            preconCardNames={preconNames}
            trendingPrices={trendingPrices}
            currentDeckList={deckCards.map(c => c.card_name)}
          />
        </div>
        <div className={styles.visualEditorSection}>
          <DeckVisualizer 
            cards={deckCards} 
            isOwner={user?.id === deck?.user_id} 
            onUpdateDeck={handleUpdateDeck} 
            preconCardNames={preconNames}
            deckId={id as string}
            cardTags={cardTags}
            onTagsUpdate={fetchTags}
            userCollection={new Set(userCollection.map(c => c.card_name.toLowerCase()))}
          />
        </div>
      </div>

      <DeckAlerts 
          cards={deckCards}
          cardTags={cardTags}
          totalSpent={totalSpentCalc}
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
               <BudgetChart upgrades={upgrades} creationDate={deck?.created_at || ''} />
            </div>
         </div>
      </div>

      <div className={styles.statsGrid}>
         <Wishlist deckId={id as string} isOwner={user?.id === deck?.user_id} />
         <MonthlyBreakdown upgrades={upgrades} preconCardNames={preconNames} />
      </div>

      {showPicker && (
        <CommanderPicker 
          onSelect={async (url) => {
            await supabase.from('decks').update({ image_url: url }).eq('id', id);
            setShowPicker(false);
            fetchData(1, true);
          }}
          onClose={() => setShowPicker(false)}
          commanderName={deck?.commander || ''}
        />
      )}

      {messageDialog && (
        <ConfirmationDialog 
          isOpen={true}
          title={messageDialog.title}
          message={messageDialog.message}
          onConfirm={() => setMessageDialog(null)}
          onCancel={() => setMessageDialog(null)}
          confirmText="Entendido"
        />
      )}
    </div>
  );
}
