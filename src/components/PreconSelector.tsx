'use client'

import React, { useState } from 'react';
import preconsData from '@/data/precons.json';

interface Precon {
  id: string;
  name: string;
  commander: string;
  imageUrl: string;
  url: string;
  series: string;
  year: number;
}

const PRECONS: Precon[] = (preconsData as Precon[]);

interface PreconSelectorProps {
  onSelect: (precon: Precon) => void;
}

export default function PreconSelector({ onSelect }: PreconSelectorProps) {
  const [filter, setFilter] = useState('');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [seriesFilter, setSeriesFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 24;

  const filtered = PRECONS.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(filter.toLowerCase()) || 
                         p.commander.toLowerCase().includes(filter.toLowerCase()) ||
                         p.series.toLowerCase().includes(filter.toLowerCase());
    const matchesYear = yearFilter === 'all' || p.year === yearFilter;
    const matchesSeries = seriesFilter === 'all' || p.series === seriesFilter;
    return matchesSearch && matchesYear && matchesSeries;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedPrecons = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter, yearFilter, seriesFilter]);

  const years = Array.from(new Set(PRECONS.map(p => p.year))).sort((a, b) => b - a);
  const series = Array.from(new Set(PRECONS.map(p => p.series))).sort();

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="Buscar..." 
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ 
            flex: '1 1 200px',
            padding: '0.75rem 1.25rem', 
            borderRadius: '30px', 
            border: '1px solid #333', 
            background: '#0a0a0a', 
            color: 'white',
            fontSize: '0.9rem'
          }}
        />
        
        <select
          value={seriesFilter}
          onChange={e => setSeriesFilter(e.target.value)}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #333',
            background: '#0a0a0a',
            color: 'white',
            fontSize: '0.85rem',
            cursor: 'pointer',
            minWidth: '180px'
          }}
        >
          <option value="all">Todas las ediciones</option>
          {series.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        
        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          style={{
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            border: '1px solid #333',
            background: '#0a0a0a',
            color: 'white',
            fontSize: '0.85rem',
            cursor: 'pointer',
            minWidth: '120px'
          }}
        >
          <option value="all">Todos</option>
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <p style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1rem', textAlign: 'center' }}>
        Mostrando {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} de {filtered.length} mazos
        {totalPages > 1 && ` (Página ${currentPage} de ${totalPages})`}
      </p>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', 
        gap: '1.25rem',
        minHeight: '200px'
      }}>
        {filtered.length === 0 ? (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '4rem', color: '#666' }}>
            <p style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>No se han encontrado mazos.</p>
            <p style={{ fontSize: '0.9rem' }}>Prueba con otros términos de búsqueda o filtros.</p>
          </div>
        ) : paginatedPrecons.map(precon => (
          <div 
            key={precon.id} 
            className="precon-card"
            onClick={() => onSelect(precon)}
            style={{ 
              background: '#151515', 
              borderRadius: '12px', 
              overflow: 'hidden', 
              border: '1px solid #333',
              cursor: 'pointer',
              transition: 'transform 0.2s, border-color 0.2s',
              position: 'relative'
            }}
          >
            <div style={{ height: '220px', overflow: 'hidden', position: 'relative' }}>
               <img 
                src={precon.imageUrl} 
                alt={precon.commander} 
                style={{ width: '100%', height: 'auto', objectFit: 'cover' }}
               />
               <div style={{ 
                position: 'absolute', bottom: 0, left: 0, right: 0, 
                background: 'linear-gradient(transparent, rgba(0,0,0,0.9))', 
                padding: '1rem 0.75rem 0.5rem' 
               }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--color-gold)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    {precon.series}
                  </span>
               </div>
            </div>
            
            <div style={{ padding: '0.75rem' }}>
              <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', color: '#fff' }}>{precon.name}</h4>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>{precon.commander}</p>
            </div>

            <style jsx>{`
              .precon-card:hover {
                transform: translateY(-5px);
                border-color: var(--color-gold);
                box-shadow: 0 10px 20px rgba(0,0,0,0.5);
              }
            `}</style>
          </div>
        ))}
      </div>

      {totalPages > 1 && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center',
          gap: '0.5rem',
          marginTop: '2rem'
        }}>
          <button
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #333',
              background: currentPage === 1 ? '#0a0a0a' : '#1a1a1a',
              color: currentPage === 1 ? '#555' : 'white',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem'
            }}
          >
            ← Anterior
          </button>

          <span style={{ color: '#888', fontSize: '0.85rem' }}>
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            style={{
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid #333',
              background: currentPage === totalPages ? '#0a0a0a' : '#1a1a1a',
              color: currentPage === totalPages ? '#555' : 'white',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Siguiente →
          </button>
        </div>
      )}
    </div>
  );
}
