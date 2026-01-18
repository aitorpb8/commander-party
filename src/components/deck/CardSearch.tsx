
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

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      if (addQuery.length > 2) {
        const res = await searchCards(addQuery);
        if (!cancelled) {
          setAddResults(res.slice(0, 10));
        }
      } else {
        if (!cancelled) setAddResults([]);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [addQuery]);

  return (
    <div style={{ marginBottom: '1.5rem', background: '#111', padding: '0.8rem', borderRadius: '30px', border: '1px solid var(--color-gold)', display: 'flex', alignItems: 'center', gap: '1rem' }}>
       <span 
         onClick={() => {
           if (addResults.length > 0) {
             onAddCard(addResults[0]);
             setAddQuery('');
             setAddResults([]);
           }
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
                 onClick={() => {
                   onAddCard(res);
                   setAddQuery('');
                   setAddResults([]);
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
