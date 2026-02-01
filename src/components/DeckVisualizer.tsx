'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { searchCards, getAveragePrice, getCardPrints } from '@/lib/scryfall';
import { ScryfallCard, DeckCard } from '@/types';
import ConfirmationDialog from './ConfirmationDialog';
import TagEditor from '@/components/TagEditor';
import DeckStats from '@/components/deck/DeckStats';
import { DeckFilters, GroupBy, SortBy, ViewMode } from '@/components/deck/DeckFilters';
import CardSearch from '@/components/deck/CardSearch';
import PlaytestModal from '@/components/deck/PlaytestModal';
import CardDetailsModal from '@/components/deck/CardDetailsModal';
import VersionPickerModal from '@/components/deck/VersionPickerModal';
import PreviewCardOverlay from '@/components/deck/PreviewCardOverlay';
import { renderSymbols } from '@/components/ManaSymbols';
import DeckFilterPanel, { AdvancedFilters } from '@/components/deck/DeckFilterPanel';
import SyncCompleteModal from '@/components/deck/SyncCompleteModal';
import { getCollection } from '@/lib/scryfall';
import { createClient } from '@/lib/supabaseClient';

interface DeckVisualizerProps {
  cards: DeckCard[];
  isOwner?: boolean;
  onUpdateDeck?: (change: { card_in?: any, card_out?: string, cost?: number, description?: string }) => Promise<void> | void;
  preconCardNames?: Set<string>;
  deckId?: string;
  cardTags?: Record<string, string[]>;
  onTagsUpdate?: () => void;
  userCollection?: Set<string>;
}



import BRACKETS_DATA from '@/data/brackets.json';
const BRACKETS = BRACKETS_DATA as { name: string, bracket: number, reason: string }[];


