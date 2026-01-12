'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScryfallCard, searchCards, getAveragePrice, getCardPrints } from '@/lib/scryfall';
import ConfirmationDialog from './ConfirmationDialog';
import TagEditor from '@/components/TagEditor';

interface DeckCard {
  id?: string; // Database ID
  card_name: string;
  quantity: number;
  type_line: string | null;
  mana_cost: string | null;
  image_url: string | null;
  back_image_url?: string | null;
  oracle_text: string | null;
  is_commander: boolean;
  scryfall_id?: string;
}

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

type GroupBy = 'type' | 'cmc' | 'color' | 'function';

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
  const [sortBy, setSortBy] = useState<'name' | 'cmc'>('cmc');
  const [viewMode, setViewMode] = useState<'stack' | 'grid' | 'text' | 'list'>('stack');
  
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
  const [playtestDeck, setPlaytestDeck] = useState<DeckCard[]>([]);
  const [playtestHand, setPlaytestHand] = useState<DeckCard[]>([]);
  const [playtestLibrary, setPlaytestLibrary] = useState<DeckCard[]>([]);
  const [addResults, setAddResults] = useState<ScryfallCard[]>([]);
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
  const [showBracketInfo, setShowBracketInfo] = useState(false);

  const [cardToRemove, setCardToRemove] = useState<DeckCard | null>(null);

  // Card Preview State
  const [previewCard, setPreviewCard] = useState<{ name: string, image: string, x: number, y: number } | null>(null);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout|null>(null);

  useEffect(() => {
    if (activeInfoCard) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeInfoCard]);

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
      type_line: card.type_line || '',
      mana_cost: card.mana_cost || null
    };

    setActiveInfoCard(updatedCard);
    
    // Notify parent to update the DB entry
    onUpdateDeck?.({ 
      card_in: updatedCard, 
      card_out: activeInfoCard.card_name,
      cost: 0 // Just a version change
    });

    setEditingVersion(null);
  };

  const renderVersionModal = () => {
    if (!editingVersion) return null;

    return createPortal(
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: 30000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(10px)'
      }} onClick={() => setEditingVersion(null)}>
        <div 
          className="card" 
          style={{ 
            maxWidth: '800px', width: '100%', maxHeight: '85vh', 
            display: 'flex', flexDirection: 'column', 
            padding: '3rem', border: '1px solid #444', 
            boxShadow: '0 25px 50px rgba(0,0,0,0.9)',
            background: '#121212', borderRadius: '24px'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--color-gold)', fontSize: '1.5rem' }}>Cambiar Edición</h3>
              <p style={{ margin: '4px 0 0', fontSize: '1rem', color: '#888' }}>{editingVersion.card_name}</p>
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
                  width: '100%', padding: '1rem', 
                  background: '#000', border: '1px solid #333', 
                  color: '#fff', borderRadius: '12px', fontSize: '1rem' 
                }}
              />
            </div>
          )}

          {loadingPrints ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '1.5rem', color: '#888', fontSize: '1.1rem' }}>Buscando ediciones...</p>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '1rem', marginRight: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                {prints
                  .filter(p => 
                    (p.set_name?.toLowerCase().includes(versionFilter.toLowerCase())) || 
                    (p.set?.toLowerCase().includes(versionFilter.toLowerCase()))
                  )
                  .map(p => (
                  <div 
                    key={p.id}
                    onClick={() => handleSelectVersion(p)}
                    style={{ 
                      cursor: 'pointer', padding: '10px', borderRadius: '12px',
                      background: '#1a1a1a', border: '1px solid #333',
                      transition: 'all 0.2s', textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#252525';
                      e.currentTarget.style.borderColor = 'var(--color-gold)';
                      e.currentTarget.style.transform = 'translateY(-5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1a1a1a';
                      e.currentTarget.style.borderColor = '#333';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <img src={p.image_uris?.small || p.card_faces?.[0]?.image_uris?.small} alt={p.set_name} style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', height: '2.5em', overflow: 'hidden', color: '#aaa', margin: '4px 0' }}>{p.set_name}</div>
                    <div style={{ color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '1rem' }}>{p.prices?.eur ? `${p.prices.eur}€` : 'N/A'}</div>
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

  // 1. Calculate Deck Stats
  const totalCards = cards.reduce((acc, c) => acc + c.quantity, 0);
  const isLegalSize = totalCards === 100;

  // 2. Calculate Bracket
  const cardNames = new Set(cards.map(c => c.card_name.toLowerCase()));
  const detectedBracketCards = cards.map(c => {
    const match = BRACKETS.find(b => b.name === c.card_name);
    return match ? { ...match, card: c } : null;
  }).filter(Boolean) as { name: string, bracket: number, reason: string, card: DeckCard }[];

  const gameChangers = detectedBracketCards.filter(c => c.reason.includes("Game Changer") || c.reason.includes("Tutor") || c.reason.includes("Fast Mana"));
  const mldCards = detectedBracketCards.filter(c => c.reason.includes("Mass Land Denial") || c.reason.includes("Stax"));
  
  // Combo Detection
  const combos = [
    { name: "Thoracle Combo", cards: ["thassa's oracle", "demonic consultation"], bracket: 4 },
    { name: "Thoracle Combo (Pact)", cards: ["thassa's oracle", "tainted pact"], bracket: 4 },
    { name: "Dramatic Scepter", cards: ["isochron scepter", "dramatic reversal"], bracket: 4 },
    { name: "Heliod Ballista", cards: ["heliod, sun-crowned", "walking ballista"], bracket: 4 },
    { name: "Breach LED", cards: ["underworld breach", "lion's eye diamond"], bracket: 4 }
  ];

  const detectedCombos = combos.filter(combo => 
    combo.cards.every(name => cardNames.has(name))
  );

  let bracketLevel = 2; // Default to Core
  
  if (detectedCombos.length > 0) {
    bracketLevel = 4;
  } else if (mldCards.length > 0) {
    bracketLevel = 4;
  } else if (gameChangers.length > 0) {
     if (gameChangers.length <= 3) bracketLevel = 3;
     else bracketLevel = 4;
  }
  
  // Custom Bracket Label
  const getBracketLabel = (level: number) => {
    switch (level) {
      case 1: return { label: 'Bracket 1: Exhibition', color: '#8bc34a' }; // Hard to detect purely by list
      case 2: return { label: 'Bracket 2: Core', color: '#4caf50' };
      case 3: return { label: 'Bracket 3: Upgraded', color: '#ff9800' };
      case 4: return { label: 'Bracket 4: Optimized/cEDH', color: '#f44336' };
      default: return { label: 'Unknown', color: '#888' };
    }
  };
  
  const bracketInfo = getBracketLabel(bracketLevel);


  const filteredCards = cards.filter(card => {
    const matchesSearch = card.card_name.toLowerCase().includes(filter.toLowerCase());
    const matchesTag = !tagFilter || (cardTags[card.card_name] && cardTags[card.card_name].includes(tagFilter));
    return matchesSearch && matchesTag;
  });

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (addQuery.length > 2) {
        const res = await searchCards(addQuery);
        setAddResults(res.slice(0, 10));
      } else {
        setAddResults([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [addQuery]);

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

  // Helper to render MTG Symbols
  const renderSymbols = (text: string | null) => {
    if (!text) return null;
    const symbolRegex = /\{([^}]+)\}/g;
    const parts = text.split(symbolRegex);
    
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const symbol = part.replace(/\//g, '');
        return (
          <img 
            key={i}
            src={`https://svgs.scryfall.io/card-symbols/${symbol.toUpperCase()}.svg`}
            alt={part}
            style={{ height: '1.1em', width: 'auto', verticalAlign: 'middle', display: 'inline-block', margin: '0 2px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }}
          />
        );
      }
      return part;
    });
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
      setAddQuery('');
      setAddResults([]);
    } catch (e) {
      console.error("Error adding card:", e);
    } finally {
      setIsSearchingPrice(false);
    }
  };

  const startPlaytest = () => {
    const fullDeck: DeckCard[] = [];
    cards.forEach(c => {
      for (let i = 0; i < c.quantity; i++) fullDeck.push(c);
    });
    const shuffled = [...fullDeck].sort(() => Math.random() - 0.5);
    setPlaytestDeck(fullDeck);
    setPlaytestHand(shuffled.slice(0, 7));
    setPlaytestLibrary(shuffled.slice(7));
    setShowPlaytest(true);
  };

  const drawCard = () => {
    if (playtestLibrary.length > 0) {
      setPlaytestHand([...playtestHand, playtestLibrary[0]]);
      setPlaytestLibrary(playtestLibrary.slice(1));
    }
  };

  const mulligan = () => {
    const shuffled = [...playtestDeck].sort(() => Math.random() - 0.5);
    setPlaytestHand(shuffled.slice(0, 7));
    setPlaytestLibrary(shuffled.slice(7));
  };

  const handleSelectSuggestion = (scryfallCard: ScryfallCard) => {
     handleAddCard(scryfallCard);
  };
  
  const handlePreviewSuggestion = (scryfallCard: ScryfallCard) => {
      setAddQuery(scryfallCard.name);
      setAddResults([]); 
  };

  const handleRemoveCard = (card: DeckCard) => {
    if (onUpdateDeck) {
      onUpdateDeck({ 
        card_out: card.card_name,
        description: 'Quitado desde editor visual'
      });
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

  const getFullInfo = async (card: DeckCard) => {
    setActiveInfoCard(card);
    setFullCardData(null);
    setModalFace(0);
    setIsLoadingInfo(true);

    try {
      const res = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(card.card_name)}&lang=en`);
      if (res.ok) {
        const data = await res.json();
        setFullCardData(data);
        
        // Ensure the locally held oracle_text is synced if it was missing
        if (!card.oracle_text) {
          let combinedOracle = data.oracle_text || '';
          if (data.card_faces && !data.oracle_text) {
             combinedOracle = data.card_faces.map((f: any) => `${f.name}: ${f.oracle_text}`).join('\n\n');
          }
          card.oracle_text = combinedOracle;
          setActiveInfoCard({ ...card, oracle_text: combinedOracle });
        }
      }
    } catch (e) {
      console.error("Error fetching card info:", e);
    } finally {
      setIsLoadingInfo(false);
    }
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
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <h2 style={{ color: 'var(--color-gold)', margin: 0, fontSize: '1.4rem' }}>Editor Visual</h2>
            
            {/* 1. Deck Count Validator */}
            <div style={{ 
              display: 'flex', alignItems: 'center', gap: '6px', 
              padding: '4px 10px', borderRadius: '20px', 
              background: isLegalSize ? 'rgba(76, 175, 80, 0.1)' : 'rgba(244, 67, 54, 0.1)',
              border: `1px solid ${isLegalSize ? '#4caf50' : '#f44336'}`,
              fontSize: '0.8rem', fontWeight: 'bold'
            }}>
              <span style={{ color: isLegalSize ? '#4caf50' : '#f44336' }}>
                {totalCards} / 100 Cartas
              </span>
              {isLegalSize ? '✅' : '⚠️'}
            </div>

            {/* 2. Bracket Display (Clickable Tooltip) */}
            <div 
              style={{ 
                position: 'relative',
                padding: '4px 10px', borderRadius: '6px',
                background: bracketInfo.color,
                color: '#fff', fontSize: '0.75rem', fontWeight: 'bold',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}
              title="Haz clic para ver detalles de los niveles de poder"
              onClick={() => setShowBracketInfo(true)}
            >
              <span>{bracketInfo.label}</span>
              <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>ℹ️</span>
            </div>

            {/* Bracket Info Modal */}
            {showBracketInfo && createPortal(
              <div 
                style={{
                  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.8)', zIndex: 9999,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '2rem'
                }}
                onClick={() => setShowBracketInfo(false)}
              >
                <div 
                  style={{
                    background: '#1e1e1e',
                    padding: '2rem',
                    borderRadius: '16px',
                    maxWidth: '600px',
                    width: '100%',
                    border: '1px solid #333',
                    boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
                    position: 'relative'
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <button 
                    onClick={() => setShowBracketInfo(false)}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#888', fontSize: '1.5rem', cursor: 'pointer' }}
                  >
                    &times;
                  </button>
                  
                  <h3 style={{ marginTop: 0, color: 'var(--color-gold)', marginBottom: '1.5rem', borderBottom: '1px solid #333', paddingBottom: '1rem' }}>
                    Niveles de Poder (Brackets)
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div>
                      <h4 style={{ color: '#8bc34a', margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                        Bracket 1: Exhibition / Precon
                      </h4>
                      <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Mazos preconstruidos sin modificar, mazos temáticos (arte de sillas, solo cartas antiguas) o setups de muy bajo presupuesto/poder. Priorizan la diversión o el "flavor" sobre la eficiencia.
                      </p>
                    </div>

                    <div>
                      <h4 style={{ color: '#4caf50', margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                        Bracket 2: Core (Casual Estándar)
                      </h4>
                      <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        El nivel más común. Mazos con un plan de juego claro, buenas sinergias y una curva de maná razonable. Pueden ganar, pero no suelen hacerlo antes del turno 8-10.
                      </p>
                    </div>

                    <div>
                      <h4 style={{ color: '#ff9800', margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                        Bracket 3: High Power
                      </h4>
                      <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        Mazos altamente optimizados. Incluyen tutores eficientes, mana rápido (Mana Crypt, etc.) y combos compactos. Buscan ganar de forma consistente y resiliente, amenazando victorias en turnos 6-8.
                      </p>
                    </div>

                    <div>
                      <h4 style={{ color: '#f44336', margin: '0 0 0.5rem 0', display: 'flex', justifyContent: 'space-between' }}>
                        Bracket 4: Optimized / cEDH
                      </h4>
                      <p style={{ margin: 0, color: '#ccc', fontSize: '0.9rem', lineHeight: '1.5' }}>
                        El límite de lo posible. Sin restricciones presupuestarias. Combos de victoria instantánea (Thoracle, Breach), Stax opresivo, y capacidad de ganar en turnos 1-3. <br/>
                        <span style={{ fontSize: '0.85rem', color: '#ff6b6b', marginTop: '0.5rem', display: 'block' }}>
                          * Tu mazo está aquí si contiene cartas "Game Changer" (ej. Mana Crypt, Rhystic Study) o Combos Infinitos conocidos.
                        </span>
                      </p>
                    </div>
                  </div>

                  {detectedBracketCards.length > 0 && (
                    <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(244, 67, 54, 0.1)', border: '1px solid #f44336', borderRadius: '8px' }}>
                      <strong style={{ display: 'block', color: '#f44336', marginBottom: '0.5rem' }}>Tu mazo está en Bracket {bracketLevel} por:</strong>
                      <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#ddd', fontSize: '0.9rem' }}>
                        {detectedBracketCards.map(c => (
                          <li key={c.name}>
                            {c.name} <span style={{ opacity: 0.6, fontSize: '0.8rem' }}>({c.reason})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              </div>,
              document.body
            )}
          </div>
          
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
             {/* Group By */}
             <div style={{ display: 'flex', gap: '0.25rem', background: '#111', padding: '4px', borderRadius: '8px' }}>
                {(['type', 'cmc', 'color', 'function'] as GroupBy[]).map(g => (
                  <button 
                    key={g}
                    onClick={() => setGroupBy(g)}
                    style={{ 
                      padding: '4px 10px', 
                      fontSize: '0.7rem', 
                      borderRadius: '6px', 
                      border: 'none',
                      background: groupBy === g ? 'var(--color-gold)' : 'transparent',
                      color: groupBy === g ? '#000' : '#888',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      textTransform: 'uppercase'
                    }}
                  >
                    {g === 'function' ? 'Func' : g.toUpperCase()}
                  </button>
                ))}
            </div>

            {/* Sort By */}
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              style={{ padding: '0.3rem', borderRadius: '6px', background: '#151515', color: '#ccc', border: '1px solid #333', fontSize: '0.8rem' }}
            >
              <option value="cmc">Mana Value</option>
              <option value="name">Nombre (A-Z)</option>
            </select>

            {/* View Mode Dropdown */}
            <div className="view-as-container">
               <span>View as</span>
               <select 
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value as any)}
                className="view-as-select"
               >
                 <option value="stack">🖼️ Pilas</option>
                 <option value="grid">⬛ Cuadrícula</option>
                 <option value="text">📄 Texto</option>
                 <option value="list">📝 Tabla</option>
               </select>
            </div>
          </div>
        </div>
            <button 
              onClick={startPlaytest}
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
                borderRadius: '30px', 
                border: '1px solid #333', 
                background: '#151515', 
                color: 'white',
                fontSize: '0.9rem',
                width: '150px'
            }}
            />
        </div>
      </div>

      {/* Add Card Interface (Always Visible for Owner) */}
      {isOwner && (
        <div style={{ marginBottom: '1.5rem', background: '#111', padding: '0.8rem', borderRadius: '30px', border: '1px solid var(--color-gold)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
           <span 
             onClick={() => {
               if (addResults.length > 0) handleAddCard(addResults[0]);
             }}
             style={{ 
               paddingLeft: '1rem', color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '1.2rem',
               cursor: addResults.length > 0 ? 'pointer' : 'default',
               display: 'flex', alignItems: 'center', justifyContent: 'center'
             }}
           >
             {isSearchingPrice ? <div className="spinner-small"></div> : '+'}
           </span>
           <div style={{ position: 'relative', flex: 1 }}>
             <input 
               type="text" 
               placeholder="Añadir carta (escribe nombre)..." 
               value={addQuery}
               onChange={e => setAddQuery(e.target.value)}
               style={{ width: '100%', padding: '0.5rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.95rem', outline: 'none' }}
               disabled={isSearchingPrice}
             />
             {addResults.length > 0 && (
               <ul style={{ position: 'absolute', top: '140%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #444', zIndex: 2000, listStyle: 'none', padding: 0, margin: '0', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)' }}>
                 {addResults.map(res => (
                   <li 
                     key={res.name} 
                     onClick={() => handleAddCard(res)}
                     onMouseEnter={(e) => {
                       startHoverTimer(res.name, res.image_uris?.normal || '', e, true);
                     }}
                     onMouseLeave={stopHoverTimer}
                     style={{ padding: '0.8rem 1.2rem', cursor: 'pointer', borderBottom: '1px solid #222', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between' }}
                     className="suggestion-item"
                   >
                     <span style={{ color: '#fff', flex: 1 }}>{res.name}</span>
                     <span style={{ color: 'var(--color-gold)', fontSize: '0.8rem', fontWeight: 'bold', marginRight: '1rem' }}>
                       {res.prices.eur ? `${res.prices.eur}€` : 'N/A'}
                     </span>
                     <span style={{ color: '#666', fontSize: '0.7rem' }}>{res.type_line}</span>
                   </li>
                 ))}
               </ul>
             )}
           </div>
        </div>
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
                                      const isGC = isGameChangerValue(card.card_name);
                                      const isHovered = hoveredCard === card;
                                      
                                      return (
                                        <div 
                                          key={`${card.card_name}-${idx}`}
                                          onClick={() => getFullInfo(card)}
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
                                                style={{ 
                                                    width: '42px', height: '42px', 
                                                    background: 'rgba(0,0,0,0.85)', color: '#fff', 
                                                    border: '1.5px solid #fff', borderRadius: '50%',
                                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: '1.4rem', boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                                                    transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.15) rotate(180deg)'}
                                                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1) rotate(0deg)'}
                                                title="Voltear carta (DFC)"
                                              >
                                                🔄
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
                                                onClick={(e) => { e.stopPropagation(); getFullInfo(card); }}
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
                            onClick={() => getFullInfo(card)}
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
                            onClick={() => getFullInfo(card)}
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
                                         style={{ borderBottom: '1px solid #222', cursor: 'pointer' }}
                                         onClick={() => getFullInfo(card)}
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



      {/* Card Info Modal (Premium Design & Centered in Viewport) */}
      {/* Info Modal with React Portal */}
      {/* Card Info Modal (Responsive & Interactive) */}
      {activeInfoCard && typeof document !== 'undefined' && createPortal(
        <div 
          onClick={() => setActiveInfoCard(null)}
          className="card-modal-overlay"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="card-modal-content"
          >
            {/* Close Button */}
            <button 
              onClick={() => setActiveInfoCard(null)}
              className="modal-close-btn"
            >✕</button>

            {/* Left: Card Render */}
            <div className="card-modal-left">
              <img 
                src={(fullCardData?.card_faces && fullCardData.card_faces[modalFace]?.image_uris?.normal) || activeInfoCard.image_url || ''} 
                alt={activeInfoCard.card_name} 
                className="card-modal-image"
              />
              
              {/* Modal Face Flip Button */}
              {fullCardData?.card_faces && fullCardData.card_faces.length > 1 && (
                <button 
                  onClick={() => setModalFace(prev => (prev === 0 ? 1 : 0))}
                  style={{
                    marginTop: '1.5rem', padding: '0.8rem 1.5rem', background: 'var(--color-gold)',
                    color: '#000', border: 'none', borderRadius: '30px', fontWeight: 'bold',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px',
                    boxShadow: '0 4px 15px rgba(212,175,55,0.4)', fontSize: '0.9rem'
                  }}
                >
                  <span>🔄 Ver Reverso</span>
                </button>
              )}
            </div>

            {/* Right: Info & Controls */}
            <div className="card-modal-right">
              <div>
                <h2 style={{ color: 'var(--color-gold)', margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                  {fullCardData?.card_faces ? fullCardData.card_faces[modalFace]?.name : activeInfoCard.card_name}
                </h2>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ color: '#aaa', fontSize: '1rem' }}>
                    {fullCardData?.card_faces ? fullCardData.card_faces[modalFace]?.type_line : activeInfoCard.type_line}
                  </span>
                  <div style={{ background: '#1a1a1a', padding: '4px 10px', borderRadius: '8px', color: 'var(--color-gold)', border: '1px solid rgba(212,175,55,0.3)', fontWeight: 'bold', display: 'flex', gap: '4px', fontSize: '0.9rem' }}>
                    {renderSymbols(fullCardData?.card_faces ? fullCardData.card_faces[modalFace]?.mana_cost : activeInfoCard.mana_cost)}
                  </div>
                </div>
              </div>

               {/* Mobile Management Controls */}
               {isOwner && (
                 <div style={{ background: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <h4 style={{ margin: 0, color: '#888', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Gestión de Carta</h4>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                       {/* Quantity */}
                       <div style={{ display: 'flex', alignItems: 'center', background: '#000', borderRadius: '8px', border: '1px solid #333' }}>
                          <button 
                            onClick={() => {
                                if (activeInfoCard.quantity > 1) {
                                   const newQty = activeInfoCard.quantity - 1;
                                   setActiveInfoCard(prev => prev ? {...prev, quantity: newQty} : null);
                                   onUpdateDeck?.({ card_in: {...activeInfoCard, quantity: newQty}, card_out: activeInfoCard.card_name }); 
                                } else {
                                   setCardToRemove(activeInfoCard);
                                }
                             }}
                            className="btn"
                            style={{ padding: '4px 12px', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                          >−</button>
                          <span style={{ padding: '0 8px', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>{activeInfoCard.quantity}</span>
                          <button 
                             onClick={() => {
                                const newQty = activeInfoCard.quantity + 1;
                                setActiveInfoCard(prev => prev ? {...prev, quantity: newQty} : null);
                                // Pass the full activeInfoCard to preserve version (scryfall_id, image_url, etc)
                                onUpdateDeck?.({ card_in: {...activeInfoCard, quantity: newQty}, card_out: activeInfoCard.card_name });
                             }}
                            className="btn"
                             style={{ padding: '4px 12px', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                          >+</button>
                       </div>

                        {/* Version Selection */}
                        <button 
                          onClick={handleOpenVersionPicker}
                          className="btn"
                          style={{ background: '#222', fontSize: '0.9rem', padding: '8px 16px', border: '1px solid #444', display: 'flex', alignItems: 'center', gap: '8px' }}
                        >
                          🔄 Cambiar Edición
                        </button>

                       {/* Tags */}
                       <button 
                         onClick={() => setEditingTags({ cardName: activeInfoCard.card_name, tags: cardTags[activeInfoCard.card_name] || [] })}
                         className="btn"
                         style={{ background: '#222', fontSize: '0.9rem', padding: '8px 16px', border: '1px solid #444' }}
                       >
                         🏷️ Etiquetas
                       </button>

                        {/* Remove */}
                        <button 
                          onClick={() => setCardToRemove(activeInfoCard)}
                          className="btn"
                          style={{ background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', fontSize: '0.9rem', padding: '8px 12px', border: '1px solid rgba(255, 68, 68, 0.3)' }}
                        >
                          🗑️
                        </button>

                        {/* Set as Commander Toggle - Only if eligible */}
                        {(() => {
                           const typeLine = (fullCardData?.type_line || activeInfoCard.type_line || '').toLowerCase();
                           const oracleText = (fullCardData?.oracle_text || activeInfoCard.oracle_text || '').toLowerCase();
                           const isLegendary = typeLine.includes('legendary');
                           const isCreature = typeLine.includes('creature');
                           const isPlaneswalker = typeLine.includes('planeswalker');
                           const isBackground = typeLine.includes('background') && typeLine.includes('enchantment');
                           const canBeCommander = oracleText.includes('can be your commander') || oracleText.includes('puede ser tu comandante');
                           
                           // If it's already a commander, we must show the option to unset it
                           // Otherwise, it must be Legendary + (Creature or Background or specific Planeswalker)
                           if (activeInfoCard.is_commander || (isLegendary && (isCreature || isBackground || (isPlaneswalker && canBeCommander)))) {
                             return (
                               <button 
                                 onClick={() => {
                                    const newIsCommander = !activeInfoCard.is_commander;
                                    setActiveInfoCard(prev => prev ? {...prev, is_commander: newIsCommander} : null);
                                    onUpdateDeck?.({ card_in: {...activeInfoCard, is_commander: newIsCommander}, card_out: activeInfoCard.card_name });
                                 }}
                                 className="btn"
                                 style={{ 
                                   background: activeInfoCard.is_commander ? 'var(--color-gold)' : '#222', 
                                   color: activeInfoCard.is_commander ? '#000' : '#888',
                                   fontSize: '0.8rem', padding: '8px 12px', border: '1px solid #444',
                                   fontWeight: 'bold'
                                 }}
                               >
                                 {activeInfoCard.is_commander ? '👑 Comandante' : 'Set Commander'}
                               </button>
                             );
                           }
                           return null;
                        })()}
                    </div>
                 </div>
               )}
              
              <div style={{ 
                background: '#111', padding: '1.5rem', borderRadius: '16px', border: '1px solid #222',
                lineHeight: '1.6', fontSize: '1.1rem', color: '#E0E0E0', 
                flex: 1, overflowY: 'auto'
              }}>
                <div style={{ fontWeight: 'bold', color: 'var(--color-gold)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.8 }}>
                   <span>Oracle Text ({modalFace === 0 ? 'Front' : 'Back'})</span>
                </div>
                 <div style={{ whiteSpace: 'pre-wrap', color: '#fff', fontSize: '1.1rem', fontWeight: '500' }}>
                   {isLoadingInfo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.5 }}>
                       <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid #555', borderTopColor: 'var(--color-gold)', borderRadius: '50%' }}></div>
                       Cargando...
                     </div>
                   ) : (
                     renderSymbols((fullCardData?.card_faces && fullCardData.card_faces[modalFace]?.oracle_text) || (modalFace === 0 ? activeInfoCard.oracle_text : '') || 'No text found.')
                   )}
                 </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
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
      
      {showPlaytest && (
        <>
          <div 
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999 }}
            onClick={() => setShowPlaytest(false)}
          />
          <div className="playtest-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ color: 'var(--color-gold)' }}>Playtest Simulator</h2>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={mulligan} className="btn" style={{ background: '#444' }}>Mulligan</button>
                <button onClick={drawCard} className="btn" style={{ background: 'var(--color-blue)' }}>Draw Card</button>
                <button onClick={() => setShowPlaytest(false)} className="btn" style={{ background: '#dd3333' }}>Close</button>
              </div>
            </div>
            
            <div style={{ marginBottom: '1rem', color: '#888' }}>
              Library: {playtestLibrary.length} cards
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              {playtestHand.map((c, i) => (
                <div 
                  key={i} 
                  className="playtest-card"
                  onMouseEnter={e => startHoverTimer(c.card_name, c.image_url || '', e)}
                  onMouseLeave={stopHoverTimer}
                >
                  <img 
                    src={c.image_url || ''} 
                    alt={c.card_name} 
                    style={{ width: '140px', borderRadius: '8px', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }} 
                  />
                </div>
              ))}
            </div>
          </div>
        </>
      )}

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
        onConfirm={() => {
          if (cardToRemove) onUpdateDeck?.({ card_out: cardToRemove.card_name });
          setCardToRemove(null);
          setActiveInfoCard(null);
        }}
        onCancel={() => setCardToRemove(null)}
      />

      {renderVersionModal()}
    </div>
  );
}
