'use client';

import React, { useState, useEffect } from 'react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  deckName: string;
  commanderName?: string;
  isDeleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteModal({
  isOpen,
  deckName,
  commanderName,
  isDeleting = false,
  onClose,
  onConfirm
}: ConfirmDeleteModalProps) {
  const [confirmationInput, setConfirmationInput] = useState('');

  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const normalizedInput = confirmationInput.trim().toLowerCase();
  const normalizedTarget = deckName.trim().toLowerCase();
  const isMatch = normalizedInput === normalizedTarget || normalizedInput === 'eliminar';

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && isMatch && !isDeleting) {
      e.preventDefault();
      onConfirm();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.85)',
        zIndex: 11000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backdropFilter: 'blur(8px)',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#151515',
          padding: '2rem',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '520px',
          border: '1px solid rgba(255, 75, 75, 0.35)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.8), 0 0 30px rgba(255, 60, 60, 0.1)',
          animation: 'fadeInScale 0.2s ease-out'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'rgba(255, 68, 68, 0.15)',
              border: '1px solid rgba(255, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.25rem',
              color: 'var(--color-red, #ff4444)'
            }}
          >
            ⚠️
          </div>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: '1.3rem' }}>
              ¿Eliminar mazo?
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>
              Zona de peligro y protección de datos
            </span>
          </div>
        </div>

        {/* Deck preview box */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid #2a2a2a',
            borderRadius: '10px',
            padding: '1rem',
            marginBottom: '1.25rem'
          }}
        >
          <div style={{ fontWeight: 600, color: 'var(--color-gold, #d4af37)', fontSize: '1.05rem', marginBottom: '0.2rem' }}>
            {deckName}
          </div>
          {commanderName && (
            <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
              Comandante: <strong style={{ color: '#ddd' }}>{commanderName}</strong>
            </div>
          )}
        </div>

        {/* Informative alert */}
        <div
          style={{
            background: 'rgba(255, 165, 0, 0.08)',
            border: '1px solid rgba(255, 165, 0, 0.25)',
            borderRadius: '8px',
            padding: '0.85rem 1rem',
            fontSize: '0.85rem',
            color: '#ddd',
            lineHeight: '1.4',
            marginBottom: '1.5rem'
          }}
        >
          🛡️ <strong>Borrado seguro:</strong> El mazo se retirará de las listas públicas y torneos, pero 
          <strong> tus cartas y mejoras no se destruirán</strong>. Se enviará a tu papelera personal en tu perfil para que puedas recuperarlo en cualquier momento.
        </div>

        {/* Confirmation prompt */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label
            htmlFor="delete-confirm-input"
            style={{
              display: 'block',
              fontSize: '0.85rem',
              color: '#bbb',
              marginBottom: '0.6rem'
            }}
          >
            Escribe <strong style={{ color: '#fff', userSelect: 'all' }}>{deckName}</strong> o <strong style={{ color: 'var(--color-red, #ff4444)' }}>ELIMINAR</strong> para confirmar:
          </label>
          <input
            id="delete-confirm-input"
            type="text"
            value={confirmationInput}
            onChange={(e) => setConfirmationInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={deckName}
            autoFocus
            disabled={isDeleting}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              background: '#0d0d0d',
              border: `1px solid ${isMatch ? 'rgba(255, 68, 68, 0.6)' : '#333'}`,
              borderRadius: '8px',
              color: '#fff',
              fontSize: '0.95rem',
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s'
            }}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            style={{
              padding: '0.65rem 1.25rem',
              background: '#252525',
              border: '1px solid #444',
              borderRadius: '8px',
              color: '#ccc',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 500
            }}
            className="btn-hover-subtle"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!isMatch || isDeleting}
            style={{
              padding: '0.65rem 1.4rem',
              background: isMatch ? 'rgba(220, 38, 38, 0.9)' : 'rgba(100, 30, 30, 0.3)',
              border: `1px solid ${isMatch ? '#ef4444' : '#552222'}`,
              borderRadius: '8px',
              color: isMatch ? '#fff' : '#666',
              cursor: isMatch && !isDeleting ? 'pointer' : 'not-allowed',
              fontSize: '0.9rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s'
            }}
          >
            {isDeleting ? (
              <>
                <span className="spinner-small" style={{ width: '14px', height: '14px' }}></span>
                Archivando...
              </>
            ) : (
              'Confirmar y Archivar'
            )}
          </button>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.96);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