export default function DeckVisualizer({ 
  cards, 
  isOwner = false, 
  onUpdateDeck, 
  preconCardNames = new Set(), 
  deckId, 
  cardTags = {}, 
  onTagsUpdate,
  userCollection = new Set() 
}: DeckVisualizerProps) {
  const [filter, setFilter] = useState('');
  const [groupBy, setGroupBy] = useState<GroupBy>('type');
  const [sortBy, setSortBy] = useState<SortBy>('cmc');
  const [viewMode, setViewMode] = useState<ViewMode>('stack');

  // Persist View Mode
  useEffect(() => {
    const saved = localStorage.getItem('deck_builder_view_mode') as ViewMode;
    if (saved && ['stack', 'grid', 'text', 'list'].includes(saved)) {
      setViewMode(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('deck_builder_view_mode', viewMode);
  }, [viewMode]);
  
  const [hoveredCard, setHoveredCard] = useState<DeckCard | null>(null);

  // Add Card State
  const [showAdd, setShowAdd] = useState(false);
  const [addQuery, setAddQuery] = useState('');
  const [activeInfoCard, setActiveInfoCard] = useState<DeckCard | null>(null);
  const [modalFace, setModalFace] = useState(0);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [fullCardData, setFullCardData] = useState<any>(null);

  // Version Selection State
  const [editingVersion, setEditingVersion] = useState<DeckCard | null>(null);
  const [prints, setPrints] = useState<ScryfallCard[]>([]);
  const [loadingPrints, setLoadingPrints] = useState(false);
  const [versionFilter, setVersionFilter] = useState('');
  const [showPlaytest, setShowPlaytest] = useState(false);

  const [isSearchingPrice, setIsSearchingPrice] = useState(false);

  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [editingTags, setEditingTags] = useState<{ cardName: string, tags: string[] } | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setShareStatus('copied');
    setTimeout(() => setShareStatus('idle'), 2000);
  };
  const [tagFilter, setTagFilter] = useState<string | null>(null);


  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    type: '',
    text: '',
    edition: '',
    colors: [],
    cmc: [0, 20]
  });

  const [syncCount, setSyncCount] = useState<number | null>(null); // For success modal

  const [cardToRemove, setCardToRemove] = useState<DeckCard | null>(null);

  // Card Preview State
  const [previewCard, setPreviewCard] = useState<{ name: string, image: string, x: number, y: number } | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout|null>(null);

  useEffect(() => {
    if (activeInfoCard) {
      document.body.style.overflow = 'hidden';
      fetchCardInfo(activeInfoCard.card_name);
    } else {
      document.body.style.overflow = 'unset';
      setFullCardData(null);
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeInfoCard]);

  const fetchCardInfo = async (cardName: string) => {
    setIsLoadingInfo(true);
    try {
        const results = await searchCards(cardName);
        if (results && results.length > 0) {
            const exact = results.find(r => r.name.toLowerCase() === cardName.toLowerCase());
            setFullCardData(exact || results[0]);
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoadingInfo(false);
    }
  };

  const handleRemoveCard = (card: DeckCard) => {
    if (onUpdateDeck) {
      onUpdateDeck({ 
        card_out: card.card_name,
        description: 'Quitado desde editor visual'
      });
    }
  };

  const toggleFlip = (cardName: string) => {
    setFlippedCards(prev => {
      const next = new Set(prev);
      if (next.has(cardName)) next.delete(cardName);
      else next.add(cardName);
      return next;
    });
  };

  const handleOpenVersionPicker = async () => {
    if (!isOwner || !activeInfoCard) return;
    setEditingVersion(activeInfoCard);
    setVersionFilter('');
    setLoadingPrints(true);
    const results = await getCardPrints(activeInfoCard.card_name);
    setPrints(results);
    setLoadingPrints(false);
  };

  const handleSelectVersion = async (card: ScryfallCard) => {
    if (!activeInfoCard) return;
    const newImageUrl = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '';
    const newBackUrl = card.card_faces?.[1]?.image_uris?.normal || null;
    const combinedOracle = card.oracle_text || card.card_faces?.map((f: any) => `${f.name}: ${f.oracle_text}`).join('\n\n') || null;

    const updatedCard: DeckCard = { 
      ...activeInfoCard, 
      scryfall_id: card.id,
      image_url: newImageUrl,
      back_image_url: newBackUrl,
      oracle_text: combinedOracle,
      set_code: card.set,
      set_name: card.set_name,
      type_line: card.type_line || '',
      mana_cost: card.mana_cost || null,
      collector_number: card.collector_number
    };

    setActiveInfoCard(updatedCard);
    
    // Calculate new price
    const newPrice = parseFloat(card.prices?.eur || '0');
    
    // Notify parent to update the DB entry
    onUpdateDeck?.({ 
      card_in: updatedCard, 
      card_out: activeInfoCard.card_name, // This triggers a "swap" in log
      cost: newPrice,
      description: `Cambio de edición: ${card.set_name} (${card.set.toUpperCase()})`
    });

    setEditingVersion(null);
  };






  const filteredCards = cards.filter(card => {
    // 1. Basic Text Filter
    const matchesSearch = card.card_name.toLowerCase().includes(filter.toLowerCase());
    const matchesTag = !tagFilter || (cardTags[card.card_name] && cardTags[card.card_name].includes(tagFilter));

    if (!matchesSearch || !matchesTag) return false;

    // 2. Advanced Filters
    // Type
    if (advancedFilters.type && !((card.type_line || '').toLowerCase().includes(advancedFilters.type.toLowerCase()))) {
      return false;
    }
    // Text
    if (advancedFilters.text && !((card.oracle_text || '').toLowerCase().includes(advancedFilters.text.toLowerCase()))) {
      return false;
    }
    // Edition
    if (advancedFilters.edition && card.set_code !== advancedFilters.edition) {
      return false;
    }
    // CMC (Min check mainly, strict range if UI implemented)
    // For now we assume default [0, 20] means "all"
    
    // Color
    if (advancedFilters.colors.length > 0) {
       const mc = card.mana_cost || '';
       const cardColors: string[] = [];
       if (mc.includes('W')) cardColors.push('W');
       if (mc.includes('U')) cardColors.push('U');
       if (mc.includes('B')) cardColors.push('B');
       if (mc.includes('R')) cardColors.push('R');
       if (mc.includes('G')) cardColors.push('G');
       if (cardColors.length === 0) cardColors.push('C');
       
       // Intersection: Does card have ANY of the selected colors?
       // Let's go with: Card must contain at least one of the selected colors.
       // Special case: Colorless ('C') selected -> Card must be colorless.
       
       if (advancedFilters.colors.includes('C')) {
          if (cardColors.includes('C')) return true; // Keep it
       }

       const hasMatch = advancedFilters.colors.some(c => cardColors.includes(c));
       if (!hasMatch) return false;
    }

    return true;
  });



  const startHoverTimer = (cardName: string, imageUrl: string, e: React.MouseEvent, isAddSearch = false) => {
    if (!isAddSearch) return;
    if (!imageUrl) return;
    
    // Clear any existing timer
    if (hoverTimer) clearTimeout(hoverTimer);
    
    const x = e.clientX;
    const y = e.clientY;

    const timer = setTimeout(() => {
      setPreviewCard({ name: cardName, image: imageUrl, x, y });
    }, 1000); // 1 second delay
    
    setHoverTimer(timer);
  };

  const stopHoverTimer = () => {
    if (hoverTimer) clearTimeout(hoverTimer);
    setHoverTimer(null);
    setPreviewCard(null);
  };

  // Helper to parse CMC
  const getCMC = (mana_cost: string | null) => {
    if (!mana_cost) return 0;
    const matches = mana_cost.match(/\{(\d+|X|W|U|B|R|G|C|S|P)\}/g);
    if (!matches) return 0;
    let cmc = 0;
    matches.forEach(m => {
      const val = m.replace(/\{|\}/g, '');
      if (!isNaN(parseInt(val))) cmc += parseInt(val);
      else if (['W', 'U', 'B', 'R', 'G', 'C', 'S', 'P'].includes(val)) cmc += 1;
    });
    return cmc;
  };

  // Helper to detect Function
  const getFunction = (card: DeckCard) => {
    const text = (card.oracle_text || '').toLowerCase();
    const type = (card.type_line || '').toLowerCase();

    if (text.includes('search your library for a land') || text.includes('add {') || text.includes('put a land card from your hand onto the battlefield')) {
      if (!type.includes('land')) return 'Ramp';
    }
    if (text.includes('draw a card') || text.includes('draw two cards') || text.includes('draw three cards') || text.includes('reveal the top') && text.includes('put it into your hand')) {
      return 'Draw';
    }
    if (text.includes('destroy target') || text.includes('exile target') || text.includes('deals damage to target creature') || text.includes('-1/-1 until end of turn')) {
      return 'Removal';
    }
    if (text.includes('destroy all') || text.includes('exile all') || text.includes('each player sacrifices') || text.includes('each creature')) {
       return 'Board Wipe';
    }
    return 'Other';
  };

  const categories: { [key in GroupBy]: string[] } = {
    type: ['Commander', 'Creature', 'Planeswalker', 'Sorcery', 'Instant', 'Artifact', 'Enchantment', 'Battle', 'Land', 'Other'],
    cmc: ['0', '1', '2', '3', '4', '5', '6+'],
    color: ['White', 'Blue', 'Black', 'Red', 'Green', 'Multicolor', 'Colorless'],
    function: ['Commander', 'Ramp', 'Draw', 'Removal', 'Board Wipe', 'Other']
  };

  const grouped: { [key: string]: DeckCard[] } = {};

  filteredCards.forEach(card => {
    let key = 'Other';
    
    if (groupBy === 'type') {
      const typeLine = (card.type_line || '').toLowerCase();
      if (card.is_commander) key = 'Commander';
      else if (typeLine.includes('creature')) key = 'Creature';
      else if (typeLine.includes('planeswalker')) key = 'Planeswalker';
      else if (typeLine.includes('sorcery')) key = 'Sorcery';
      else if (typeLine.includes('instant')) key = 'Instant';
      else if (typeLine.includes('artifact')) key = 'Artifact';
      else if (typeLine.includes('enchantment')) key = 'Enchantment';
      else if (typeLine.includes('battle')) key = 'Battle';
      else if (typeLine.includes('land')) key = 'Land';
      else key = 'Other';
    } else if (groupBy === 'cmc') {
      const cmc = getCMC(card.mana_cost);
      key = cmc >= 6 ? '6+' : cmc.toString();
    } else if (groupBy === 'color') {
      const mc = card.mana_cost || '';
      const colors = [];
      if (mc.includes('W')) colors.push('White');
      if (mc.includes('U')) colors.push('Blue');
      if (mc.includes('B')) colors.push('Black');
      if (mc.includes('R')) colors.push('Red');
      if (mc.includes('G')) colors.push('Green');
      
      if (colors.length > 1) key = 'Multicolor';
      else if (colors.length === 1) key = colors[0];
      else key = 'Colorless';
    } else if (groupBy === 'function') {
      if (card.is_commander) key = 'Commander';
      else key = getFunction(card);
    }

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(card);
  });

  const isGameChangerValue = (cardName: string) => {
    return BRACKETS.some(b => b.name === cardName && b.reason === 'Game Changer');
  };

  const sortCards = (list: DeckCard[]) => {
    return [...list].sort((a, b) => {
      if (sortBy === 'cmc') {
         const costA = getCMC(a.mana_cost);
         const costB = getCMC(b.mana_cost);
         if (costA !== costB) return costA - costB;
      }
      return a.card_name.localeCompare(b.card_name);
    });
  };



  const handleAddCard = async (scryfallCard: ScryfallCard) => {
    setIsSearchingPrice(true);
    try {
      let finalPrice = 0;
      let priceDescription = 'Añadida desde editor visual';

      const scryName = scryfallCard.name.toLowerCase();
      const isPrecon = preconCardNames.has(scryName);
      const isOwned = userCollection.has(scryName);
      
      const isBasic = scryfallCard.type_line?.includes('Basic Land');

      if (isPrecon) {
        finalPrice = 0;
        priceDescription = 'Añadida desde base original (0€)';
      } else if (isOwned) {
        finalPrice = 0;
        priceDescription = 'Carta de tu colección personal (0€)';
      } else if (isBasic) {
        finalPrice = 0;
        priceDescription = 'Tierra básica (0€)';
      } else if (scryfallCard.prices?.eur) {
        finalPrice = parseFloat(scryfallCard.prices.eur) || 0;
        priceDescription = `Precio Cardmarket (${scryfallCard.set_name || scryfallCard.set.toUpperCase()})`;
      } else {
        const avgData = await getAveragePrice(scryfallCard.name);
        finalPrice = avgData?.price || 0;
        if (avgData) {
          priceDescription = `Precio Estimado (Media versiones baratas: ${avgData.sets.join(', ')})`;
        }
      }

      if (onUpdateDeck) {
        await onUpdateDeck({ 
          card_in: scryfallCard,
          cost: finalPrice,
          description: priceDescription
        });
      }
    } catch (e) {
      console.error("Error adding card:", e);
    } finally {
      setIsSearchingPrice(false);
    }
  };


  const handleFlip = async (card: DeckCard) => {
    // If we're flipping TO the back and don't have the image yet, fetch it
    if (!flippedCards.has(card.card_name) && !card.back_image_url) {
      try {
        const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.card_name)}&lang=en`);
        if (res.ok) {
          const data = await res.json();
          if (data.card_faces && data.card_faces.length > 1) {
            const backUrl = data.card_faces[1].image_uris?.normal;
            if (backUrl) card.back_image_url = backUrl;
          }
        }
      } catch (e) {
        console.error("Error fetching back image:", e);
      }
    }
    toggleFlip(card.card_name);
  };





  // --- FIXED COLUMN MASONRY LOGIC ---
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getColumnCount = (width: number) => {
    if (width < 700) return 1;
    if (width < 1000) return 2;
    if (width < 1300) return 3;
    if (width < 1600) return 4;
    if (width < 1900) return 5;
    return 6;
  };



  const columnCount = getColumnCount(windowWidth);

  // Distribute categories into fixed columns (Greedy Algorithm)
  const distributeStacks = () => {
    // 1. Identify "Commander" items and remove them from general pool
    const allCats = [...categories[groupBy]].filter(catName => (grouped[catName] || []).length > 0);
    
    // Normalize checking for "Commander" or "Comandante"
    const cmdIndex = allCats.findIndex(c => c.toLowerCase() === 'commander' || c.toLowerCase() === 'comandante');
    let cmdCategory = null;

    if (cmdIndex !== -1) {
       cmdCategory = allCats[cmdIndex];
       allCats.splice(cmdIndex, 1);
    }

    // 2. Sort remaining by size (descending)
    const activeCategories = allCats.sort((a, b) => { 
         const countA = (grouped[a] || []).reduce((acc, c) => acc + c.quantity, 0);
         const countB = (grouped[b] || []).reduce((acc, c) => acc + c.quantity, 0);
         return countB - countA;
      });

    const columns: string[][] = Array.from({ length: columnCount }, () => []);
    const columnWeights = new Array(columnCount).fill(0);

    // 3. Force Commander to Column 0 (Top Left)
    if (cmdCategory) {
        columns[0].push(cmdCategory);
        const count = grouped[cmdCategory].reduce((acc, c) => acc + c.quantity, 0);
        columnWeights[0] += (count + 5); 
    }

    // 4. Distribute the rest greedily
    activeCategories.forEach((catName) => {
        // Find lightest column
        let minWeight = columnWeights[0];
        let minIdx = 0;
        for (let i = 1; i < columnCount; i++) {
            if (columnWeights[i] < minWeight) {
                minWeight = columnWeights[i];
                minIdx = i;
            }
        }
        // Add cat to this column
        columns[minIdx].push(catName);
        const count = grouped[catName].reduce((acc, c) => acc + c.quantity, 0);
        columnWeights[minIdx] += (count + 5);
    });
    
    return columns;
  };

  const distributedColumns = distributeStacks();

  return (
    <div className="card deck-builder-container" style={{ 
      background: '#222', 
      border: '1px solid #333', 
      minHeight: '600px', 
      position: 'relative',
      padding: '1.5rem',
      overflow: 'visible' // Allow tooltips to overflow
    }}>
      
      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid #222' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <h2 style={{ color: 'var(--color-gold)', margin: 0, fontSize: '1.4rem' }}>Editor Visual</h2>
            
            {/* 1 & 2. Stats and Validator */}
            <DeckStats cards={cards} />

          </div>
          
          <DeckFilters 
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
        </div>
            <button 
              onClick={() => setShowPlaytest(true)}
              className="btn" 
              style={{ background: '#333', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              🚀 Playtest
            </button>
            <button 
              onClick={handleShare}
              className="btn" 
              style={{ 
                background: shareStatus === 'copied' ? 'var(--color-success, #4caf50)' : '#333', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.5rem',
                transition: 'all 0.3s ease'
              }}
            >
              {shareStatus === 'copied' ? '✅ Copiado' : '🔗 Compartir'}
            </button>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <input 
            type="text" 
            placeholder="Filtrar..." 
            value={filter}

            onChange={e => setFilter(e.target.value)}
            style={{ 
                padding: '0.6rem 1.2rem', 
                borderRadius: '30px 0 0 30px', 
                border: '1px solid #333', 
                background: '#151515', 
                color: 'white',
                fontSize: '0.9rem',
                width: '150px'
            }}
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              style={{
                padding: '0.6rem 1rem',
                borderRadius: '0 30px 30px 0',
                border: '1px solid #333',
                borderLeft: 'none',
                background: showFilters ? 'var(--color-gold)' : '#222',
                color: showFilters ? '#000' : '#fff',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title="Filtros Avanzados"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
            </button>
            {showFilters && (
              <DeckFilterPanel 
                cards={cards} // Pass all cards to calculate available sets
                filters={advancedFilters}
                onChange={setAdvancedFilters}
                onClose={() => setShowFilters(false)}
                onSyncMetadata={async () => {
                   const missingSet = cards.filter(c => !c.set_code);
                   if (missingSet.length === 0) {
                     alert("Todas las cartas tienen metadatos de set.");
                     return;
                   }
                   if (!confirm(`Se van a actualizar ${missingSet.length} cartas. Esto puede tardar unos segundos. ¿Continuar?`)) return;

                   // Unique identifiers
                   // We prefer ID if present, else Name
                   const identifiers = missingSet.map(c => c.scryfall_id ? { id: c.scryfall_id } : { name: c.card_name });
                   
                   // Chunk
                   const chunks = [];
                   for (let i = 0; i < identifiers.length; i += 75) {
                     chunks.push(identifiers.slice(i, i + 75));
                   }

                   let updatedCount = 0;
                   const supabase = createClient();

                   for (const chunk of chunks) {
                      const results = await getCollection(chunk);
                      for (const scryCard of results) {
                         const setCode = scryCard.set;
                         const setName = scryCard.set_name;
                         
                         // Update in DB
                         // Matches by scryfall_id OR name
                         // Since our DB stores unique ID per row, but we don't have row ID easily matched here without iterating DeckCards...
                         // Actually 'cards' are DeckCard objects, so they have 'id' (DB ID) presumably.
                         
                         const matchInDeck = missingSet.find(c => (c.scryfall_id === scryCard.id) || (c.card_name.toLowerCase() === scryCard.name.toLowerCase()));
                         if (matchInDeck && matchInDeck.id) {
                            await supabase
                              .from('deck_cards')
                              .update({ set_code: setCode, set_name: setName })
                              .eq('id', matchInDeck.id);
                            updatedCount++;
                         }
                      }
                   }
                   
                   // Complete
                   setShowFilters(false);
                   setSyncCount(updatedCount);
                   
                   // Reload data in background or just wait for user to close modal to reload?
                   // The modal will trigger reload on close.
                }}
                onFixMetadata={async () => {
                   // Fix Logic: Extract ID from Image URL if scryfall_id is missing
                   // This recovers the specific printing if the user had an image set but no metadata.
                   const candidates = cards.filter(c => !c.scryfall_id && c.image_url && c.image_url.includes('scryfall.io'));
                   if (candidates.length === 0) {
                     alert("No se encontraron cartas recuperables (sin ID pero con imagen Scryfall).");
                     return;
                   }

                   if (!confirm(`Se intentarán recuperar las ediciones correctas de ${candidates.length} cartas basándose en su imagen (útil para tierras básicas). ¿Continuar?`)) return;

                   const identifiers: { id: string }[] = [];
                   const cardMap = new Map<string, DeckCard>();

                   candidates.forEach(c => {
                      // Regex to find UUID in URL: .../front/x/y/UUID.jpg
                      // or .../back/x/y/UUID.jpg
                      const match = c.image_url?.match(/\/(?:front|back)\/.\/.\/([a-z0-9-]+)\.jpg/);
                      if (match && match[1]) {
                          identifiers.push({ id: match[1] });
                          cardMap.set(match[1], c);
                      }
                   });

                   if (identifiers.length === 0) {
                       alert("No se pudieron extraer IDs válidos de las imágenes.");
                       return;
                   }

                   // Chunk requests
                   const chunks = [];
                   for (let i = 0; i < identifiers.length; i += 75) {
                      chunks.push(identifiers.slice(i, i + 75));
                   }

                   let updatedCount = 0;
                   const supabase = createClient();

                   for (const chunk of chunks) {
                       const results = await getCollection(chunk);
                       for (const scryCard of results) {
                           // Find the card in our deck that matches this ID (via the map)
                           const deckCard = cardMap.get(scryCard.id);
                           if (deckCard && deckCard.id) {
                               await supabase
                                  .from('deck_cards')
                                  .update({ 
                                      scryfall_id: scryCard.id,
                                      set_code: scryCard.set, 
                                      set_name: scryCard.set_name 
                                  })
                                  .eq('id', deckCard.id);
                               updatedCount++;
                           }
                       }
                   }

                   setShowFilters(false);
                   setSyncCount(updatedCount);
                }}
              />
            )}
        </div>
      </div>

      {syncCount !== null && (
          <SyncCompleteModal 
            count={syncCount} 
            onClose={() => {
                setSyncCount(null);
                window.location.reload();
            }} 
          />
      )}

      {/* Add Card Interface (Always Visible for Owner) */}
      {isOwner && (
          <CardSearch 
            onAddCard={handleAddCard}
            isSearchingPrice={isSearchingPrice}
            onPreview={(name, img, e) => startHoverTimer(name, img, e, true)}
            onStopPreview={stopHoverTimer}
          />

       )}

      {/* Content Area */}
      {viewMode === 'stack' ? (
          <div style={{ display: 'flex', gap: '0.5rem', width: '100%', alignItems: 'flex-start' }}>
            {distributedColumns.map((colInclusions, colIdx) => (
               <div key={`col-${colIdx}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2.5rem', minWidth: 0, alignItems: 'center' }}>
                 {colInclusions.map(catName => {
                    const list = grouped[catName] || [];
                    const sortedList = sortCards(list);
                    const totalInCat = list.reduce((acc, c) => acc + c.quantity, 0);

                    return (
                        <div key={catName} className="stack-column" style={{ breakInside: 'auto', marginBottom: 0, width: '100%', maxWidth: '260px' }}>
                          <h4 style={{ 
                            color: '#aaa', 
                            fontSize: '0.75rem', 
                            textTransform: 'uppercase', 
                            letterSpacing: '1px',
                            marginBottom: '0.8rem',
                            display: 'flex',
                            justifyContent: 'space-between',
                            padding: '0 0.5rem',
                            borderLeft: '2px solid var(--color-gold)'
                          }}>
                            <span>{catName}</span>
                            <span style={{ color: '#444' }}>{totalInCat}</span>
                          </h4>

                          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', paddingBottom: '1rem' }}>
                            {sortedList.map((card, idx) => {
                                      const isLast = idx === sortedList.length - 1;
                                      const isGC = BRACKETS.some(b => b.name === card.card_name && b.reason === 'Game Changer');
                                      const isHovered = hoveredCard === card;
                                      
                                      return (
                                        <div 
                                          key={`${card.card_name}-${idx}`}
                                          onClick={() => setActiveInfoCard(card)}
                                          onMouseEnter={(e) => {
                                            setHoveredCard(card);
                                            startHoverTimer(card.card_name, card.image_url || '', e);
                                          }}
                                          onMouseLeave={() => {
                                            setHoveredCard(null);
                                            stopHoverTimer();
                                          }}
                                          style={{ 
                                            width: '100%',
                                            maxWidth: '260px', 
                                            margin: '0 auto', 
                                            aspectRatio: '63 / 88',
                                            marginBottom: isLast 
                                              ? '0' 
                                              : isHovered 
                                                ? '0px'
                                                : 'calc(-88 / 63 * 100% + 40px)', 
                                            background: 'transparent',
                                            borderRadius: '12px',
                                            position: 'relative',
                                            zIndex: idx, 
                                            cursor: 'pointer',
                                            transition: 'margin-bottom 0.8s cubic-bezier(0.2, 0.8, 0.2, 1)',
                                            transitionDelay: isHovered ? '0.1s' : '0s',
                                            overflow: 'visible',
                                            transform: 'none', 
                                            boxShadow: isHovered ? '0 10px 30px rgba(0,0,0,0.5)' : 'none'
                                          }}
                                          className="card-slice"
                                        >
                                         {/* Game Changer Badge */}
                                        {isGC && (
                                          <div className="game-changer-badge" title="Game Changer">
                                            <span>⚡</span>
                                          </div>
                                        )}

                                        {/* 3D Flip Card Container */}
                                        <div className="card-3d-container">
                                          <div className={`card-3d-inner ${flippedCards.has(card.card_name) ? 'is-flipped' : ''}`}>
                                            {/* Front Face */}
                                            <div className="card-3d-front">
                                              {card.image_url ? (
                                                <img 
                                                  src={card.image_url} 
                                                  alt={card.card_name}
                                                  style={{ width: '100%', height: '100%', objectFit: 'fill' }}
                                                />
                                              ) : (
                                                <div style={{ width: '100%', height: '100%', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontWeight: 'bold' }}>
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ color: isGC ? 'var(--color-gold)' : 'white' }}>{card.card_name}</span>
                                                    {userCollection.has(card.card_name.toLowerCase()) && (
                                                      <span title="En tu colección personal" style={{ fontSize: '0.8rem' }}>📦</span>
                                                    )}
                                                  </div>
                                                </div>
                                              )}
                                            </div>

                                            {/* Back Face */}
                                            <div className="card-3d-back">
                                              {card.back_image_url ? (
                                                <img 
                                                  src={card.back_image_url} 
                                                  alt={`${card.card_name} (back)`}
                                                  style={{ width: '100%', height: '100%', objectFit: 'fill' }}
                                                />
                                              ) : (
                                                <div style={{ width: '100%', height: '100%', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' }}>
                                                  <div style={{ width: '80%', height: '80%', border: '4px solid #1a1a1a', borderRadius: '12px' }}></div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        {/* Corner Quantity Indicator */}
                                        <div style={{
                                            position: 'absolute', top: 0, left: 0,
                                            padding: '4px 8px',
                                            background: 'rgba(30, 30, 30, 0.9)',
                                            color: '#fff',
                                            fontSize: '0.8rem',
                                            fontWeight: 'bold',
                                            borderBottomRightRadius: '8px',
                                            zIndex: 3,
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '2px'
                                        }}>
                                            {card.quantity}
                                        </div>

                                        {/* Flip Button */}
                                        {(card.back_image_url || (card.type_line?.includes('//') || card.card_name.includes('//'))) && (
                                          <div style={{ 
                                            position: 'absolute', top: '50%', left: '12px', 
                                            transform: 'translateY(-50%)',
                                            zIndex: 5,
                                            opacity: (isLast || isHovered) ? 1 : 0,
                                            transition: 'opacity 0.2s',
                                            pointerEvents: (isLast || isHovered) ? 'auto' : 'none'
                                          }}>
                              <button 
                                                onClick={(e) => { e.stopPropagation(); handleFlip(card); }}
                                                className="flip-btn-premium"
                                                style={{ 
                                                    width: '42px', height: '42px', 
                                                    background: 'rgba(20, 20, 20, 0.6)', 
                                                    backdropFilter: 'blur(4px)',
                                                    color: 'var(--color-gold)', 
                                                    border: '1px solid var(--color-gold)', 
                                                    borderRadius: '50%',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
                                                    transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.transform = 'scale(1.15) rotate(180deg)';
                                                  e.currentTarget.style.background = 'var(--color-gold)';
                                                  e.currentTarget.style.color = '#000';
                                                  e.currentTarget.style.boxShadow = '0 0 20px rgba(212, 175, 55, 0.4)';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                                                  e.currentTarget.style.background = 'rgba(20, 20, 20, 0.6)';
                                                  e.currentTarget.style.color = 'var(--color-gold)';
                                                  e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
                                                }}
                                                title="Voltear carta (DFC)"
                                              >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                                                  <path d="M3 3v5h5"/>
                                                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                                                  <path d="M16 16h5v5"/>
                                                </svg>
                                              </button>
                                          </div>
                                        )}

                                        {/* Vertical Control Sidebar */}
                                        <div style={{ 
                                          position: 'absolute', top: '50%', right: '12px', 
                                          transform: 'translateY(-50%)',
                                          display: 'flex', flexDirection: 'column', gap: '0', 
                                          zIndex: 5,
                                          opacity: (isLast || isHovered) ? 1 : 0, 
                                          transition: 'opacity 0.2s',
                                          pointerEvents: (isLast || isHovered) ? 'auto' : 'none',
                                          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                                          borderRadius: '10px',
                                          overflow: 'hidden',
                                          border: '2px solid rgba(255,255,255,0.9)'
                                        }}>
                                             <button 
                                                onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    handleAddCard({ 
                                                        name: card.card_name, 
                                                        type_line: card.type_line, 
                                                        mana_cost: card.mana_cost,
                                                        image_uris: { normal: card.image_url },
                                                        prices: { eur: '0' }
                                                    } as any); 
                                                }}
                                                style={{ 
                                                    width: '44px', height: '44px', 
                                                    background: 'rgba(0,0,0,0.9)', color: '#fff', 
                                                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.4rem', fontWeight: 'bold',
                                                    transition: 'background 0.2s, transform 0.1s'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.background = 'var(--color-green)';
                                                  e.currentTarget.style.transform = 'scale(1.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.background = 'rgba(0,0,0,0.9)';
                                                  e.currentTarget.style.transform = 'scale(1)';
                                                }}
                                                title="Añadir una"
                                             >
                                                +
                                             </button>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); handleRemoveCard(card); }}
                                                style={{ 
                                                    width: '44px', height: '44px', 
                                                    background: 'rgba(0,0,0,0.9)', color: '#fff', 
                                                    border: 'none', borderBottom: '1px solid rgba(255,255,255,0.1)',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.4rem', fontWeight: 'bold',
                                                    transition: 'background 0.2s, transform 0.1s'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.background = 'var(--color-red)';
                                                  e.currentTarget.style.transform = 'scale(1.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.background = 'rgba(0,0,0,0.9)';
                                                  e.currentTarget.style.transform = 'scale(1)';
                                                }}
                                                title="Quitar una"
                                             >
                                                -
                                             </button>
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); setActiveInfoCard(card); }}
                                                style={{ 
                                                    width: '44px', height: '44px', 
                                                    background: 'rgba(20,20,20,0.95)', color: 'var(--color-gold)', 
                                                    border: 'none',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.2rem',
                                                    transition: 'background 0.2s, transform 0.1s'
                                                }}
                                                onMouseEnter={(e) => {
                                                  e.currentTarget.style.background = '#333';
                                                  e.currentTarget.style.transform = 'scale(1.1)';
                                                }}
                                                onMouseLeave={(e) => {
                                                  e.currentTarget.style.background = 'rgba(20,20,20,0.95)';
                                                  e.currentTarget.style.transform = 'scale(1)';
                                                }}
                                                title="Ver detalles y arte"
                                             >
                                                ✨
                                             </button>
                                             {isOwner && deckId && (
                                               <button 
                                                  onClick={(e) => { 
                                                    e.stopPropagation(); 
                                                    setEditingTags({ 
                                                      cardName: card.card_name, 
                                                      tags: cardTags[card.card_name] || [] 
                                                    }); 
                                                  }}
                                                  style={{ 
                                                      width: '44px', height: '44px', 
                                                      background: 'rgba(20,20,20,0.95)', color: 'var(--color-gold)', 
                                                      border: 'none',
                                                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                      fontSize: '1.2rem',
                                                      transition: 'background 0.2s, transform 0.1s'
                                                  }}
                                                  onMouseEnter={(e) => {
                                                    e.currentTarget.style.background = '#333';
                                                    e.currentTarget.style.transform = 'scale(1.1)';
                                                  }}
                                                  onMouseLeave={(e) => {
                                                    e.currentTarget.style.background = 'rgba(20,20,20,0.95)';
                                                    e.currentTarget.style.transform = 'scale(1)';
                                                  }}
                                                  title="Etiquetar carta"
                                               >
                                                  🏷️
                                               </button>
                                             )}
                                        </div>
                                      </div>
                                      );
                                    })}
                                  </div>
                                </div>
                            );
                         })}
                       </div>
                    ))}
                  </div>
      ) : viewMode === 'grid' ? (

          /* Grid View (Full cards, no overlap) */
          <div className="masonry-layout">
            {[...categories[groupBy]]
              .filter(catName => (grouped[catName] || []).length > 0)
              .sort((a, b) => {
                const countA = (grouped[a] || []).reduce((acc, c) => acc + c.quantity, 0);
                const countB = (grouped[b] || []).reduce((acc, c) => acc + c.quantity, 0);
                return countA - countB;
              })
              .map(catName => {
                const list = grouped[catName] || [];
                const sortedList = sortCards(list);
                const totalInCat = list.reduce((acc, c) => acc + c.quantity, 0);

                return (
                  <div key={catName} className="stack-column">
                    <h4 style={{ color: '#aaa', fontSize: '0.75rem', textTransform: 'uppercase', marginBottom: '0.8rem', display: 'flex', justifyContent: 'space-between', padding: '0 0.5rem', borderLeft: '2px solid var(--color-gold)' }}>
                      <span>{catName}</span>
                      <span style={{ color: '#444' }}>{totalInCat}</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {sortedList.map((card, idx) => {
                        const isGC = isGameChangerValue(card.card_name);
                        return (
                          <div 
                            key={`${card.card_name}-${idx}`}
                            onClick={() => setActiveInfoCard(card)}
                            onMouseEnter={(e) => startHoverTimer(card.card_name, card.image_url || '', e)}
                            onMouseLeave={stopHoverTimer}
                            style={{ width: '100%', aspectRatio: '63 / 88', position: 'relative', cursor: 'pointer', borderRadius: '8px', overflow: 'visible' }}
                          >
                             {isGC && (
                               <div className="game-changer-badge" title="Game Changer">
                                 <span>⚡</span>
                               </div>
                             )}
                             <img 
                               src={card.image_url || ''} 
                               alt={card.card_name}
                               style={{ width: '100%', height: '100%', objectFit: 'fill', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}
                             />
                             <div style={{ position: 'absolute', top: 0, left: 0, padding: '2px 6px', background: 'rgba(0,0,0,0.8)', color: '#fff', fontSize: '0.7rem', fontWeight: 'bold', borderBottomRightRadius: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                               <span>x{card.quantity}</span>
                               {userCollection.has(card.card_name.toLowerCase()) && (
                                 <span title="En tu colección" style={{ color: '#60a5fa' }}>📦</span>
                               )}
                             </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
      ) : viewMode === 'text' ? (
          /* Text View (Classic decklist style) */
          <div style={{ padding: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button 
                onClick={() => {
                  const textContent = Object.entries(grouped).map(([cat, list]) => {
                    if (list.length === 0) return '';
                    return `// ${cat}\n` + list.map(c => `${c.quantity} ${c.card_name}`).join('\n');
                  }).filter(Boolean).join('\n\n');
                  navigator.clipboard.writeText(textContent);
                  alert('¡Lista copiada al portapapeles!');
                }}
                style={{ 
                  background: 'rgba(212,175,55,0.1)', color: 'var(--color-gold)', border: '1px solid var(--color-gold)',
                  padding: '0.6rem 1.2rem', borderRadius: '30px', cursor: 'pointer', fontWeight: '600',
                  fontSize: '0.85rem', transition: 'all 0.2s'
                }}
                onMouseEnter={(e: any) => { 
                  e.currentTarget.style.background = 'var(--color-gold)';
                  e.currentTarget.style.color = '#000';
                }}
                onMouseLeave={(e: any) => {
                  e.currentTarget.style.background = 'rgba(212,175,55,0.1)';
                  e.currentTarget.style.color = 'var(--color-gold)';
                }}
              >
                📋 Copiar Lista (Texto)
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem' }}>
             {categories[groupBy].map(catName => {
                const list = grouped[catName] || [];
                if (list.length === 0) return null;
                const sortedList = sortCards(list);
                const totalInCat = list.reduce((acc, c) => acc + c.quantity, 0);

                return (
                  <div key={catName} style={{ background: '#111', padding: '1.5rem', borderRadius: '12px', border: '1px solid #222' }}>
                    <h4 style={{ color: 'var(--color-gold)', fontSize: '0.9rem', marginBottom: '1rem', borderBottom: '1px solid #222', paddingBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{catName}</span>
                      <span style={{ opacity: 0.5 }}>{totalInCat}</span>
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {sortedList.map(card => {
                        const isGC = isGameChangerValue(card.card_name);
                        return (
                          <div 
                            key={card.card_name} 
                            onClick={() => setActiveInfoCard(card)}
                            style={{ 
                              fontSize: '0.9rem', cursor: 'pointer', color: '#ccc',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '4px 8px', borderRadius: '4px'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.background = '#222';
                                startHoverTimer(card.card_name, card.image_url || '', e);
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'transparent';
                                stopHoverTimer();
                            }}
                          >
                             <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <b style={{ color: '#666', width: '20px' }}>{card.quantity}</b>
                               <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                 <span style={{ color: isGC ? 'var(--color-gold)' : '#fff' }}>{card.card_name}</span>
                                 {userCollection.has(card.card_name.toLowerCase()) && (
                                   <span title="En tu colección personal" style={{ fontSize: '0.8rem' }}>📦</span>
                                 )}
                               </div>
                               {isGC && <span title="Game Changer" style={{ fontSize: '0.7rem', cursor: 'help' }}>⚡</span>}
                             </span>
                             <span style={{ fontSize: '0.8rem', opacity: 0.8, display: 'flex', gap: '2px' }}>
                               {renderSymbols(card.mana_cost)}
                             </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
             })}
            </div>
          </div>
      ) : (
          /* List View */
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
              {categories[groupBy].map(catName => {
                  const list = grouped[catName] || [];
                  if (list.length === 0) return null;
                  const sortedList = sortCards(list);
                  const totalInCat = list.reduce((acc, c) => acc + c.quantity, 0);

                  return (
                      <div key={catName}>
                          <h4 style={{ borderBottom: '1px solid #333', paddingBottom: '0.5rem', marginBottom: '0.5rem', color: 'var(--color-gold)', display: 'flex', justifyContent: 'space-between' }}>
                              <span>{catName}</span>
                              <span style={{ fontSize: '0.8rem', color: '#666' }}>{totalInCat}</span>
                          </h4>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                              <tbody>
                                   {sortedList.map(card => {
                                      const isGC = isGameChangerValue(card.card_name);
                                      return (
                                       <tr 
                                         key={card.card_name} 
                                         className="deck-list-row"
                                         style={{ borderBottom: '1px solid #222', cursor: 'pointer' }}
                                         onClick={() => setActiveInfoCard(card)}
                                         onMouseEnter={(e) => {
                                           setHoveredCard(card);
                                           startHoverTimer(card.card_name, card.image_url || '', e);
                                         }}
                                         onMouseLeave={() => {
                                           setHoveredCard(null);
                                           stopHoverTimer();
                                         }}
                                       >
                                          <td style={{ padding: '4px', color: '#888', width: '20px' }}>{card.quantity}</td>
                                          <td style={{ padding: '4px' }}>
                                              <span style={{ cursor: 'pointer', color: isGC ? 'var(--color-gold)' : 'white' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                  <span style={{ color: isGC ? 'var(--color-gold)' : '#fff' }}>{card.card_name}</span>
                                                  {userCollection.has(card.card_name.toLowerCase()) && (
                                                    <span title="En tu colección personal" style={{ fontSize: '0.8rem' }}>📦</span>
                                                  )}
                                                </div>
                                                 {isGC && <span title="Game Changer" style={{ marginLeft: '6px', fontSize: '0.8rem', cursor: 'help' }}>⚡</span>}
                                              </span>
                                          </td>
                                          <td style={{ padding: '4px', textAlign: 'right', color: '#666' }}>
                                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '2px' }}>
                                              {renderSymbols(card.mana_cost)}
                                            </div>
                                          </td>
                                          {isOwner && (
                                              <td style={{ width: '20px' }}>
                                                  <button 
                                                    onClick={() => handleRemoveCard(card)}
                                                    style={{ border: 'none', background: 'none', color: '#444', cursor: 'pointer', fontSize: '1rem', padding: 0 }}
                                                    className="list-remove-btn"
                                                  >
                                                      ×
                                                  </button>
                                              </td>
                                          )}
                                      </tr>
                                  );
                                   })}
                              </tbody>
                          </table>
                      </div>
                  );
              })}
          </div>
      )}

      {activeInfoCard && (
        <CardDetailsModal 
          activeInfoCard={activeInfoCard}
          fullCardData={fullCardData}
          onClose={() => setActiveInfoCard(null)}
          isLoadingInfo={isLoadingInfo}
          isOwner={isOwner}
          onUpdateDeck={onUpdateDeck}
          onOpenVersionPicker={handleOpenVersionPicker}
          onEditTags={() => setEditingTags({ cardName: activeInfoCard.card_name, tags: cardTags[activeInfoCard.card_name] || [] })}
          onRemoveCard={() => setCardToRemove(activeInfoCard)}
          cardTags={cardTags}
        />
      )}





      {previewCard && typeof document !== 'undefined' && createPortal(
        (() => {
          const cardWidth = 280;
          const cardHeight = 390; // Approx based on aspect ratio
          const offset = 20;
          
          let left = previewCard.x + offset;
          let top = previewCard.y + offset;
          
          // boundary check
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
                  borderRadius: '14px', 
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
        .deck-list-row {
          transition: background-color 0.2s ease;
        }
        .deck-list-row:hover {
          background-color: rgba(255, 255, 255, 0.05) !important;
        }
        .card-slice:hover .remove-btn {
          visibility: visible !important;
        }
        .list-remove-btn:hover {
          color: red !important;
        }
        .suggestion-item:hover {
          background: #333;
          color: var(--color-gold);
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      
      <PlaytestModal 
        isOpen={showPlaytest} 
        onClose={() => setShowPlaytest(false)} 
        cards={cards}
        onPreview={(name, img, e) => startHoverTimer(name, img, e, true)}
        onStopPreview={stopHoverTimer}
      />

      {editingTags && deckId && (
        <TagEditor
          deckId={deckId}
          cardName={editingTags.cardName}
          currentTags={editingTags.tags}
          onClose={() => setEditingTags(null)}
          onSave={(tags) => {
            if (onTagsUpdate) onTagsUpdate();
            setEditingTags(null);
          }}
        />
      )}

      <ConfirmationDialog
        isOpen={cardToRemove !== null}
        title="Quitar Carta"
        message={`¿Estás seguro de que quieres quitar todas las copias de "${cardToRemove?.card_name}" del mazo?`}
        confirmText="Sí, quitar"
        cancelText="No, mantener"
        isDestructive={true}
        onConfirm={async () => {
          if (cardToRemove) {
             let refund = 0;
             const isPrecon = preconCardNames.has(cardToRemove.card_name.toLowerCase());
             
             if (!isPrecon) {
                 try {
                    if (cardToRemove.scryfall_id) {
                        const res = await fetch(`https://api.scryfall.com/cards/${cardToRemove.scryfall_id}`);
                        if (res.ok) {
                            const data = await res.json();
                            refund = parseFloat(data.prices?.eur || '0');
                        }
                    } 
                    
                    if (refund === 0) {
                        const results = await searchCards(cardToRemove.card_name);
                        const match = results.find(c => c.name.toLowerCase() === cardToRemove.card_name.toLowerCase()) || results[0];
                        if (match && match.prices?.eur) refund = parseFloat(match.prices.eur);
                    }
                 } catch (e) {
                     console.error("Error calculating refund:", e);
                 }
             }

             const totalRefund = refund * (cardToRemove.quantity || 1);

             if (onUpdateDeck) {
                 await onUpdateDeck({ 
                     card_out: cardToRemove.card_name,
                     cost: -totalRefund,
                     description: 'Eliminado desde editor visual'
                 });
             }
          }
          setCardToRemove(null);
          setActiveInfoCard(null);
        }}
        onCancel={() => setCardToRemove(null)}
      />

      <VersionPickerModal 
        editingVersion={editingVersion}
        onClose={() => setEditingVersion(null)}
        prints={prints}
        loadingPrints={loadingPrints}
        versionFilter={versionFilter}
        setVersionFilter={setVersionFilter}
        onSelectVersion={handleSelectVersion}
      />
      
      <PreviewCardOverlay previewCard={previewCard} />
    </div>
  );
}
