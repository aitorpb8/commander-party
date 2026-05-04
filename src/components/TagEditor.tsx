'use client'

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { createClient } from '@/lib/supabaseClient';
import { Z_INDEX_MODAL } from '@/lib/constants';

interface TagEditorProps {
  deckId: string;
  cardName: string;
  currentTags: string[];
  onClose: () => void;
  onSave: (tags: string[]) => void;
}

const TAG_CATEGORIES: Record<string, string[]> = {
  'Mana & Acceleration': ['Ramp', 'Mana Rock', 'Mana Dork', 'Land Ramp', 'Ritual', 'Cost Reduction', 'Mana Fix', 'Treasures'],
  'Draw & Advantage': ['Draw', 'Card Advantage', 'Loot / Rummage', 'Impulse Draw', 'Tutor', 'Fetch'],
  'Interaction': ['Removal', 'Board Wipe', 'Asymmetric Wipe', 'Counterspell', 'Bounce', 'Exile', 'Art/Ench Hate', 'Graveyard Hate', 'Discard'],
  'Protection': ['Protection', 'Hexproof / Shroud', 'Indestructible', 'Fog', 'Lifegain', 'Pillowfort'],
  'Mechanics': ['Token Generator', 'Sacrifice', 'Recursion', 'Blink / Flicker', '+1/+1 Counters', '-1/-1 Counters', 'Proliferate', 'Burn', 'Mill', 'Infect / Toxic', 'Auras / Equipment', 'Clone', 'Theft / Steal'],
  'Archetypes': ['Tribal / Typal', 'Enchantress', 'Spellslinger', 'Landfall', 'Group Hug', 'Group Slug', 'Chaos', 'Vehicles', 'Mutate', 'Cascade / Discover', 'Exile Matters', 'Energy'],
  'Strategy & Role': ['Win-Con', 'Combo Piece', 'Enabler', 'Payoff', 'ETB / Death Trigger', 'Stax', 'Hatebear', 'Goad', 'Evasion', 'Extra Turns', 'Free Spell']
};

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
      alert('Error saving tags');
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
          zIndex: Z_INDEX_MODAL,
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
          zIndex: Z_INDEX_MODAL + 1,
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: 'var(--color-gold)' }}>Tag: {cardName}</h3>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.5rem' }}
          >×</button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '1rem', textTransform: 'uppercase' }}>
            Tags by Category
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {Object.entries(TAG_CATEGORIES).map(([category, tags]) => (
              <div key={category}>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-gold)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '0.5rem', opacity: 0.8 }}>
                  {category}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {tags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        border: selectedTags.includes(tag) ? '1px solid var(--color-gold)' : '1px solid #333',
                        background: selectedTags.includes(tag) ? 'rgba(212, 175, 55, 0.15)' : 'rgba(0,0,0,0.3)',
                        color: selectedTags.includes(tag) ? 'var(--color-gold)' : '#aaa',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                      onMouseEnter={(e) => { if(!selectedTags.includes(tag)) e.currentTarget.style.borderColor = '#666'; }}
                      onMouseLeave={(e) => { if(!selectedTags.includes(tag)) e.currentTarget.style.borderColor = '#333'; }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
            Custom Tag
          </h4>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={customTag}
              onChange={e => setCustomTag(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && addCustomTag()}
              placeholder="e.g. Secret Tech"
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
              Selected Tags ({selectedTags.length})
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
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={onClose}
            className="btn"
            style={{ flex: 1, background: '#333' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
