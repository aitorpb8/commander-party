'use client'

import React, { useState, useEffect } from 'react';
import { searchCards, ScryfallCard } from '@/lib/scryfall';

interface CardSearchProps {
  onSelect: (card: ScryfallCard) => void;
}

export default function CardSearch({ onSelect }: CardSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Filter state
  const [colors, setColors] = useState<string[]>([]);
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [cmc, setCmc] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [hoveredCard, setHoveredCard] = useState<ScryfallCard | null>(null);

  const colorOptions = [
    { label: 'W', value: 'w' },
    { label: 'U', value: 'u' },
    { label: 'B', value: 'b' },
    { label: 'R', value: 'r' },
    { label: 'G', value: 'g' },
    { label: 'C', value: 'c' }
  ];

  const typeOptions = [
    'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Battle', 'Land'
  ];

  const rarityOptions = [
    { label: 'Común', value: 'c' },
    { label: 'Infrecuente', value: 'u' },
    { label: 'Rara', value: 'r' },
    { label: 'Mítica', value: 'm' }
  ];

  const cmcOptions = ['0', '1', '2', '3', '4', '5', '6', '7+'];

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.length > 2 || (query.length === 0 && (colors.length > 0 || type))) {
        setLoading(true);
        
        let finalQuery = query || '';
        if (colors.length > 0) {
          finalQuery += ` identity:${colors.join('')}`;
        }
        if (type) {
          finalQuery += ` type:${type}`;
        }
        if (rarity) {
          finalQuery += ` rarity:${rarity}`;
        }
        if (cmc) {
          if(cmc === '7+') {
            finalQuery += ` cmc>=7`;
          } else {
            finalQuery += ` cmc=${cmc}`;
          }
        }

        console.log(`Searching Scryfall for: ${finalQuery}`);
        const cards = await searchCards(finalQuery);
        setResults(cards.slice(0, 20));
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, colors, type, rarity, cmc]);

  const toggleColor = (c: string) => {
    setColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.5rem', alignItems: 'center' }}>
        <input
          type="text"
          placeholder={isMobile ? "Buscar carta..." : "Buscar carta en Scryfall..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '0.6rem 0.8rem',
            borderRadius: '8px',
            border: '1px solid #444',
            background: '#222',
            color: 'white',
            minWidth: '0'
          }}
        />
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-premium ${showFilters ? 'btn-premium-gold' : 'btn-premium-dark'}`}
          style={{
            margin: '0', 
            padding: '0.4rem', 
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
          title="Filtros"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
        </button>
      </div>

      {showFilters && (
        <div className="card" style={{ 
          marginBottom: '1rem', 
          padding: '1rem', 
          background: '#1a1a1a', 
          border: '1px solid #333',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.5rem',
          alignItems: 'flex-start'
        }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Colores (Identidad)</label>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              {colorOptions.map(c => (
                <button
                  key={c.value}
                  onClick={() => toggleColor(c.value)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #444',
                    background: colors.includes(c.value) ? 'var(--color-gold)' : '#111',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    boxShadow: colors.includes(c.value) ? '0 0 10px rgba(255, 215, 0, 0.5)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  <img 
                    src={`https://svgs.scryfall.io/card-symbols/${c.value.toUpperCase()}.svg`} 
                    alt={c.label} 
                    style={{ width: '18px', height: '18px', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))' }} 
                  />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tipo de Carta</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {typeOptions.map(t => (
                <button
                  key={t}
                  onClick={() => setType(type === t ? '' : t)}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid #444',
                    background: type === t ? 'var(--color-gold)' : '#111',
                    color: type === t ? 'black' : 'white',
                    fontSize: '0.8rem', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Rareza</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {rarityOptions.map(r => (
                <button
                  key={r.value}
                  onClick={() => setRarity(rarity === r.value ? '' : r.value)}
                  style={{
                    padding: '4px 10px', borderRadius: '6px', border: '1px solid #444',
                    background: rarity === r.value ? 'var(--color-gold)' : '#111',
                    color: rarity === r.value ? 'black' : 'white',
                    fontSize: '0.8rem', cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Coste Convertido de Maná</label>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {cmcOptions.map(c => (
                <button
                  key={c}
                  onClick={() => setCmc(cmc === c ? '' : c)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #444',
                    background: cmc === c ? 'var(--color-gold)' : '#111',
                    color: cmc === c ? 'black' : 'white',
                    fontSize: '0.85rem', fontWeight: 'bold', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s'
                  }}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {loading && <div style={{ marginBottom: '0.5rem', fontSize: '0.8rem', color: '#888' }}>Buscando...</div>}
      
      {results.length > 0 && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          background: '#1E1E1E',
          border: '1px solid #444',
          borderRadius: '8px',
          marginTop: '0.5rem',
          zIndex: 1000,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          {results.map(card => (
            <div
              key={card.id}
              onMouseEnter={() => setHoveredCard(card)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => {
                onSelect(card);
                setQuery('');
                setResults([]);
                setColors([]);
                setType('');
                setRarity('');
                setCmc('');
              }}
              style={{
                padding: '0.75rem',
                cursor: 'pointer',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
              className="search-result-item"
            >
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{card.name}</div>
                <div style={{ fontSize: '0.7rem', color: '#888' }}>
                  {card.type_line} • {card.set_name || card.set?.toUpperCase()}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>
                  {card.prices.eur ? `${card.prices.eur}€` : 'N/A'}
                </span>
                <button 
                  style={{ 
                    background: 'var(--color-gold)', 
                    border: 'none', 
                    borderRadius: '4px', 
                    color: 'black',
                    padding: '2px 10px',
                    fontWeight: 'bold',
                    fontSize: '1rem'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect(card);
                    setQuery('');
                    setResults([]);
                    setColors([]);
                    setType('');
                    setRarity('');
                    setCmc('');
                  }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Preview */}
      {hoveredCard && hoveredCard.image_uris && (
        <div style={{
          position: 'fixed',
          top: '50%',
          right: '50px',
          transform: 'translateY(-50%)',
          zIndex: 2000,
          pointerEvents: 'none',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <img 
            src={hoveredCard.image_uris.normal} 
            alt={hoveredCard.name} 
            style={{ 
              width: '280px', 
              borderRadius: '14px', 
              boxShadow: '0 0 40px rgba(0,0,0,0.9)',
              border: '2px solid #444'
            }}
          />
        </div>
      )}
    </div>
  );
}
