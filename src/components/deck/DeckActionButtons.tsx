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
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button 
          onClick={onCopyMejoras} 
          className="btn-premium btn-premium-dark" 
          style={{ flex: 1, fontSize: '0.75rem', padding: '0.6rem' }}
        >
          Copiar Mejoras
        </button>
        <button 
          onClick={onExportMazo} 
          className="btn-premium btn-premium-dark" 
          style={{ flex: 1, fontSize: '0.75rem', padding: '0.6rem' }}
        >
           Exportar Mazo
        </button>
      </div>
      {isOwner && hasArchidektId && (
        <button 
          onClick={onSyncArchidekt} 
          className="btn-premium btn-premium-dark" 
          style={{ 
            width: '100%', 
            fontSize: '0.75rem', 
            padding: '0.6rem',
            borderColor: 'rgba(212, 175, 55, 0.2)'
          }}
        >
          🔄 Sincronizar con Archidekt
        </button>
      )}
    </div>
  );
}
