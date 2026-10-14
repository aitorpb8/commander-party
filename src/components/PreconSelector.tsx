import React, { useState } from 'react';
import preconsData from '@/data/precons.json';
import preconDecklistsData from '@/data/precon-decklists.json';

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
const DECKLISTS: Record<string, any[]> = (preconDecklistsData as Record<string, any[]>);

interface PreconSelectorProps {
  onSelect: (precon: Precon) => void;
}

export default function PreconSelector({ onSelect }: PreconSelectorProps) {
  const [filter, setFilter] = useState('');
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [seriesFilter, setSeriesFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [previewPrecon, setPreviewPrecon] = useState<Precon | null>(null);
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
          className="input-premium"
          value={filter}
          onChange={e => setFilter(e.target.value)}
          style={{ flex: '1 1 200px' }}
        />
        
        <select
          value={seriesFilter}
          onChange={e => setSeriesFilter(e.target.value)}
          className="select-premium"
          style={{ minWidth: '220px' }}
        >
          <option value="all">Todas las ediciones</option>
          {series.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        
        <select
          value={yearFilter}
          onChange={e => setYearFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
          className="select-premium"
          style={{ minWidth: '120px' }}
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
            
            <div style={{ padding: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 0.2rem', fontSize: '0.9rem', color: '#fff' }}>{precon.name}</h4>
                <p style={{ margin: 0, fontSize: '0.75rem', color: '#888' }}>{precon.commander}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewPrecon(precon);
                }}
                title="Inspeccionar lista de cartas"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'var(--color-gold)',
                  borderRadius: '6px',
                  padding: '0.35rem 0.55rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  transition: 'background 0.2s'
                }}
              >
                👁️ Ver
              </button>
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
      {/* Modal de Previsualización de la Lista de Cartas */}
      {previewPrecon && (() => {
        const cards = DECKLISTS[previewPrecon.name] || [];
        const commanderCard = cards.find(c => c.is_commander);
        const totalCards = cards.reduce((a, c) => a + (c.quantity || 1), 0);

        // Group cards by main category
        const groups: Record<string, any[]> = {
          'Comandante': commanderCard ? [commanderCard] : [],
          'Criaturas': cards.filter(c => !c.is_commander && c.type_line?.toLowerCase().includes('creature')),
          'Conjuros y Hechizos': cards.filter(c => !c.is_commander && (c.type_line?.toLowerCase().includes('sorcery') || c.type_line?.toLowerCase().includes('instant'))),
          'Artefactos y Encantamientos': cards.filter(c => !c.is_commander && !c.type_line?.toLowerCase().includes('creature') && (c.type_line?.toLowerCase().includes('artifact') || c.type_line?.toLowerCase().includes('enchantment'))),
          'Tierras': cards.filter(c => !c.is_commander && c.type_line?.toLowerCase().includes('land')),
          'Otros': cards.filter(c => !c.is_commander && !c.type_line?.toLowerCase().includes('creature') && !c.type_line?.toLowerCase().includes('sorcery') && !c.type_line?.toLowerCase().includes('instant') && !c.type_line?.toLowerCase().includes('artifact') && !c.type_line?.toLowerCase().includes('enchantment') && !c.type_line?.toLowerCase().includes('land'))
        };

        return (
          <div 
            onClick={() => setPreviewPrecon(null)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.85)',
              backdropFilter: 'blur(6px)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '1.5rem'
            }}
          >
            <div 
              onClick={e => e.stopPropagation()}
              style={{
                background: '#141414',
                border: '1px solid #333',
                borderRadius: '16px',
                width: '100%',
                maxWidth: '750px',
                maxHeight: '90vh',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)'
              }}
            >
              {/* Header */}
              <div style={{
                padding: '1.25rem 1.5rem',
                borderBottom: '1px solid #222',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'linear-gradient(to right, rgba(212,175,55,0.08), transparent)'
              }}>
                <div>
                  <h3 style={{ margin: 0, color: 'var(--color-gold)', fontSize: '1.25rem' }}>{previewPrecon.name}</h3>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: '#888' }}>
                    {previewPrecon.series} ({previewPrecon.year}) • {totalCards} cartas registradas
                  </p>
                </div>
                <button 
                  onClick={() => setPreviewPrecon(null)}
                  style={{
                    background: '#222',
                    border: '1px solid #333',
                    color: '#aaa',
                    borderRadius: '8px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem', overflowY: 'auto', flex: 1 }}>
                {cards.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: '#777' }}>
                    No hay cartas descargadas para este mazo todavía.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                    {Object.entries(groups).map(([groupName, groupCards]) => {
                      if (groupCards.length === 0) return null;
                      const count = groupCards.reduce((a, c) => a + (c.quantity || 1), 0);
                      return (
                        <div key={groupName} style={{ background: '#1c1c1c', borderRadius: '10px', padding: '1rem', border: '1px solid #282828' }}>
                          <h5 style={{ margin: '0 0 0.75rem', color: 'var(--color-gold)', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{groupName}</span>
                            <span style={{ opacity: 0.6 }}>({count})</span>
                          </h5>
                          <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.8rem' }}>
                            {groupCards.map((c, idx) => (
                              <li key={idx} style={{ padding: '0.25rem 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #222' }}>
                                <span style={{ color: c.is_commander ? 'var(--color-gold)' : '#ddd', fontWeight: c.is_commander ? 'bold' : 'normal' }}>
                                  {c.quantity > 1 ? `${c.quantity}x ` : ''}{c.name}
                                </span>
                                <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>{c.mana_cost || ''}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div style={{
                padding: '1rem 1.5rem',
                borderTop: '1px solid #222',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                background: '#111'
              }}>
                <button
                  type="button"
                  onClick={() => setPreviewPrecon(null)}
                  style={{
                    background: '#222',
                    border: '1px solid #333',
                    color: '#fff',
                    borderRadius: '8px',
                    padding: '0.6rem 1.2rem',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const target = previewPrecon;
                    setPreviewPrecon(null);
                    onSelect(target);
                  }}
                  style={{
                    background: 'var(--color-gold)',
                    border: 'none',
                    color: '#000',
                    borderRadius: '8px',
                    padding: '0.6rem 1.2rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  ✓ Seleccionar este mazo
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
