
import React from 'react';
import { createPortal } from 'react-dom';
import { ScryfallCard, DeckCard } from '@/types';

interface VersionPickerModalProps {
  editingVersion: DeckCard | null;
  onClose: () => void;
  prints: ScryfallCard[];
  loadingPrints: boolean;
  versionFilter: string;
  setVersionFilter: (val: string) => void;
  onSelectVersion: (card: ScryfallCard) => void;
}

export default function VersionPickerModal({
  editingVersion,
  onClose,
  prints,
  loadingPrints,
  versionFilter,
  setVersionFilter,
  onSelectVersion
}: VersionPickerModalProps) {
  if (!editingVersion) return null;

  return createPortal(
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        background: 'rgba(0,0,0,0.85)', zIndex: 30000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(10px)'
      }} onClick={onClose}>
        <div 
          className="card" 
          style={{ 
            maxWidth: '800px', width: '100%', maxHeight: '85vh', 
            display: 'flex', flexDirection: 'column', 
            padding: '3rem', border: '1px solid #444', 
            boxShadow: '0 25px 50px rgba(0,0,0,0.9)',
            background: '#121212', borderRadius: '24px'
          }}
          onClick={e => e.stopPropagation()}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ margin: 0, color: 'var(--color-gold)', fontSize: '1.5rem' }}>Cambiar Edición</h3>
              <p style={{ margin: '4px 0 0', fontSize: '1rem', color: '#888' }}>{editingVersion.card_name}</p>
            </div>
            <button onClick={onClose} className="modal-close-btn" style={{ position: 'relative', top: 0, right: 0 }}>&times;</button>
          </div>

          {!loadingPrints && (
            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                type="text"
                placeholder="🔍 Filtrar por set (ej: Zendikar, SLD...)"
                value={versionFilter}
                onChange={e => setVersionFilter(e.target.value)}
                style={{ 
                  width: '100%', padding: '1rem', 
                  background: '#000', border: '1px solid #333', 
                  color: '#fff', borderRadius: '12px', fontSize: '1rem' 
                }}
              />
            </div>
          )}

          {loadingPrints ? (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
              <div className="spinner"></div>
              <p style={{ marginTop: '1.5rem', color: '#888', fontSize: '1.1rem' }}>Buscando ediciones...</p>
            </div>
          ) : (
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: '1rem', marginRight: '0.5rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                {prints
                  .filter(p => 
                    (p.set_name?.toLowerCase().includes(versionFilter.toLowerCase())) || 
                    (p.set?.toLowerCase().includes(versionFilter.toLowerCase()))
                  )
                  .map(p => (
                  <div 
                    key={p.id}
                    onClick={() => onSelectVersion(p)}
                    style={{ 
                      cursor: 'pointer', padding: '10px', borderRadius: '12px',
                      background: '#1a1a1a', border: '1px solid #333',
                      transition: 'all 0.2s', textAlign: 'center'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#252525';
                      e.currentTarget.style.borderColor = 'var(--color-gold)';
                      e.currentTarget.style.transform = 'translateY(-5px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#1a1a1a';
                      e.currentTarget.style.borderColor = '#333';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <img src={p.image_uris?.small || p.card_faces?.[0]?.image_uris?.small} alt={p.set_name} style={{ width: '100%', borderRadius: '8px', marginBottom: '10px' }} />
                    <div style={{ fontSize: '0.75rem', fontWeight: 'bold', height: '2.5em', overflow: 'hidden', color: '#aaa', margin: '4px 0' }}>{p.set_name}</div>
                    <div style={{ color: 'var(--color-gold)', fontWeight: 'bold', fontSize: '1rem' }}>{p.prices?.eur ? `${p.prices.eur}€` : 'N/A'}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>,
      document.body
    );
}
