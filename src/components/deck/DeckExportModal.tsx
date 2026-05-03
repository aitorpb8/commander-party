import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Deck, DeckCard, DeckUpgrade } from '@/types';
import { calculateDeckBracket, getDeckArchetype } from '@/lib/magicUtils';

interface DeckExportModalProps {
  deck: Deck;
  cards: DeckCard[];
  upgrades: DeckUpgrade[];
  onClose: () => void;
}

export default function DeckExportModal({ deck, cards, upgrades, onClose }: DeckExportModalProps) {
  const exportRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const bracket = calculateDeckBracket(cards);
  const archetype = getDeckArchetype(cards);
  const commander = cards.find(c => c.is_commander);

  const handleDownload = async () => {
    if (!exportRef.current) return;
    setExporting(true);
    try {
      const dataUrl = await toPng(exportRef.current, { 
        cacheBust: true,
        quality: 1,
        backgroundColor: '#0a0a0a'
      });
      const link = document.createElement('a');
      link.download = `deck-${deck.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Error al exportar imagen:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.9)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem', backdropFilter: 'blur(10px)'
    }}>
      <div style={{ maxWidth: '900px', width: '100%', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* PREVIEW CONTAINER (The one to be screenshotted) */}
        <div ref={exportRef} style={{
          background: '#0a0a0a',
          padding: '3rem',
          borderRadius: '4px', // Hard edges for pro look
          border: '1px solid rgba(212, 175, 55, 0.3)',
          color: '#fff',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'var(--font-title), serif',
          display: 'grid',
          gridTemplateColumns: '300px 1fr',
          gap: '3rem'
        }}>
          {/* BACKGROUND DECORATION */}
          <div style={{
            position: 'absolute', top: '-10%', right: '-10%', 
            width: '600px', height: '600px', 
            background: 'radial-gradient(circle, rgba(212, 175, 55, 0.05) 0%, transparent 70%)',
            zIndex: 0
          }} />

          {/* LEFT: COMMANDER IMAGE */}
          <div style={{ position: 'relative', zIndex: 1 }}>
            <img 
              src={commander?.image_url || deck.image_url || ''} 
              style={{ width: '100%', borderRadius: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)' }} 
              alt={deck.commander} 
            />
            <div style={{ marginTop: '2rem', textAlign: 'center' }}>
               <div style={{ fontSize: '2.5rem', color: 'var(--color-gold)', fontWeight: '900', letterSpacing: '-1px', lineHeight: '1' }}>
                 {bracket.label.split(' ')[1]}
               </div>
               <div style={{ fontSize: '0.8rem', color: '#666', textTransform: 'uppercase', letterSpacing: '4px' }}>
                 Power Level
               </div>
            </div>
          </div>

          {/* RIGHT: STATS & INFO */}
          <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div style={{ borderBottom: '2px solid var(--color-gold)', paddingBottom: '1rem', marginBottom: '2rem' }}>
              <div style={{ fontSize: '0.8rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '3px', marginBottom: '0.5rem' }}>
                Commander Party League
              </div>
              <h1 style={{ fontSize: '3rem', margin: 0, textTransform: 'uppercase', lineHeight: '1' }}>{deck.name}</h1>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
               <div>
                  <Stat label="Comandante" value={deck.commander} />
                  <Stat label="Arquetipo" value={archetype} />
                  <Stat label="Presupuesto Invertido" value={`${deck.budget_spent.toFixed(2)}€`} />
               </div>
               <div>
                  <Stat label="Total Mejoras" value={upgrades.length.toString()} />
                  <Stat label="Cartas en Mazo" value={cards.length.toString()} />
                  <Stat label="Bracket" value={bracket.sub} />
               </div>
            </div>

            <div style={{ marginTop: '3rem', padding: '1.5rem', background: 'rgba(212, 175, 55, 0.05)', borderRadius: '8px', border: '1px solid rgba(212, 175, 55, 0.1)' }}>
               <div style={{ fontSize: '0.7rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '1rem', fontWeight: 'bold' }}>
                 Game Changers Detectados
               </div>
               <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                 {bracket.restrictedCards.length > 0 ? (
                   bracket.restrictedCards.slice(0, 6).map(c => (
                     <span key={c.name} style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)' }}>
                       {c.name}
                     </span>
                   ))
                 ) : (
                   <span style={{ fontSize: '0.75rem', color: '#555' }}>Ninguno detectado</span>
                 )}
               </div>
            </div>

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', opacity: 0.3 }}>
               <img src="/logo.png" style={{ height: '30px' }} />
            </div>
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button 
            onClick={onClose} 
            className="btn-premium" 
            style={{ padding: '1rem 2rem', background: 'rgba(255,255,255,0.05)', color: '#888' }}
          >
            CANCELAR
          </button>
          <button 
            onClick={handleDownload} 
            disabled={exporting}
            className="btn-premium btn-premium-gold" 
            style={{ padding: '1rem 3rem', minWidth: '200px' }}
          >
            {exporting ? 'GENERANDO...' : 'DESCARGAR POSTER (PNG)'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string, value: string }) {
  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2px', fontWeight: '900' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#fff' }}>{value}</div>
    </div>
  );
}
