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
    'Creature', 'Instant', 'Sorcery', 'Enchantment', 'Artifact', 'Planeswalker', 'Land'
  ];

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

        console.log(`Searching Scryfall for: ${finalQuery}`);
        const cards = await searchCards(finalQuery);
        setResults(cards.slice(0, 20));
        setLoading(false);
      } else {
        setResults([]);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query, colors, type]);

  const toggleColor = (c: string) => {
    setColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <input
          type="text"
          placeholder="Buscar carta en Scryfall..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid #444',
            background: '#222',
            color: 'white'
          }}
        />
        <button 
          onClick={() => setShowFilters(!showFilters)}
          className="btn"
          style={{ padding: '0.5rem 1rem', background: showFilters ? 'var(--color-gold)' : '#333', color: showFilters ? 'black' : 'white' }}
        >
          {showFilters ? 'Filtros ▲' : 'Filtros ▼'}
        </button>
      </div>

      {showFilters && (
        <div className="card" style={{ marginBottom: '1rem', padding: '1rem', background: '#1a1a1a', border: '1px solid #333' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Colores (Identidad)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {colorOptions.map(c => (
                <button
                  key={c.value}
                  onClick={() => toggleColor(c.value)}
                  style={{
                    width: '32px', height: '32px', borderRadius: '50%', border: '1px solid #444',
                    background: colors.includes(c.value) ? 'var(--color-gold)' : '#111',
                    color: colors.includes(c.value) ? 'black' : 'white',
                    fontWeight: 'bold', cursor: 'pointer'
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Tipo de Carta</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {typeOptions.map(t => (
                <button
                  key={t}
                  onClick={() => setType(type === t ? '' : t)}
                  style={{
                    padding: '4px 10px', borderRadius: '4px', border: '1px solid #444',
                    background: type === t ? 'var(--color-gold)' : '#111',
                    color: type === t ? 'black' : 'white',
                    fontSize: '0.75rem', cursor: 'pointer'
                  }}
                >
                  {t}
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
