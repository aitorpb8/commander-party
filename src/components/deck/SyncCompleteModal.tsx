import React from 'react';

interface SyncCompleteModalProps {
  count: number;
  onClose: () => void;
}

export default function SyncCompleteModal({ count, onClose }: SyncCompleteModalProps) {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(5px)'
    }}>
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #333',
        borderRadius: '16px',
        padding: '2rem',
        width: '90%',
        maxWidth: '400px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.9), 0 0 0 1px rgba(212, 175, 55, 0.2)',
        animation: 'fadeIn 0.3s ease-out'
      }}>
        <div style={{ 
            fontSize: '3rem', 
            marginBottom: '1rem',
            filter: 'drop-shadow(0 0 20px rgba(212, 175, 55, 0.4))'
        }}>
            ✨
        </div>
        <h2 style={{ 
            color: 'var(--color-gold)', 
            marginBottom: '1rem', 
            fontFamily: 'var(--font-title)',
            fontSize: '1.8rem'
        }}>
            Sincronización Completada
        </h2>
        <p style={{ color: '#ccc', marginBottom: '2rem', lineHeight: '1.6' }}>
            Se han actualizado los metadatos de <strong style={{ color: '#fff' }}>{count}</strong> cartas correctamente.
            <br />
            <span style={{ fontSize: '0.9rem', color: '#888' }}>Ya puedes usar los filtros de edición.</span>
        </p>
        <button 
            onClick={onClose}
            style={{
                background: 'linear-gradient(135deg, var(--color-gold), #b8860b)',
                border: 'none',
                color: '#121212',
                padding: '0.8rem 2rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                transition: 'transform 0.2s',
                width: '100%'
            }}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
        >
            ¡Genial!
        </button>
      </div>
    </div>
  );
}
