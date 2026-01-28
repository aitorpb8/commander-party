import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 20000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
      animation: 'fadeIn 0.2s ease-out'
    }} onClick={onCancel}>
      <div style={{
        background: '#1a1a1a', padding: '2.5rem', borderRadius: '24px',
        width: '90%', maxWidth: '420px', border: '1px solid #333',
        textAlign: 'center', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative', overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        {/* Decorative background gradient */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '4px',
          background: isDestructive 
            ? 'linear-gradient(90deg, #ff4444, #880000)' 
            : 'linear-gradient(90deg, var(--color-gold), #8a6d3b)'
        }} />

        <div style={{ 
          fontSize: '3rem', marginBottom: '1.5rem', 
          display: 'inline-block',
          animation: 'bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        }}>
          {isDestructive ? '⚠️' : '❓'}
        </div>

        <h3 style={{ 
          marginBottom: '1rem', 
          fontSize: '1.5rem',
          fontWeight: '800',
          color: isDestructive ? '#ff4444' : 'var(--color-gold)',
          letterSpacing: '-0.02em'
        }}>
          {title}
        </h3>
        <p style={{ marginBottom: '2.5rem', color: '#aaa', lineHeight: '1.6', fontSize: '1rem' }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: '1rem' }}>
          {cancelText && (
            <button 
              onClick={onCancel} 
              className="btn" 
              style={{ 
                flex: 1, 
                background: '#222', 
                border: '1px solid #444', 
                color: '#888',
                borderRadius: '12px',
                padding: '0.8rem',
                fontWeight: '600',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = '#333';
                e.currentTarget.style.color = '#fff';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#222';
                e.currentTarget.style.color = '#888';
              }}
            >
              {cancelText}
            </button>
          )}
          <button 
            onClick={onConfirm} 
            className="btn" 
            style={{ 
              flex: 1, 
              background: isDestructive ? '#ff4444' : 'var(--color-gold)',
              color: isDestructive ? '#fff' : '#000',
              border: 'none',
              borderRadius: '12px',
              padding: '0.8rem',
              fontWeight: '800',
              boxShadow: isDestructive ? '0 10px 20px -5px rgba(255, 68, 68, 0.4)' : '0 10px 20px -5px rgba(212, 175, 55, 0.4)',
              transition: 'transform 0.2s, background 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
          >
            {confirmText}
          </button>
        </div>
      </div>
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>,
    document.body
  );
}
