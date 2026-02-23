
import React, { useState, useEffect } from 'react';
import { ScryfallCard } from '@/types';
import { searchCards } from '@/lib/scryfall';

interface CardSearchProps {
  onAddCard: (card: ScryfallCard) => void;
  isSearchingPrice: boolean;
  onPreview: (cardName: string, imageUrl: string, e: React.MouseEvent) => void;
  onStopPreview: () => void;
}

export default function CardSearch({ 
  onAddCard, 
  isSearchingPrice, 
  onPreview, 
  onStopPreview 
}: CardSearchProps) {
  const [addQuery, setAddQuery] = useState('');
  const [addResults, setAddResults] = useState<ScryfallCard[]>([]);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [colors, setColors] = useState<string[]>([]);
  const [type, setType] = useState('');
  const [rarity, setRarity] = useState('');
  const [cmc, setCmc] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    // Set initial value
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const toggleColor = (c: string) => {
    setColors(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (addQuery.length > 2 || (addQuery.length === 0 && (colors.length > 0 || type || rarity))) {
        let finalQuery = addQuery || '';
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

        const res = await searchCards(finalQuery);
        if (!cancelled) {
          setAddResults(res.slice(0, 50));
        }
      } else {
        if (!cancelled) setAddResults([]);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addQuery, colors, type, rarity]);

  return (
    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
      <div style={{ background: '#111', padding: '0.4rem 0.6rem', borderRadius: '30px', border: '1px solid var(--color-gold)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span 
          onClick={() => {
            if (addResults.length > 0) {
              onAddCard(addResults[0]);
              setAddQuery('');
              setAddResults([]);
              setColors([]);
              setType('');
              setRarity('');
              setCmc('');
            }
          }}
          style={{ 
            paddingLeft: '0.4rem', color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '1.2rem',
            cursor: addResults.length > 0 ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          {isSearchingPrice ? <div className="spinner-small"></div> : '+'}
        </span>
        <div style={{ position: 'relative', flex: 1, display: 'flex' }}>
          <input 
            type="text" 
            placeholder={isMobile ? "Añadir carta..." : "Añadir carta (escribe nombre)..."} 
            value={addQuery}
            onChange={e => setAddQuery(e.target.value)}
            style={{ width: '100%', padding: '0.4rem', background: 'transparent', border: 'none', color: 'white', fontSize: '0.95rem', outline: 'none' }}
            disabled={isSearchingPrice}
          />
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-premium ${showFilters ? 'btn-premium-gold' : 'btn-premium-dark'}`}
            style={{ 
              margin: '0', 
              padding: '0.4rem', 
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            title="Filtros"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
            </svg>
          </button>
        </div>
      </div>

      {showFilters && (
        <div style={{ 
          marginTop: '0.5rem', 
          padding: '1rem', 
          background: '#1a1a1a', 
          border: '1px solid #333',
          borderRadius: '12px',
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

      <div style={{ position: 'relative', width: '100%' }}>
          {addResults.length > 0 && (
           <ul style={{ position: 'absolute', top: '140%', left: 0, right: 0, background: '#1a1a1a', border: '1px solid #444', zIndex: 2000, listStyle: 'none', padding: 0, margin: '0', borderRadius: '8px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', maxHeight: '600px', overflowY: 'auto' }}>
             {addResults.map(res => (
               <li 
                 key={res.name} 
                 onClick={() => {
                   onAddCard(res);
                   setAddQuery('');
                   setAddResults([]);
                   setColors([]);
                   setType('');
                   setRarity('');
                   setCmc('');
                 }}
                 onMouseEnter={(e) => {
                   onPreview(res.name, res.image_uris?.normal || '', e);
                 }}
                 onMouseLeave={onStopPreview}
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
  );
}
