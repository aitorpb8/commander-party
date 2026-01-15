
import React from 'react';

export type GroupBy = 'type' | 'cmc' | 'color' | 'function';
export type SortBy = 'cmc' | 'name';
export type ViewMode = 'stack' | 'grid' | 'text' | 'list';

interface DeckFiltersProps {
  groupBy: GroupBy;
  setGroupBy: (value: GroupBy) => void;
  sortBy: SortBy;
  setSortBy: (value: SortBy) => void;
  viewMode: ViewMode;
  setViewMode: (value: ViewMode) => void;
}

export function DeckFilters({
  groupBy,
  setGroupBy,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode
}: DeckFiltersProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
      {/* Group By */}
      <div style={{ display: 'flex', gap: '0.25rem', background: '#111', padding: '4px', borderRadius: '8px' }}>
        {(['type', 'cmc', 'color', 'function'] as GroupBy[]).map(g => (
          <button 
            key={g}
            onClick={() => setGroupBy(g)}
            style={{ 
              padding: '4px 10px', 
              fontSize: '0.7rem', 
              borderRadius: '6px', 
              border: 'none',
              background: groupBy === g ? 'var(--color-gold)' : 'transparent',
              color: groupBy === g ? '#000' : '#888',
              cursor: 'pointer',
              fontWeight: 'bold',
              textTransform: 'uppercase'
            }}
          >
            {g === 'function' ? 'Func' : g.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Sort By */}
      <select 
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as SortBy)}
        style={{ padding: '0.3rem', borderRadius: '6px', background: '#151515', color: '#ccc', border: '1px solid #333', fontSize: '0.8rem' }}
      >
        <option value="cmc">Mana Value</option>
        <option value="name">Nombre (A-Z)</option>
      </select>

      {/* View Mode Dropdown */}
      <div className="view-as-container">
          <span>View as</span>
          <select 
          value={viewMode}
          onChange={(e) => setViewMode(e.target.value as ViewMode)}
          className="view-as-select"
          >
            <option value="stack">🖼️ Pilas</option>
            <option value="grid">⬛ Cuadrícula</option>
            <option value="text">📄 Texto</option>
            <option value="list">📝 Tabla</option>
          </select>
      </div>
    </div>
  );
}
