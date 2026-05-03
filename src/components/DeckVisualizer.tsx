'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { searchCards, getAveragePrice, getCardPrints, getCollection } from '@/lib/scryfall';
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
import { createClient } from '@/lib/supabaseClient';
import { calculateCMC, getCardFunction } from '@/lib/magicUtils';
import { calculateCardCost, transformScryfallToDeckCard } from '@/lib/deckUtils';
import VisualizerHeader from './deck/visualizer/VisualizerHeader';
import CardItem from './deck/visualizer/CardItem';
import { useDeckVisualizer } from '@/hooks/useDeckVisualizer';
import styles from './deck/visualizer/DeckVisualizer.module.css';

interface DeckVisualizerProps {
  cards: DeckCard[];
  isOwner?: boolean;
  onUpdateDeck?: (change: { card_in?: any, card_out?: string, cost?: number, description?: string }) => Promise<void> | void;
  preconCardNames?: Set<string>;
  deckId?: string;
  cardTags?: Record<string, string[]>;
  onTagsUpdate?: () => void;
  userCollection?: Set<string>;
  externalCmcFilter?: number | null;
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
  userCollection = new Set(),
  externalCmcFilter = null
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

  // Visual & UI States
  const [activeInfoCard, setActiveInfoCard] = useState<DeckCard | null>(null);
  const [fullCardData, setFullCardData] = useState<ScryfallCard | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);
  const [isSearchingPrice, setIsSearchingPrice] = useState(false);
  const [editingVersion, setEditingVersion] = useState<DeckCard | null>(null);
  const [prints, setPrints] = useState<ScryfallCard[]>([]);
  const [loadingPrints, setLoadingPrints] = useState(false);
  const [versionFilter, setVersionFilter] = useState('');
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [flippedCards, setFlippedCards] = useState<Set<string>>(new Set());
  const [showPlaytest, setShowPlaytest] = useState(false);
  const [editingTags, setEditingTags] = useState<{ cardName: string, tags: string[] } | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    type: '',
    text: '',
    edition: '',
    colors: [],
    cmc: [0, 20]
  });

  const [syncCount, setSyncCount] = useState<number | null>(null);
  const [cardToRemove, setCardToRemove] = useState<DeckCard | null>(null);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setShareStatus('copied');
    setTimeout(() => setShareStatus('idle'), 2000);
  };

  // Use the new hook for grouping and filtering logic
  const {
    filteredCards,
    grouped,
    distributedColumns,
    categories,
    sortCards,
    columnCount
  } = useDeckVisualizer({
    cards,
    groupBy,
    sortBy,
    filter,
    tagFilter,
    cardTags,
    advancedFilters,
    externalCmcFilter
  });

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

    const updatedCard = { 
      ...activeInfoCard, 
      ...transformScryfallToDeckCard(card, deckId as string, activeInfoCard.is_commander)
    } as DeckCard;

    setActiveInfoCard(updatedCard);
    
    // Calculate new price
    const newPrice = parseFloat(card.prices?.eur || '0');
    
    // Notify parent to update the DB entry
    onUpdateDeck?.({ 
      card_in: updatedCard, 
      cost: newPrice,
      description: `Cambio de edición: ${card.set_name} (${card.set.toUpperCase()})`
    });

    setEditingVersion(null);
  };









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






  const isGameChangerValue = (cardName: string) => {
    return BRACKETS.some(b => b.name === cardName && b.reason === 'Game Changer');
  };





  const handleAddCard = async (scryfallCard: ScryfallCard) => {
    setIsSearchingPrice(true);
    try {
      const { price, description } = await calculateCardCost(scryfallCard, preconCardNames, userCollection);

      if (onUpdateDeck) {
        await onUpdateDeck({ 
          card_in: scryfallCard,
          cost: price,
          description: description
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





  // Stacks distributed via hook logic
  // columnCount also provided by hook
  const isOwnerAndDeck = isOwner && deckId;

  return (
    <div className={styles.visualizerContainer}>
      <VisualizerHeader 
        cards={cards}
        onShowPlaytest={() => setShowPlaytest(true)}
        onShare={handleShare}
        shareStatus={shareStatus}
        groupBy={groupBy}
        setGroupBy={setGroupBy}
        sortBy={sortBy}
        setSortBy={setSortBy}
        viewMode={viewMode}
        setViewMode={setViewMode}
        filter={filter}
        setFilter={setFilter}
        showFilters={showFilters}
        setShowFilters={setShowFilters}
      />
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
      <div className={styles.contentArea}>
        {viewMode === 'stack' ? (
            <div className={styles.stackLayout}>
              {distributedColumns.map((colInclusions, colIdx) => (
                 <div key={`col-${colIdx}`} className={styles.stackColumn}>
                 {colInclusions.map(catName => {
                    const list = grouped[catName] || [];
                    const sortedList = sortCards(list);
                    const totalInCat = list.reduce((acc, c) => acc + c.quantity, 0);

                    return (
                        <div key={catName} className={styles.stackCategoryBlock}>
                          <h4 className={styles.stackHeader}>
                            <span className={styles.stackTitle}>{catName}</span>
                            <span className={styles.stackCount}>{totalInCat}</span>
                          </h4>

                          <div className={styles.stackCardsContainer}>
                            {sortedList.map((card, idx) => {
                                      const isLast = idx === sortedList.length - 1;
                                      const isGC = BRACKETS.some(b => b.name === card.card_name && b.reason === 'Game Changer');
                                      const isHovered = hoveredCard === card;
                                      
                                      return (
                                        <CardItem 
                                          key={`${card.card_name}-${idx}`}
                                          card={card}
                                          idx={idx}
                                          isLast={isLast}
                                          isHovered={isHovered}
                                          isFlipped={flippedCards.has(card.card_name)}
                                          isGC={isGC}
                                          isOwner={isOwner}
                                          userCollection={userCollection}
                                          onClick={() => setActiveInfoCard(card)}
                                          onMouseEnter={(e) => {
                                            setHoveredCard(card);
                                            startHoverTimer(card.card_name, card.image_url || '', e);
                                          }}
                                          onMouseLeave={() => {
                                            setHoveredCard(null);
                                            stopHoverTimer();
                                          }}
                                          onFlip={(e) => { e.stopPropagation(); handleFlip(card); }}
                                          onAddOne={() => handleAddCard({ 
                                              name: card.card_name, 
                                              type_line: card.type_line, 
                                              mana_cost: card.mana_cost,
                                              image_uris: { normal: card.image_url },
                                              prices: { eur: '0' }
                                          } as any)}
                                          onRemove={() => handleRemoveCard(card)}
                                          onEditTags={() => setEditingTags({ 
                                            cardName: card.card_name, 
                                            tags: cardTags[card.card_name] || [] 
                                          })}
                                          onShowInfo={() => setActiveInfoCard(card)}
                                        />
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
              <div className={styles.masonryLayout}>
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
                  <div key={catName} className={styles.gridCategoryBlock}>
                    <h4 className="stack-header" style={{ marginBottom: '1.2rem' }}>
                      <span className="stack-title">{catName}</span>
                      <span className="stack-count">{totalInCat}</span>
                    </h4>
                    <div className={styles.gridCardsContainer}>
                      {sortedList.map((card, idx) => {
                        const isGC = isGameChangerValue(card.card_name);
                        const isHovered = hoveredCard === card;
                        return (
                          <CardItem 
                            key={`${card.card_name}-${idx}`}
                            card={card}
                            idx={idx}
                            isLast={true}
                            isHovered={isHovered}
                            isFlipped={flippedCards.has(card.card_name)}
                            isGC={isGC}
                            isOwner={isOwner}
                            viewMode="grid"
                            userCollection={userCollection}
                            onClick={() => setActiveInfoCard(card)}
                            onMouseEnter={(e) => {
                              setHoveredCard(card);
                              startHoverTimer(card.card_name, card.image_url || '', e);
                            }}
                            onMouseLeave={() => {
                              setHoveredCard(null);
                              stopHoverTimer();
                            }}
                            onFlip={(e) => { e.stopPropagation(); handleFlip(card); }}
                            onAddOne={() => handleAddCard({ 
                                name: card.card_name, 
                                type_line: card.type_line, 
                                mana_cost: card.mana_cost,
                                image_uris: { normal: card.image_url },
                                prices: { eur: '0' }
                            } as any)}
                            onRemove={() => handleRemoveCard(card)}
                            onEditTags={() => setEditingTags({ 
                              cardName: card.card_name, 
                              tags: cardTags[card.card_name] || [] 
                            })}
                            onShowInfo={() => setActiveInfoCard(card)}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              </div>
        ) : (
          /* Text View or Fallback */
          <div style={{ width: '100%' }}>
            {viewMode === 'text' ? (
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
            </div>
          )}
      </div>

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
        .deck-builder-container {
          transition: all 0.5s cubic-bezier(0.15, 0.85, 0.45, 1);
        }

        .premium-title {
          color: var(--color-gold);
          margin: 0;
          font-size: 1.6rem;
          font-weight: 800;
          letter-spacing: -0.5px;
          text-shadow: 0 0 20px rgba(212, 175, 55, 0.3);
        }

        .btn-action {
          padding: 0.6rem 1.2rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: #eee;
          cursor: pointer;
          font-weight: 600;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn-action:hover {
          background: rgba(255, 255, 255, 0.1);
          border-color: rgba(255, 255, 255, 0.3);
          transform: translateY(-2px);
          box-shadow: 0 10px 20px rgba(0,0,0,0.3);
        }

        .btn-action.success {
          background: rgba(76, 175, 80, 0.2);
          border-color: rgba(76, 175, 80, 0.4);
          color: #81c784;
        }

        .filters-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          background: rgba(0, 0, 0, 0.2);
          padding: 0.5rem 1rem;
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.05);
        }

        .search-group {
          display: flex;
          align-items: center;
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 2px;
          transition: all 0.3s;
        }

        .search-group:focus-within {
          border-color: var(--color-gold);
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.2);
        }

        .search-input {
          background: transparent;
          border: none;
          color: white;
          padding: 0.5rem 1rem;
          font-size: 0.9rem;
          outline: none;
          width: 180px;
        }

        .filter-toggle {
          background: transparent;
          border: none;
          color: #666;
          padding: 0.5rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .filter-toggle:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.05);
        }

        .filter-toggle.active {
          color: var(--color-gold);
          background: rgba(212, 175, 55, 0.15);
        }

        .game-changer-badge {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 28px;
          height: 28px;
          background: var(--color-gold);
          color: #000;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          z-index: 10;
          box-shadow: 0 4px 10px rgba(212, 175, 55, 0.5);
          border: 2px solid #000;
        }

        .card-3d-container {
          width: 100%;
          height: 100%;
          perspective: 1200px;
        }

        .card-3d-inner {
          position: relative;
          width: 100%;
          height: 100%;
          transition: transform 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          transform-style: preserve-3d;
        }

        .card-3d-inner.is-flipped {
          transform: rotateY(180deg);
        }

        .card-3d-front, .card-3d-back {
          position: absolute;
          width: 100%;
          height: 100%;
          backface-visibility: hidden;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        }

        .card-3d-back {
          transform: rotateY(180deg);
        }

        .deck-list-row {
          transition: all 0.2s ease;
        }
        .deck-list-row:hover {
          background-color: rgba(212, 175, 55, 0.05) !important;
          transform: translateX(5px);
        }
        .card-slice:hover .remove-btn {
          visibility: visible !important;
        }
        .list-remove-btn:hover {
          color: #ff5252 !important;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .stack-column-premium {
          break-inside: auto;
          margin-bottom: 0;
          width: 100%;
          max-width: 260px;
          display: flex;
          flex-direction: column;
        }

        .stack-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.6rem 1rem;
          margin-bottom: 1rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          border-left: 3px solid var(--color-gold);
          transition: all 0.3s;
        }

        .stack-header:hover {
          background: rgba(255, 255, 255, 0.06);
          transform: translateX(3px);
        }

        .stack-title {
          color: #aaa;
          font-size: 0.8rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.5px;
        }

        .stack-count {
          color: #555;
          font-size: 0.8rem;
          font-weight: 900;
          font-family: monospace;
        }

        .stack-content {
          position: relative;
          display: flex;
          flex-direction: column;
          padding-bottom: 1rem;
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
