import React, { useMemo } from 'react';
import PremiumDropdown from '@/components/ui/PremiumDropdown';
import { DeckCard } from '@/types';


export interface AdvancedFilters {
  type: string;
  text: string;
  edition: string;
  colors: string[]; // W, U, B, R, G, C, M
  cmc: [number, number];
}

interface DeckFilterPanelProps {
  cards: DeckCard[];
  filters: AdvancedFilters;
  onChange: (newFilters: AdvancedFilters) => void;
  onClose: () => void;
  onSyncMetadata?: () => void;
  onFixMetadata?: () => void;
}

export default function DeckFilterPanel({ cards, filters, onChange, onClose, onSyncMetadata, onFixMetadata }: DeckFilterPanelProps) {

  // Extract unique sets from cards
  const availableSets = useMemo(() => {
    const sets = new Map<string, string>();
    cards.forEach(c => {
      if (c.set_code && c.set_name) {
        sets.set(c.set_code, c.set_name);
      }
    });
    return Array.from(sets.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [cards]);

  const toggleColor = (color: string) => {
    const newColors = filters.colors.includes(color)
      ? filters.colors.filter(c => c !== color)
      : [...filters.colors, color];
    onChange({ ...filters, colors: newColors });
  };

  const handleClear = () => {
    onChange({
      type: '',
      text: '',
      edition: '',
      colors: [],
      cmc: [0, 20]
    });
  };

  return (
    <div style={{
      position: 'absolute',
      top: '60px',
      right: '0',
      width: '320px',
      background: 'rgba(21, 21, 21, 0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid #333',
      borderRadius: '16px',
      padding: '1.5rem',
      zIndex: 100,
      boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--color-gold)', fontFamily: 'var(--font-title)', letterSpacing: '1px' }}>Filtros Avanzados</h3>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', fontSize: '1.5rem', lineHeight: 1 }}>×</button>
      </div>

      {/* TYPE */}
      <div style={{ marginBottom: '1.2rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Tipo / Subtipo</label>
        <input 
          type="text" 
          placeholder="Ej. Criatura, Elfo..." 
          value={filters.type}
          onChange={(e) => onChange({ ...filters, type: e.target.value })}
          style={{ 
              width: '100%', padding: '0.8rem 1rem', 
              background: '#0a0a0a', border: '1px solid #333', 
              borderRadius: '8px', color: '#fff', fontSize: '0.9rem',
              transition: 'border-color 0.2s'
          }}
          className="focus-gold"
        />
      </div>

      {/* TEXT */}
      <div style={{ marginBottom: '1.2rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Texto (Oráculo)</label>
        <input 
          type="text" 
          placeholder="Ej. Robar carta, Destruir..." 
          value={filters.text}
          onChange={(e) => onChange({ ...filters, text: e.target.value })}
          style={{ 
              width: '100%', padding: '0.8rem 1rem', 
              background: '#0a0a0a', border: '1px solid #333', 
              borderRadius: '8px', color: '#fff', fontSize: '0.9rem' 
          }}
        />
      </div>

      {/* EDITION */}
      <div style={{ marginBottom: '1.2rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Edición / Set</label>
        
        <PremiumDropdown 
            value={filters.edition}
            options={[
                { value: '', label: 'Todas las ediciones' },
                ...availableSets.map(([code, name]) => ({
                    value: code,
                    label: `${name} (${code.toUpperCase()})`
                }))
            ]}
            onChange={(v) => onChange({ ...filters, edition: v })}
            width="100%"
        />
         {availableSets.length === 0 && onSyncMetadata && (
            <button 
                onClick={onSyncMetadata}
                style={{ 
                    marginTop: '8px', 
                    background: 'rgba(212, 175, 55, 0.1)', 
                    border: '1px solid var(--color-gold)', 
                    color: 'var(--color-gold)', 
                    padding: '8px 12px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    width: '100%',
                    borderRadius: '6px',
                    fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
            >
                🔄 Sincronizar Ediciones
            </button>
         )}
         
         {onFixMetadata && (
            <button 
                onClick={onFixMetadata}
                style={{ 
                    marginTop: '8px', 
                    background: 'rgba(212, 175, 55, 0.1)', 
                    border: '1px solid var(--color-gold)', 
                    color: 'var(--color-gold)', 
                    padding: '8px 12px', 
                    fontSize: '0.75rem', 
                    cursor: 'pointer',
                    width: '100%',
                    borderRadius: '6px',
                    fontWeight: 600,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                }}
            >
                🛠️ Restaurar Tierras (Fix)
            </button>
          )}
      </div>

      {/* COLORS */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 'bold', color: '#666', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Colores</label>
        <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {['W', 'U', 'B', 'R', 'G', 'C'].map(c => {
             const isActive = filters.colors.includes(c);
             // Use proper Scryfall SVG symbols
             // W, U, B, R, G, C
             const symbolUrl = `https://svgs.scryfall.io/card-symbols/${c}.svg`;
             
             return (
               <button
                 key={c}
                 onClick={() => toggleColor(c)}
                 title={c === 'C' ? 'Incoloro' : `Color ${c}`}
                 style={{
                   width: '38px', height: '38px', borderRadius: '50%',
                   background: isActive ? '#000' : '#222',
                   border: isActive ? '2px solid var(--color-gold)' : '2px solid #444',
                   cursor: 'pointer',
                   display: 'flex', alignItems: 'center', justifyContent: 'center',
                   transition: 'all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1)',
                   transform: isActive ? 'scale(1.15)' : 'scale(1)',
                   boxShadow: isActive ? '0 0 10px rgba(212, 175, 55, 0.5), inset 0 0 5px rgba(212, 175, 55, 0.2)' : 'none',
                   padding: 0
                 }}
               >
                 <img 
                    src={symbolUrl} 
                    alt={c} 
                    style={{ 
                        width: '24px', 
                        height: '24px', 
                        filter: isActive ? 'drop-shadow(0 0 4px rgba(255, 215, 0, 0.5))' : 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' 
                    }} 
                 />
               </button>
             );
          })}
        </div>
      </div>

      {/* ACTIONS */}
      <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.5rem' }}>
        <button 
          onClick={handleClear}
          className="btn" 
          style={{ flex: 1, background: '#222', color: '#888', fontSize: '0.9rem', border: '1px solid #333' }}
        >
          Limpiar
        </button>
        <button 
          onClick={onClose}
          className="btn btn-gold" 
          style={{ flex: 1, fontSize: '0.9rem', boxShadow: '0 4px 12px rgba(212, 175, 55, 0.2)' }}
        >
          Ver Resultados
        </button>
      </div>

    </div>
  );
}
