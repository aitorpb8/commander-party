import React from 'react';

interface DeckActionButtonsProps {
  isOwner: boolean;
  hasArchidektId: boolean;
  onCopyMejoras: () => void;
  onExportMazo: () => void;
  onSyncArchidekt: () => void;
}

export default function DeckActionButtons({
  isOwner,
  hasArchidektId,
  onCopyMejoras,
  onExportMazo,
  onSyncArchidekt,
}: DeckActionButtonsProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button 
          onClick={onCopyMejoras} 
          className="btn" 
          style={{ flex: 1, background: '#333', fontSize: '0.8rem', padding: '0.6rem' }}
        >
          Copiar Mejoras
        </button>
        <button 
          onClick={onExportMazo} 
          className="btn" 
          style={{ flex: 1, background: '#333', fontSize: '0.8rem', padding: '0.6rem' }}
        >
           Exportar Mazo
        </button>
      </div>
      {isOwner && hasArchidektId && (
        <button 
          onClick={onSyncArchidekt} 
          className="btn" 
          style={{ 
            width: '100%', 
            background: 'rgba(255, 255, 255, 0.05)', 
            fontSize: '0.8rem', 
            border: '1px solid #333',
            padding: '0.6rem'
          }}
        >
          🔄 Sincronizar con Archidekt
        </button>
      )}
    </div>
  );
}
