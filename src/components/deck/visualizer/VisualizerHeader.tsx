import React from 'react';
import { DeckCard } from '@/types';
import DeckStats from '@/components/deck/DeckStats';
import { DeckFilters, GroupBy, SortBy, ViewMode } from '@/components/deck/DeckFilters';
import styles from './DeckVisualizer.module.css';

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
    <div className={styles.visualizerContainer} style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%' }}>
        
        {/* Top Row: Title, Stats & Primary Actions */}
        <div className={styles.visualizerHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div className={styles.statsGroup} style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
            <h2 className="premium-title" style={{ margin: 0 }}>Editor Visual</h2>
            <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
              <DeckStats cards={cards} />
            </div>
          </div>

          <div className={styles.actionsGroup} style={{ display: 'flex', gap: '0.8rem', alignItems: 'center' }}>
            <button 
              onClick={onShowPlaytest}
              className="btn-premium btn-premium-dark"
              style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.71-2.13.71-2.13l-1.58-1.58s-1.29 0-2.13.71z"/><path d="m12 13-4-4c-2.39 2.39-5.32 3.12-6 3l11 11c-.12-.68.61-3.61 3-6z"/><path d="M22 2s-5.33 1.33-8 4-4 8-4 8l1 1 1 1s5.33-1.33 8-4 4-8 4-8z"/><path d="M15.5 8.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0z"/></svg>
              Playtest
            </button>
            <button 
              onClick={onShare}
              className={`btn-premium ${shareStatus === 'copied' ? 'btn-premium-gold' : 'btn-premium-dark'}`}
              style={{ fontSize: '0.8rem', padding: '0.6rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {shareStatus === 'copied' ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  Copiado
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                  Compartir
                </>
              )}
            </button>
          </div>
        </div>
        
        {/* Bottom Row: Filters & Search */}
        <div className={styles.filtersBar} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, overflowX: 'auto', paddingBottom: '4px' }}>
            <DeckFilters 
              groupBy={groupBy}
              setGroupBy={setGroupBy}
              sortBy={sortBy}
              setSortBy={setSortBy}
              viewMode={viewMode}
              setViewMode={setViewMode}
            />
          </div>

          <div className={styles.searchGroup} style={{ marginLeft: 'auto' }}>
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
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7h-9"></path>
                <path d="M14 17H5"></path>
                <circle cx="17" cy="17" r="3"></circle>
                <circle cx="7" cy="7" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualizerHeader;
