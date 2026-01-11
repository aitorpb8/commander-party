'use client'

import React, { useState, useEffect } from 'react';

interface PreconComparisonProps {
  preconUrl: string;
  currentCards: string[];
}

export default function PreconComparison({ preconUrl, currentCards }: PreconComparisonProps) {
  const [originalCards, setOriginalCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [show, setShow] = useState(false);

  const fetchOriginal = async () => {
    setLoading(true);
    setError('');
    try {
      let endpoint = '';
      if (preconUrl.includes('archidekt.com')) endpoint = '/api/import/archidekt';
      else if (preconUrl.includes('moxfield.com')) endpoint = '/api/import/moxfield';
      else throw new Error('URL de precon no soportada.');

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: preconUrl })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al cargar precon');

      setOriginalCards(data.cards || []);
      setShow(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatus = (cardName: string) => {
    return currentCards.some(c => c.toLowerCase() === cardName.toLowerCase());
  };

  if (!preconUrl) return null;

  return (
    <div style={{ marginTop: '1rem' }}>
      {!show ? (
        <button 
          onClick={fetchOriginal} 
          className="btn" 
          disabled={loading}
          style={{ width: '100%', background: '#222', fontSize: '0.85rem' }}
        >
          {loading ? 'Cargando Base Original...' : '🔍 Ver Baraja Original (Precon)'}
        </button>
      ) : (
        <div className="card" style={{ background: '#111', border: '1px solid #333' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ color: 'var(--color-gold)', margin: 0 }}>Comparación con Precon</h4>
            <button onClick={() => setShow(false)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer' }}>Cerrar</button>
          </div>
          
          <div style={{ maxHeight: '400px', overflowY: 'auto', fontSize: '0.85rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.5rem' }}>
              {originalCards.map((card, idx) => {
                const isKept = getStatus(card.name);
                return (
                  <React.Fragment key={idx}>
                    <span style={{ color: isKept ? '#fff' : '#666', textDecoration: isKept ? 'none' : 'line-through' }}>
                      {card.name}
                    </span>
                    <span style={{ color: isKept ? 'var(--color-green)' : 'var(--color-red)', fontWeight: 'bold' }}>
                      {isKept ? 'Mantenida' : 'Eliminada'}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #222', fontSize: '0.8rem', color: '#888' }}>
            Se mantienen {originalCards.filter(c => getStatus(c.name)).length} de {originalCards.length} cartas originales.
          </div>
        </div>
      )}
      {error && <p style={{ color: 'var(--color-red)', fontSize: '0.75rem', marginTop: '0.5rem' }}>{error}</p>}
    </div>
  );
}
