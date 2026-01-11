'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabaseClient';

interface TagEditorProps {
  deckId: string;
  cardName: string;
  currentTags: string[];
  onClose: () => void;
  onSave: (tags: string[]) => void;
}

const PREDEFINED_TAGS = [
  'Ramp',
  'Draw',
  'Removal',
  'Board Wipe',
  'Win-Con',
  'Tutor',
  'Protection',
  'Utility',
  'Counterspell',
  'Recursion',
  'Sacrifice',
  'Token Generator'
];

export default function TagEditor({ deckId, cardName, currentTags, onClose, onSave }: TagEditorProps) {
  const [selectedTags, setSelectedTags] = useState<string[]>(currentTags);
  const [customTag, setCustomTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const addCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags([...selectedTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();

    try {
      // Upsert tags
      const { error } = await supabase
        .from('deck_card_tags')
        .upsert({
          deck_id: deckId,
          card_name: cardName,
          tags: selectedTags
        }, {
          onConflict: 'deck_id,card_name'
        });

      if (error) throw error;
      onSave(selectedTags);
      onClose();
    } catch (err) {
      console.error('Error saving tags:', err);
      alert('Error al guardar etiquetas');
    } finally {
      setSaving(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <>
      <div 
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.85)', 
          zIndex: 11000,
          backdropFilter: 'blur(4px)'
        }}
        onClick={onClose}
      />
      <div 
        style={{ 
          position: 'fixed', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-card)',
          padding: '2rem',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border-color)',
          zIndex: 11001,
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--color-gold)' }}>Etiquetar: {cardName}</h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.5rem' }}
          >×</button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Etiquetas Predefinidas
          </h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
            {PREDEFINED_TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '20px',
                  border: selectedTags.includes(tag) ? '2px solid var(--color-gold)' : '1px solid #444',
                  background: selectedTags.includes(tag) ? 'rgba(212, 175, 55, 0.2)' : '#222',
                  color: selectedTags.includes(tag) ? 'var(--color-gold)' : '#aaa',
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  transition: 'all 0.2s'
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Etiqueta Personalizada
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addCustomTag()}
              placeholder="Ej: Combo Piece"
              style={{
                flex: 1,
                padding: '0.5rem',
                background: '#111',
                border: '1px solid #444',
                color: 'white',
                borderRadius: '4px'
              }}
            />
            <button
              onClick={addCustomTag}
              className="btn"
              style={{ background: '#333', padding: '0.5rem 1rem' }}
            >
              +
            </button>
          </div>
        </div>

        {selectedTags.length > 0 && (
          <div style={{ marginBottom: '1.5rem' }}>
            <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
              Etiquetas Seleccionadas ({selectedTags.length})
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {selectedTags.map(tag => (
                <div
                  key={tag}
                  style={{
                    padding: '0.4rem 0.8rem',
                    borderRadius: '15px',
                    background: 'var(--color-gold)',
                    color: '#000',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {tag}
                  <button
                    onClick={() => toggleTag(tag)}
                    style={{ background: 'none', border: 'none', color: '#000', cursor: 'pointer', padding: 0 }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn btn-gold"
            style={{ flex: 1 }}
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            onClick={onClose}
            className="btn"
            style={{ flex: 1, background: '#333' }}
          >
            Cancelar
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
