'use client'

import React, { useEffect, useState } from 'react';
import { getCardPrints, ScryfallCard } from '@/lib/scryfall';

interface CommanderPickerProps {
  commanderName: string;
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
}

export default function CommanderPicker({ commanderName, onSelect, onClose }: CommanderPickerProps) {
  const [prints, setPrints] = useState<ScryfallCard[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrints = async () => {
      const data = await getCardPrints(commanderName);
      setPrints(data);
      setLoading(false);
    };
    fetchPrints();
  }, [commanderName]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 3000,
      backdropFilter: 'blur(5px)'
    }}>
      <div className="card" style={{ width: '90%', maxWidth: '800px', maxHeight: '80vh', overflowY: 'auto', background: '#1a1a1a', border: '1px solid var(--color-gold)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'var(--color-gold)' }}>Elegir Arte para {commanderName}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.5rem' }}>&times;</button>
        </div>

        {loading ? (
          <p>Buscando versiones...</p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1rem' }}>
            {prints.map((print) => (
              <div 
                key={print.id} 
                onClick={() => print.image_uris && onSelect(print.image_uris.normal)}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                {print.image_uris && (
                  <img 
                    src={print.image_uris.normal} 
                    alt={print.set_name || print.set} 
                    style={{ width: '100%', borderRadius: '8px', border: '2px solid transparent' }}
                  />
                )}
                <p style={{ fontSize: '0.7rem', textAlign: 'center', marginTop: '0.4rem', color: '#aaa' }}>
                  {print.set_name || print.set.toUpperCase()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
