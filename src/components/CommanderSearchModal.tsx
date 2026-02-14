import React, { useState, useEffect } from 'react';
import { ScryfallCard } from '@/lib/scryfall';
import { createClient } from '@/lib/supabaseClient';
import toast from 'react-hot-toast';

interface CommanderSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (card: ScryfallCard) => void;
}

export default function CommanderSearchModal({ isOpen, onClose, onSelect }: CommanderSearchModalProps) {
  // We no longer need tabs, just the list of decks
  const [decks, setDecks] = useState<any[]>([]);
  const [loadingDecks, setLoadingDecks] = useState(false);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (isOpen) {
      fetchDecks();
    }
  }, [isOpen]);

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
     const fakeCard = {
         id: deck.id,
         name: deck.commander,
         set: 'deck',
         prices: {},
         color_identity: [],
         image_uris: {
             normal: deck.image_url,
             art_crop: deck.image_url
         },
         type_line: 'Legendary Creature'
     };
     
     onSelect(fakeCard as unknown as ScryfallCard);
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)'
    }} onClick={onClose}>
      <div style={{
        background: '#151515', padding: '2rem', borderRadius: '16px',
        width: '95%', maxWidth: '1200px', maxHeight: '85vh', 
        border: '1px solid rgba(212, 175, 55, 0.3)',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 40px rgba(0,0,0,0.6)'
      }} onClick={e => e.stopPropagation()}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ margin: 0, color: 'var(--color-gold)', fontFamily: 'var(--font-title)', fontSize: '2.5rem' }}>
                Seleccionar Deck
            </h2>
            <button 
                onClick={onClose}
                className="btn-premium btn-premium-dark btn-premium-sm"
            >
                ✕
            </button>
        </div>
        
        <div style={{ 
            flex: 1, 
            overflowY: 'auto', 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
            gap: '1.5rem',
            paddingRight: '0.5rem'
        }}>
            {loadingDecks && (
                <div style={{ color: '#888', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                    <div className="spinner-small" style={{ marginRight: '10px' }}></div>
                    Cargando mazos...
                </div>
            )}
            
            {!loadingDecks && decks.map(deck => (
                <div 
                    key={deck.id}
                    onClick={() => handleDeckSelect(deck)}
                    style={{ 
                        cursor: 'pointer', background: 'rgba(255,255,255,0.03)', 
                        borderRadius: '12px', overflow: 'hidden',
                        border: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        minHeight: '150px'
                    }}
                    className="deck-select-item-premium"
                >
                    <div style={{ width: '150px', height: '150px', flexShrink: 0 }}>
                        <img 
                            src={deck.image_url || 'https://via.placeholder.com/150'} 
                            style={{ width: '100%' }} 
                            alt={deck.commander}
                        />
                    </div>
                    <div style={{ padding: '1.25rem 1.5rem', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minWidth: 0 }}>
                        <div style={{ 
                            fontWeight: 'bold', 
                            fontSize: '1.4rem', 
                            color: '#fff',
                            marginBottom: '8px',
                            lineHeight: '1.3',
                            overflowWrap: 'break-word'
                        }}>
                            {deck.name}
                        </div>
                        <div style={{ 
                            fontSize: '1.15rem', 
                            color: 'var(--color-gold)',
                            marginBottom: '8px',
                            lineHeight: '1.3',
                            overflowWrap: 'break-word'
                        }}>
                            {deck.commander}
                        </div>
                        <div style={{ fontSize: '0.95rem', color: '#888' }}>
                            de {deck.profiles?.username || 'Anónimo'}
                        </div>
                    </div>
                    
                    {/* Hover Effect Layer handled by CSS class below or global */}
                </div>
            ))}

            {!loadingDecks && decks.length === 0 && (
                 <div style={{ color: '#666', gridColumn: '1/-1', textAlign: 'center', padding: '3rem' }}>
                    No hay mazos registrados aún.
                </div>
            )}
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
                onClick={onClose}
                className="btn-premium btn-premium-dark"
                style={{ minWidth: '120px' }}
            >
                Cancelar
            </button>
        </div>

        <style jsx>{`
            .deck-select-item-premium:hover {
                background: rgba(255,255,255,0.08);
                border-color: var(--color-gold);
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(0,0,0,0.4);
            }
            .deck-select-item-premium:active {
                transform: translateY(0);
            }
        `}</style>
      </div>
    </div>
  );
}
