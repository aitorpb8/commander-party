import React, { useState, useRef, useEffect } from 'react';
import PremiumDropdown from '@/components/ui/PremiumDropdown';

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
  const [showViewMenu, setShowViewMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowViewMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const viewOptions = [
    { value: 'stack', label: 'Stacks' },
    { value: 'grid', label: 'Grid' },
    { value: 'text', label: 'Text' },
    { value: 'list', label: 'Table' },
  ];
  
  const sortOptions = [
    { value: 'cmc', label: 'Mana Value' },
    { value: 'name', label: 'Nombre (A-Z)' },
  ];

  // Helper to get active label
  const activeOption = viewOptions.find(o => o.value === viewMode);

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
      <PremiumDropdown 
        value={sortBy}
        options={sortOptions as any}
        onChange={(v) => setSortBy(v as SortBy)}
        width="150px"
      />

      {/* Custom View Mode Dropdown */}
      <PremiumDropdown 
        label="View as"
        value={viewMode}
        options={viewOptions as any}
        onChange={(v) => setViewMode(v as ViewMode)}
        width="160px"
      />
    </div>
  );
}
