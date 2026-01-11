'use client'

import React from 'react';

interface CardTag {
  card_name: string;
  tags: string[];
}

interface TagStatsProps {
  cardTags: CardTag[];
  onFilterByTag: (tag: string | null) => void;
  activeFilter: string | null;
}

export default function TagStats({ cardTags, onFilterByTag, activeFilter }: TagStatsProps) {
  // Count tags
  const tagCounts = cardTags.reduce((acc, ct) => {
    ct.tags.forEach(tag => {
      acc[tag] = (acc[tag] || 0) + 1;
    });
    return acc;
  }, {} as Record<string, number>);

  const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);

  if (sortedTags.length === 0) {
    return (
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Estadísticas de Etiquetas</h3>
        <p style={{ color: '#666', fontSize: '0.9rem', textAlign: 'center' }}>
          No hay cartas etiquetadas. Haz clic en una carta en el visualizador para añadir etiquetas.
        </p>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h3 style={{ margin: 0 }}>Estadísticas de Etiquetas</h3>
        {activeFilter && (
          <button
            onClick={() => onFilterByTag(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--color-gold)',
              cursor: 'pointer',
              fontSize: '0.8rem',
              textDecoration: 'underline'
            }}
          >
            Limpiar filtro
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
        {sortedTags.map(([tag, count]) => (
          <button
            key={tag}
            onClick={() => onFilterByTag(activeFilter === tag ? null : tag)}
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              border: activeFilter === tag ? '2px solid var(--color-gold)' : '1px solid #333',
              background: activeFilter === tag ? 'rgba(212, 175, 55, 0.15)' : '#222',
              cursor: 'pointer',
              transition: 'all 0.2s',
              textAlign: 'left'
            }}
          >
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.25rem' }}>{tag}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: activeFilter === tag ? 'var(--color-gold)' : 'white' }}>
              {count}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
