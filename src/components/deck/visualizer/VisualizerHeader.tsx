import React from 'react';
import { DeckCard } from '@/types';
import DeckStats from '@/components/deck/DeckStats';
import { DeckFilters, GroupBy, SortBy, ViewMode } from '@/components/deck/DeckFilters';

interface VisualizerHeaderProps {
  cards: DeckCard[];
  onShowPlaytest: () => void;
  onShare: () => void;
  shareStatus: 'idle' | 'copied';
  groupBy: GroupBy;
  setGroupBy: (val: GroupBy) => void;
  sortBy: SortBy;
  setSortBy: (val: SortBy) => void;
  viewMode: ViewMode;
  setViewMode: (val: ViewMode) => void;
  filter: string;
  setFilter: (val: string) => void;
  showFilters: boolean;
  setShowFilters: (val: boolean) => void;
}

const VisualizerHeader: React.FC<VisualizerHeaderProps> = ({
  cards,
  onShowPlaytest,
  onShare,
  shareStatus,
  groupBy,
  setGroupBy,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  filter,
  setFilter,
  showFilters,
  setShowFilters
}) => {
  return (
    <div className="visualizer-header">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <h2 className="premium-title">Editor Visual</h2>
            <DeckStats cards={cards} />
          </div>

          <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button 
              onClick={onShowPlaytest}
              className="btn-action"
              title="Probar Mazo"
            >
              🚀 Playtest
            </button>
            <button 
              onClick={onShare}
              className={`btn-action ${shareStatus === 'copied' ? 'success' : ''}`}
            >
              {shareStatus === 'copied' ? '✅ Copiado' : '🔗 Compartir'}
            </button>
          </div>
        </div>
        
        <div className="filters-bar">
          <DeckFilters 
            groupBy={groupBy}
            setGroupBy={setGroupBy}
            sortBy={sortBy}
            setSortBy={setSortBy}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />

          <div className="search-group">
            <input 
              type="text" 
              placeholder="Buscar carta..." 
              value={filter}
              onChange={e => setFilter(e.target.value)}
              className="search-input"
            />
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              title="Filtros Avanzados"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="21" x2="4" y2="14"></line>
                <line x1="4" y1="10" x2="4" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12" y2="3"></line>
                <line x1="20" y1="21" x2="20" y2="16"></line>
                <line x1="20" y1="12" x2="20" y2="3"></line>
                <line x1="1" y1="14" x2="7" y2="14"></line>
                <line x1="9" y1="8" x2="15" y2="8"></line>
                <line x1="17" y1="16" x2="23" y2="16"></line>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizerHeader;
