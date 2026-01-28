
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DeckCard } from '@/types';

interface PlaytestModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: DeckCard[];
  onPreview: (cardName: string, imageUrl: string, e: React.MouseEvent) => void;
  onStopPreview: () => void;
}

export default function PlaytestModal({ 
  isOpen, 
  onClose, 
  cards, 
  onPreview, 
  onStopPreview 
}: PlaytestModalProps) {
  const [deck, setDeck] = useState<DeckCard[]>([]);
  const [hand, setHand] = useState<DeckCard[]>([]);
  const [library, setLibrary] = useState<DeckCard[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      initializeGame();
    }
  }, [isOpen, cards]); // Re-init if opened or cards change (though cards usually don't change while open)

  const initializeGame = () => {
    const fullDeck: DeckCard[] = [];
    cards.forEach(c => {
      for (let i = 0; i < c.quantity; i++) fullDeck.push(c);
    });
    const shuffled = [...fullDeck].sort(() => Math.random() - 0.5);
    setDeck(fullDeck);
    setHand(shuffled.slice(0, 7));
    setLibrary(shuffled.slice(7));
  };

  const drawCard = () => {
    if (library.length > 0) {
      setHand([...hand, library[0]]);
      setLibrary(library.slice(1));
    }
  };

  const mulligan = () => {
    const shuffled = [...deck].sort(() => Math.random() - 0.5);
    setHand(shuffled.slice(0, 7));
    setLibrary(shuffled.slice(7));
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      <div 
        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999 }}
        onClick={onClose}
      />
      <div className="playtest-modal">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'var(--color-gold)' }}>Playtest Simulator</h2>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button onClick={mulligan} className="btn" style={{ background: '#444' }}>Mulligan</button>
            <button onClick={drawCard} className="btn" style={{ background: 'var(--color-blue)' }}>Draw Card</button>
            <button onClick={onClose} className="btn" style={{ background: '#dd3333' }}>Close</button>
          </div>
        </div>
        
        <div style={{ marginBottom: '1rem', color: '#888' }}>
          Library: {library.length} cards
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
          {hand.map((c, i) => (
            <div 
              key={i} 
              className="playtest-card"
              onMouseEnter={e => onPreview(c.card_name, c.image_url || '', e)}
              onMouseLeave={onStopPreview}
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
    </>,
    document.body
  );
}
