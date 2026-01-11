import React from 'react';

interface ConfirmationDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
}

export default function ConfirmationDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  isDestructive = false
}: ConfirmationDialogProps) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 2000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }} onClick={onCancel}>
      <div style={{
        background: '#1a1a1a', padding: '2rem', borderRadius: '12px',
        width: '90%', maxWidth: '400px', border: '1px solid #333',
        textAlign: 'center'
      }} onClick={e => e.stopPropagation()}>
        <h3 style={{ marginBottom: '1rem', color: isDestructive ? '#ff4444' : 'var(--color-gold)' }}>
          {title}
        </h3>
        <p style={{ marginBottom: '2rem', color: '#ccc' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            onClick={onCancel} 
            className="btn" 
            style={{ flex: 1, background: '#333' }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className="btn" 
            style={{ 
              flex: 1, 
              background: isDestructive ? '#4a0000' : 'var(--color-gold)',
              color: isDestructive ? '#ffaaaa' : '#000',
              border: isDestructive ? '1px solid #ff4444' : 'none'
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
