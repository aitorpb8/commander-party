import React, { useState, useEffect } from 'react';
import { searchCards, ScryfallCard } from '@/lib/scryfall';
import { createClient } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

interface CommanderSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (card: ScryfallCard) => void;
}

export default function CommanderSearchModal({ isOpen, onClose, onSelect }: CommanderSearchModalProps) {
  const [activeTab, setActiveTab] = useState<'search' | 'decks'>('search');
  
  // Search State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ScryfallCard[]>([]);
  const [searching, setSearching] = useState(false);

  // Decks State
  const [decks, setDecks] = useState<any[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (activeTab === 'search' && query.length >= 3) {
        setSearching(true);
        try {
            const cards = await searchCards(query);
            setResults(cards || []);
        } catch (error) {
            console.error(error);
        } finally {
            setSearching(false);
        }
      } else {
        if (activeTab === 'search') setResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [query, activeTab]);

  useEffect(() => {
    if (activeTab === 'decks' && decks.length === 0) {
      fetchDecks();
    }
  }, [activeTab]);

  const fetchDecks = async () => {
    setLoadingDecks(true);
    const { data, error } = await supabase
      .from('decks')
      .select('*, profiles:user_id(username)')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error(error);
      toast.error('Error cargando mazos');
    } else {
      setDecks(data || []);
    }
    setLoadingDecks(false);
  };

  const handleDeckSelect = (deck: any) => {
     // Create a "Fake" ScryfallCard object that satisfies the page's requirements
     // The page mainly uses: name, image_uris.normal / image_uris.art_crop
     const fakeCard = {
         id: deck.id, // Use deck ID as card ID (harmless for this context)
         name: deck.commander,
         set: 'deck',
         prices: {},
         color_identity: [],
         image_uris: {
             normal: deck.image_url,
             art_crop: deck.image_url
         },
         type_line: 'Legendary Creature' // Dummy
     };
     
     onSelect(fakeCard as unknown as ScryfallCard);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }} onClick={onClose}>
      <div style={{
        background: '#1a1a1a', padding: '2rem', borderRadius: '12px',
        width: '90%', maxWidth: '600px', maxHeight: '80vh', border: '1px solid var(--color-gold)',
        display: 'flex', flexDirection: 'column'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: '1rem', color: 'var(--color-gold)' }}>Asignar Comandante</h3>
        
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', borderBottom: '1px solid #333' }}>
            <button 
                onClick={() => setActiveTab('search')}
                style={{
                    padding: '0.5rem 1rem', background: 'none', border: 'none',
                    borderBottom: activeTab === 'search' ? '2px solid var(--color-gold)' : '2px solid transparent',
                    color: activeTab === 'search' ? 'var(--color-gold)' : '#666',
                    cursor: 'pointer', fontWeight: 'bold'
                }}
            >
                Buscar Carta
            </button>
            <button 
                onClick={() => setActiveTab('decks')}
                style={{
                    padding: '0.5rem 1rem', background: 'none', border: 'none',
                    borderBottom: activeTab === 'decks' ? '2px solid var(--color-gold)' : '2px solid transparent',
                    color: activeTab === 'decks' ? 'var(--color-gold)' : '#666',
                    cursor: 'pointer', fontWeight: 'bold'
                }}
            >
                Mazos Registrados
            </button>
        </div>

        {/* Content Search */}
        {activeTab === 'search' && (
            <>
                <input 
                    type="text" 
                    placeholder="Buscar carta (ej. Sol Ring... es broma, que sea legendaria)"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    autoFocus
                    style={{ 
                        width: '100%', padding: '1rem', background: '#222', 
                        border: '1px solid #444', color: '#fff', borderRadius: '8px',
                        marginBottom: '1rem', fontSize: '1rem'
                    }}
                />

                <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '1rem' }}>
                    {searching && <div style={{ color: '#888', gridColumn: '1/-1', textAlign: 'center' }}>Buscando en el multiverso...</div>}
                    
                    {!searching && results.map(card => {
                        const img = (card.image_uris as any)?.normal || (card.image_uris as any)?.art_crop;
                        if (!img) return null;
                        return (
                            <div 
                                key={card.id} 
                                onClick={() => onSelect(card)}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s', position: 'relative' }}
                                className="card-hover"
                            >
                                <img src={img} style={{ width: '100%', borderRadius: '8px' }} alt={card.name} />
                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', textAlign: 'center', color: '#ccc' }}>
                                    {card.name}
                                </div>
                            </div>
                        );
                    })}
                    
                    {!searching && query.length >= 3 && results.length === 0 && (
                        <div style={{ color: '#666', gridColumn: '1/-1', textAlign: 'center' }}>
                            No se encontraron cartas.
                        </div>
                    )}
                </div>
            </>
        )}

        {/* Content Decks */}
        {activeTab === 'decks' && (
            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {loadingDecks && <div style={{ color: '#888', gridColumn: '1/-1', textAlign: 'center' }}>Cargando mazos...</div>}
                
                {!loadingDecks && decks.map(deck => (
                    <div 
                        key={deck.id}
                        onClick={() => handleDeckSelect(deck)}
                        style={{ 
                            cursor: 'pointer', background: '#222', 
                            borderRadius: '8px', overflow: 'hidden',
                            border: '1px solid #333',
                            display: 'flex',
                            transition: 'all 0.2s'
                        }}
                        className="deck-select-item"
                    >
                    <div style={{ width: '110px', flexShrink: 0, borderRight: '1px solid #333' }}>
                        <img 
                            src={deck.image_url || 'https://via.placeholder.com/110x80'} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                        />
                    </div>
                        <div style={{ padding: '0.8rem', flex: 1 }}>
                            <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.3rem', color: '#fff' }}>
                                {deck.name}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--color-gold)' }}>
                                {deck.commander}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.3rem' }}>
                                de {deck.profiles?.username || 'Anónimo'}
                            </div>
                        </div>
                    </div>
                ))}

                {!loadingDecks && decks.length === 0 && (
                     <div style={{ color: '#666', gridColumn: '1/-1', textAlign: 'center' }}>
                        No hay mazos registrados aún.
                    </div>
                )}
            </div>
        )}

        <button 
            onClick={onClose}
            className="btn"
            style={{ marginTop: '1rem', background: '#333' }}
        >
            Cancelar
        </button>
      </div>
    </div>
  );
}
