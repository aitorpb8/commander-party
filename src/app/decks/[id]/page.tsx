'use client'

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { User } from '@supabase/supabase-js';

import { Deck, DeckCard, DeckUpgrade } from '@/types';
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
import ConfirmationDialog from '@/components/ConfirmationDialog';

export default function DeckDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [upgrades, setUpgrades] = useState<DeckUpgrade[]>([]);
  const [deckCards, setDeckCards] = useState<DeckCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
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

  // Dialog state
  const [messageDialog, setMessageDialog] = useState<{ title: string, message: string, isError?: boolean } | null>(null);

  // FIX: Race Condition Guard
  // When navigating quickly between decks, a previous fetch might finish AFTER our current fetch started
  // or overwrite the current state. We use a Ref to track the "active" ID we care about.
  const activeIdRef = React.useRef(id);

  useEffect(() => {
    activeIdRef.current = id;
    
    // Clear state immediately on ID change to show loading and avoid stale data
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
    const { data: { user: authUser } } = await supabase.auth.getUser();
    
    // Guard: If we navigated away, stop
    if (activeIdRef.current !== id) return;
    
    setUser(authUser);
    const user = authUser; 
    if (!silent) setLoading(true);

    const { data: deckData, error: dbError } = await supabase
      .from('decks')
      .select('*, profiles!user_id(username)')
      .eq('id', id)
      .maybeSingle(); 
    
    // Guard
    if (activeIdRef.current !== id) return;

    if (dbError) {
      console.error("Supabase fetch error:", dbError);
      setError(dbError.message);
      setLoading(false);
      return;
    }
    
    if (!deckData && retries > 0) {
      console.log(`Deck not found, retrying... (${retries} left)`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      // Guard before recursive call
      if (activeIdRef.current !== id) return;
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

    // Guard
    if (activeIdRef.current !== id) return;

    if (upgradeError) console.error("Upgrades error:", upgradeError);

    const { data: cardsData, error: cardsError } = await supabase
      .from('deck_cards')
      .select('*')
      .eq('deck_id', id);

    // Guard
    if (activeIdRef.current !== id) return;

    if (cardsError) console.error("Cards error:", cardsError);

    // Cleanup duplicates before setting state
    if (cardsData && cardsData.length > 0) {
      const cardsByName = new Map<string, DeckCard[]>();
      cardsData.forEach(card => {
        const existing = cardsByName.get(card.card_name) || [];
        existing.push(card);
        cardsByName.set(card.card_name, existing);
      });

      // Merge duplicates
      for (const [cardName, cards] of cardsByName.entries()) {
        if (cards.length > 1) {
          const totalQty = cards.reduce((sum, c) => sum + (c.quantity || 1), 0);
          const primaryCard = cards[0];
          
          await supabase
            .from('deck_cards')
            .update({ quantity: totalQty })
            .eq('id', primaryCard.id);
          
          const duplicateIds = cards.slice(1).map(c => c.id);
          if (duplicateIds.length > 0) {
            await supabase
              .from('deck_cards')
              .delete()
              .in('id', duplicateIds);
          }
        }
      }

      // Refetch after cleanup
      const { data: cleanedCards } = await supabase
        .from('deck_cards')
        .select('*')
        .eq('deck_id', id);
      
      // Guard
      if (activeIdRef.current !== id) return;

      setDeckCards(cleanedCards || []);
    } else {
      setDeckCards(cardsData || []);
    }

    setDeck(deckData as Deck);
    setUpgrades((upgradeData || []) as DeckUpgrade[]);

    // Fetch user collection
    if (user) {
      const { data: colData } = await supabase
        .from('user_collection')
        .select('card_name')
        .eq('user_id', user.id);
      
      // Guard
      if (activeIdRef.current !== id) return;

      if (colData) {
        setUserCollection(new Set(colData.map(c => c.card_name.toLowerCase())));
      }
    }

    // Fetch precon cards for zero-cost logic
    if (deckData?.precon_cards && deckData.precon_cards.length > 0) {
      setPreconCardNames(new Set(deckData.precon_cards.map((n: string) => n.toLowerCase())));
    } 
    else if (deckData?.precon_url) {
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
          // Guard
          if (activeIdRef.current !== id) return;

          if (data.cards) {
            const rawNames = data.cards.map((c: any) => c.name);
            const lowerNames = new Set<string>(rawNames.map((n: string) => n.toLowerCase()));
            setPreconCardNames(lowerNames);

            await supabase
              .from('decks')
              .update({ precon_cards: rawNames })
              .eq('id', id);
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
    // Guard
    if (activeIdRef.current !== id) return;

    const { data, error } = await supabase
      .from('deck_card_tags')
      .select('card_name, tags')
      .eq('deck_id', id);
    
    // Guard
    if (activeIdRef.current !== id) return;
    
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
    // We remove the global setLoading(true) to avoid full page unmount/flicker
    try {
      const month = new Date().toISOString().slice(0, 7);
      let skipInsert = false;
      let budgetDiff = 0;

      // PRE-FETCH to determine Undo Strategy (Deep vs Shallow)
      let isLastCopy = false;
      if (change.card_out && !change.card_in) {
          const cleanName = change.card_out.trim();
          const { data: rows } = await supabase
             .from('deck_cards')
             .select('quantity')
             .eq('deck_id', id)
             .ilike('card_name', cleanName);
          
          const totalQty = rows?.reduce((a, b) => a + b.quantity, 0) || 0;
          if (totalQty <= 1) isLastCopy = true;
      }

      // SMART UNDO LOGIC
      if (change.card_out && !change.card_in) {
          const cleanName = change.card_out.trim();
          
          const { data: logs } = await supabase
            .from('deck_upgrades')
            .select('*')
            .eq('deck_id', id)
            .or(`card_in.ilike.${cleanName},card_out.ilike.${cleanName}`) 
            .eq('month', month)
            .order('created_at', { ascending: false });

          if (logs && logs.length > 0) {
              const toDeleteIds: string[] = [];
              let refundAccumulator = 0;
              
              if (isLastCopy) {
                  // DEEP CLEAN: Trace back continuously
                  for (const log of logs) {
                      const isIn = log.card_in && log.card_in.trim().toLowerCase() === cleanName.toLowerCase();
                      const isOut = log.card_out && log.card_out.trim().toLowerCase() === cleanName.toLowerCase();

                      if (isOut && !isIn) {
                          break; // Stop at previous removal
                      }
                      
                      if (isIn) {
                          toDeleteIds.push(log.id);
                          refundAccumulator += (log.cost || 0);
                      }
                  }
              } else {
                  // SHALLOW CLEAN: Only most recent Add
                   for (const log of logs) {
                      const isIn = log.card_in && log.card_in.trim().toLowerCase() === cleanName.toLowerCase();
                      const isOut = log.card_out && log.card_out.trim().toLowerCase() === cleanName.toLowerCase();
                      
                      if (isIn && !isOut) {
                          toDeleteIds.push(log.id);
                          refundAccumulator += (log.cost || 0);
                          break; 
                      }
                   }
              }

              if (toDeleteIds.length > 0) {
                  await supabase.from('deck_upgrades').delete().in('id', toDeleteIds);
                  budgetDiff = -refundAccumulator;
                  skipInsert = true;
              }
          }
      }

      if (!skipInsert) {
        // 1. Log the upgrade (Normal)
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
        
        if (upgradeError) {
          // Fallback for when the column doesn't exist yet
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
        
        budgetDiff = change.cost || 0;
      }
      
      // 2. Update deck budget if needed
      if (budgetDiff !== 0) {
         await supabase.from('decks').update({ budget_spent: (deck?.budget_spent || 0) + budgetDiff }).eq('id', id);
      }

      // 3. Update current mainboard (deck_cards)
      if (change.card_out) {
        const cleanOut = change.card_out.trim();
        // Use ILIKE for query as well
        const { data: existingRows } = await supabase
          .from('deck_cards')
          .select('id, quantity')
          .eq('deck_id', id)
          .ilike('card_name', cleanOut);

        if (existingRows && existingRows.length > 0) {
          const firstRow = existingRows[0];
          if (firstRow.quantity > 1) {
            const { error: updError } = await supabase
              .from('deck_cards')
              .update({ quantity: firstRow.quantity - 1 })
              .eq('id', firstRow.id);
            if (updError) throw updError;
          } else {
            const { error: delError } = await supabase
              .from('deck_cards')
              .delete()
              .eq('id', firstRow.id);
            if (delError) throw delError;
          }
        }
      }

      if (change.card_in) {
        let cardData = typeof change.card_in === 'object' ? change.card_in : null;
        if (!cardData) {
          const results = await searchCards(change.card_in);
          cardData = results[0];
        }

        if (cardData) {
          const cardName = cardData.card_name || cardData.name;
          const cleanIn = cardName.trim();
          
          // Fetch existing rows
          const { data: existingRows } = await supabase
            .from('deck_cards')
            .select('id, quantity, scryfall_id')
            .eq('deck_id', id)
            .ilike('card_name', cleanIn);

          if (existingRows && existingRows.length > 0) {
            const firstRow = existingRows[0];
            const currentTotalQty = existingRows.reduce((acc, r) => acc + (r.quantity || 1), 0);

            // Calculate new quantity
            let newQty;
            if (change.card_in?.quantity !== undefined && (change.card_in.card_name === cardName || change.card_in.name === cardName)) {
              newQty = change.card_in.quantity;
            } else {
              newQty = currentTotalQty + 1;
            }

            const { error: updError } = await supabase
              .from('deck_cards')
              .update({ 
                quantity: newQty,
                scryfall_id: cardData.scryfall_id || cardData.id || firstRow.scryfall_id,
                image_url: cardData.image_url || cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal,
                back_image_url: cardData.back_image_url || cardData.card_faces?.[1]?.image_uris?.normal || null,
                oracle_text: cardData.oracle_text || cardData.card_faces?.map((f: any) => `${f.name}: ${f.oracle_text}`).join('\n\n') || null,
                set_code: cardData.set,
                set_name: cardData.set_name
              })
              .eq('id', firstRow.id);
            
            if (updError) throw updError;

            // Cleanup duplicates
            if (existingRows.length > 1) {
              const otherIds = existingRows.slice(1).map(r => r.id);
              await supabase.from('deck_cards').delete().in('id', otherIds);
            }
          } else {
             const backImage = cardData.back_image_url || cardData.card_faces?.[1]?.image_uris?.normal || null;
             const combinedOracle = cardData.oracle_text || cardData.card_faces?.map((f: any) => `${f.name}: ${f.oracle_text}`).join('\n\n') || null;

             const { error: insError } = await supabase
               .from('deck_cards')
               .insert({
                 deck_id: id,
                 card_name: cardName,
                 quantity: cardData.quantity || 1,
                 is_commander: cardData.is_commander || false,
                 scryfall_id: cardData.scryfall_id || cardData.id,
                 type_line: cardData.type_line,
                 mana_cost: cardData.mana_cost,
                 image_url: cardData.image_url || cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal,
                 back_image_url: backImage,
                 oracle_text: combinedOracle,
                 set_code: cardData.set,
                 set_name: cardData.set_name
               });
            if (insError) throw insError;
          }
        }
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
    // Silent for better UX
    try {
      const { data: upgrade, error: fetchError } = await supabase
        .from('deck_upgrades')
        .select('*')
        .eq('id', upgradeId)
        .single();
      
      if (fetchError) throw fetchError;

      // 1. Revert Card In (Remove)
      if (upgrade.card_in) {
        const cleanName = upgrade.card_in.trim();
        // Use ILIKE for case-insensitive match
        const { data: existingRows } = await supabase
          .from('deck_cards')
          .select('id, quantity, scryfall_id, card_name')
          .eq('deck_id', id)
          .ilike('card_name', cleanName);

        if (existingRows && existingRows.length > 0) {
          // Try to match specific printing if known, otherwise first available
          let target = upgrade.scryfall_id 
            ? existingRows.find(r => r.scryfall_id === upgrade.scryfall_id) 
            : existingRows[0];
          
          // Fallback if specific printing not found
          if (!target) target = existingRows[0];

          if (target.quantity > 1) {
            await supabase.from('deck_cards').update({ quantity: target.quantity - 1 }).eq('id', target.id);
          } else {
            await supabase.from('deck_cards').delete().eq('id', target.id);
          }
        } else {
           // Debug: Log if not found
           console.warn(`Card to revert not found in deck: ${cleanName}`);
        }
      }

      // 2. Revert Card Out (Add back)
      if (upgrade.card_out) {
        const cleanNameOut = upgrade.card_out.trim();
        const { data: existingRows } = await supabase
          .from('deck_cards')
          .select('id, quantity')
          .eq('deck_id', id)
          .ilike('card_name', cleanNameOut);

        if (existingRows && existingRows.length > 0) {
          const firstRow = existingRows[0];
          await supabase.from('deck_cards').update({ quantity: firstRow.quantity + 1 }).eq('id', firstRow.id);
        } else {
          // Use scryfall_id if available (not standard in current schema for card_out but good practice)
          // Otherwise search
          const results = await searchCards(cleanNameOut);
          const cardData = results[0];
          if (cardData) {
            await supabase.from('deck_cards').insert({
              deck_id: id,
              card_name: cardData.name,
              quantity: 1,
              scryfall_id: cardData.id,
              type_line: cardData.type_line,
              mana_cost: cardData.mana_cost,
              image_url: cardData.image_uris?.normal || cardData.card_faces?.[0]?.image_uris?.normal,
              back_image_url: cardData.card_faces?.[1]?.image_uris?.normal || null,
              oracle_text: cardData.oracle_text || cardData.card_faces?.map((f: any) => `${f.name}: ${f.oracle_text}`).join('\n\n') || null,
              set_code: cardData.set,
              set_name: cardData.set_name,
              collector_number: cardData.collector_number
            });
          }
        }
      }

      // 3. Revert Budget
      if (upgrade.cost && upgrade.cost !== 0) {
        await supabase.from('decks').update({ budget_spent: (deck?.budget_spent || 0) - upgrade.cost }).eq('id', id);
      }

      // 4. Delete the upgrade log entry
      await supabase.from('deck_upgrades').delete().eq('id', upgradeId);

      await fetchData(5, true);
    } catch (err: any) {
      setMessageDialog({ title: 'Error al deshacer', message: `No se pudo deshacer la mejora: ${err.message}`, isError: true });
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

      // NEW: If scryfall_id changed (version change), update the actual deck card
      // This ensures the visual editor matches the version selected in the log
      if (updates.scryfall_id && current.card_in) {
         // Fetch details for the new version (we need images, set name, etc.)
         // We can't rely just on the ID, we need the metadata for deck_cards
         const res = await fetch(`https://api.scryfall.com/cards/${updates.scryfall_id}`);
         if (res.ok) {
            const newCardData = await res.json();
            
            // Allow multiple matches update logic
            // We update ALL instances of this card name to the new version
            // This assumes consistency across the deck
            await supabase.from('deck_cards')
              .update({
                  scryfall_id: newCardData.id,
                  image_url: newCardData.image_uris?.normal || newCardData.card_faces?.[0]?.image_uris?.normal,
                  back_image_url: newCardData.card_faces?.[1]?.image_uris?.normal || null,
                  set_code: newCardData.set,
                  set_name: newCardData.set_name,
                  collector_number: newCardData.collector_number
              })
              .eq('deck_id', id)
              .eq('card_name', current.card_in);
         }
      }

      // 3. Update deck budget if cost changed
      if (updates.cost !== undefined && updates.cost !== current.cost) {
        const diff = updates.cost - current.cost;
        const { error: budgetError } = await supabase
          .from('decks')
          .update({ budget_spent: (deck?.budget_spent || 0) + diff })
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
      
      // Also refetch cards to update the visualizer images immediately
      const { data: cardsData } = await supabase.from('deck_cards').select('*').eq('deck_id', id);
      if (cardsData) setDeckCards(cardsData);

    } catch (err: any) {
      setMessageDialog({ title: 'Error al actualizar', message: `No se pudo actualizar la mejora: ${err.message}`, isError: true });
    }
  };

  const handleUpdateImage = async (imageUrl: string) => {
    const { error } = await supabase
      .from('decks')
      .update({ image_url: imageUrl })
      .eq('id', id);
    
    if (error) setMessageDialog({ title: 'Error', message: `No se pudo actualizar la imagen: ${error.message}`, isError: true });
    else {
      setDeck({ ...deck, image_url: imageUrl } as Deck);
      setShowPicker(false);
    }
  };

  const handleUpdatePreconUrl = async () => {
    const { error } = await supabase
      .from('decks')
      .update({ precon_url: tempPreconUrl })
      .eq('id', id);
    
    if (error) setMessageDialog({ title: 'Error', message: `No se pudo actualizar el nombre: ${error.message}`, isError: true });
    else {
      setDeck({ ...deck, precon_url: tempPreconUrl } as Deck);
      setEditingPrecon(false);
    }
  };

  const handleSyncCards = async () => {
    if (!deck || (!deck.moxfield_id && !deck.archidekt_id)) {
      setMessageDialog({ title: 'Sincronización no disponible', message: 'No se puede sincronizar un mazo manual. Solo los mazos importados desde Moxfield o Archidekt pueden sincronizarse.', isError: false });
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
      
      setMessageDialog({ title: '¡Éxito!', message: 'Mazo sincronizado correctamente con la plataforma externa.', isError: false });
    } catch (err: any) {
      setMessageDialog({ title: 'Error al sincronizar', message: `No se pudo sincronizar el mazo: ${err.message}`, isError: true });
    } finally {
      setLoading(false);
    }
  };

  const exportToText = () => {
    const list = deckCards.map(c => `${c.quantity} ${c.card_name}`).join('\n');
    navigator.clipboard.writeText(list);
    setMessageDialog({ title: '¡Exportado!', message: 'Mazo exportado al portapapeles correctamente.', isError: false });
  };

  const copyToClipboard = () => {
    const list = upgrades.map(u => `1 ${u.card_in}`).join('\n');
    navigator.clipboard.writeText(list);
    setMessageDialog({ title: '¡Copiado!', message: 'Lista de mejoras copiada al portapapeles.', isError: false });
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

  // 2. Calculate coordinated budget info
  const budgetInfo = React.useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    // Sum all registered costs
    // We use the LOGGED cost (u.cost) as the source of truth for the budget.
    // Trending prices are for information only, not for the official budget cap.
    const totalSpent = upgrades.reduce((sum, u) => {
      // FIX: If the card is from the original precon, it should ALWAYS be 0 cost.
      const isPrecon = u.card_in && preconCardNames.has(u.card_in.toLowerCase());
      if (isPrecon) return sum; // Cost is 0

      return sum + (u.cost || 0);
    }, 0);

    return calculateDeckBudget(deck?.created_at || new Date(), deck?.budget_spent || 0, totalSpent);
  }, [deck, upgrades, preconCardNames]);

  // 3. Sync budget_spent to database IF there is a discrepancy (e.g. initial calculation error or manual edit)
  React.useEffect(() => {
    const syncBudgetSpent = async () => {
      if (!deck || !budgetInfo) return;
      
      const currentStored = deck.budget_spent || 0;
      const newValue = budgetInfo.totalSpent;
      
      // We sync if the difference is significant, to ensure the listing page shows the correct value.
      if (Math.abs(currentStored - newValue) > 0.01) { 
        await supabase
          .from('decks')
          .update({ budget_spent: newValue })
          .eq('id', id);
        
        // Also update local state to avoid infinite loop (though dependecy array protects us mostly)
        // Actually, we don't update local 'deck' state here to avoid re-renders, assuming the DB update is enough.
        // But to be safe against the loop, we check the difference.
      }
    };

    syncBudgetSpent();
  }, [budgetInfo?.totalSpent, deck?.budget_spent, deck?.id, id, supabase]);

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
                const { dynamicLimit, totalSpent } = budgetInfo;
                const currentMonth = new Date().toISOString().slice(0, 7);
                const currentMonthSpent = upgrades.reduce((sum, u) => {
                     if (u.month !== currentMonth) return sum;
                     if (u.card_in && preconCardNames.has(u.card_in.toLowerCase())) return sum;
                     return sum + (u.cost || 0);
                }, 0);
                
                // Calculate Available Budget for this month (Accumulated + 10€)
                // Effective Limit = Total Cumulative Limit - (Spent in Previous Months)
                // Spent Previous = Total Spent - Current Month Spent
                const spentPrevious = totalSpent - currentMonthSpent;
                const effectiveMonthlyLimit = Math.max(0, dynamicLimit - spentPrevious);
                
                const remaining = effectiveMonthlyLimit - currentMonthSpent;
                
                let statusColor = 'var(--color-green)';
                if (currentMonthSpent > effectiveMonthlyLimit + 1) statusColor = 'var(--color-red)';
                else if (currentMonthSpent > effectiveMonthlyLimit) statusColor = '#ff9800';

                return (
                 <div style={{ padding: '1rem', background: '#111', borderRadius: '8px', marginBottom: 'auto' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        <span>Presupuesto Mensual (+Acumulado):</span>
                         <span style={{ color: statusColor }}>
                            {currentMonthSpent.toFixed(2)}€ / {effectiveMonthlyLimit.toFixed(2)}€
                        </span>
                    </div>
                    <div style={{ background: '#222', height: '10px', borderRadius: '5px', overflow: 'hidden' }}>
                        <div style={{ 
                            width: `${effectiveMonthlyLimit > 0 ? Math.min((currentMonthSpent / effectiveMonthlyLimit) * 100, 100) : 100}%`, 
                            height: '100%', 
                            background: statusColor
                        }} />
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.5rem', textAlign: 'right' }}>
                        {currentMonthSpent > effectiveMonthlyLimit 
                            ? `Te has pasado ${ Math.abs(remaining).toFixed(2) }€.` 
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
            preconCardNames={preconCardNames}
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
            {/* Budget Stats - Now independent columns */}
            <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)' }}>Evolución del Presupuesto</h3>
              <div style={{ flex: 1, position: 'relative' }}>
                 <BudgetChart upgrades={upgrades} creationDate={deck.created_at} />
              </div>
            </div>
            
            <div style={{ height: '100%', minHeight: '400px' }}>
               <MonthlyBreakdown upgrades={upgrades} trendingPrices={trendingPrices} preconCardNames={preconCardNames} />
            </div>
         <div style={{ gridColumn: '1 / -1' }}>
            <Wishlist 
              deckId={id as string} 
              isOwner={isOwner} 
              onUpdateDeck={handleUpdateDeck}
              trendingPrices={trendingPrices}
            />
         </div>
      </div>


      {showPicker && (
        <CommanderPicker 
          commanderName={deck.commander} 
          onSelect={handleUpdateImage} 
          onClose={() => setShowPicker(false)} 
        />
      )}

      {/* Message Dialog */}
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
