'use client';

import React, { useState, useEffect } from 'react';
import { DeckCard } from '@/types';

interface ProxyPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  cards: DeckCard[];
  deckName: string;
}

const BASIC_LANDS = new Set([
  'forest', 'island', 'swamp', 'mountain', 'plains',
  'bosque', 'isla', 'pantano', 'montaña', 'llanura'
]);

export default function ProxyPrintModal({ isOpen, onClose, cards, deckName }: ProxyPrintModalProps) {
  const [selectedCards, setSelectedCards] = useState<Record<string, { quantity: number; checked: boolean; imageUrl: string; backImageUrl?: string }>>({});
  const [includeBacks, setIncludeBacks] = useState(true);

  // Initialize selected cards based on props
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, { quantity: number; checked: boolean; imageUrl: string; backImageUrl?: string }> = {};
      cards.forEach(c => {
        if (c.image_url) {
          const nameLower = c.card_name.toLowerCase();
          const isBasic = BASIC_LANDS.has(nameLower);
          initial[c.card_name] = {
            quantity: c.quantity || 1,
            // Pre-uncheck basic lands to save ink/paper
            checked: !isBasic,
            imageUrl: c.image_url,
            backImageUrl: c.back_image_url || undefined
          };
        }
      });
      setSelectedCards(initial);
    }
  }, [isOpen, cards]);

  if (!isOpen) return null;

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setSelectedCards(prev => ({
      ...prev,
      [name]: { ...prev[name], checked }
    }));
  };

  const handleQuantityChange = (name: string, quantity: number) => {
    const safeQty = Math.max(0, quantity);
    setSelectedCards(prev => ({
      ...prev,
      [name]: { 
        ...prev[name], 
        quantity: safeQty,
        // Auto check if quantity is set to positive
        checked: safeQty > 0 ? true : prev[name].checked
      }
    }));
  };

  const selectAll = (checked: boolean) => {
    setSelectedCards(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(name => {
        next[name].checked = checked;
      });
      return next;
    });
  };

  const excludeBasicLands = () => {
    setSelectedCards(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(name => {
        if (BASIC_LANDS.has(name.toLowerCase())) {
          next[name].checked = false;
        }
      });
      return next;
    });
  };

  const handleGenerate = () => {
    // Collect all card items (repeated by quantity)
    const itemsToPrint: string[] = [];

    Object.entries(selectedCards).forEach(([name, data]) => {
      if (data.checked && data.quantity > 0) {
        for (let i = 0; i < data.quantity; i++) {
          itemsToPrint.push(data.imageUrl);
          if (includeBacks && data.backImageUrl) {
            itemsToPrint.push(data.backImageUrl);
          }
        }
      }
    });

    if (itemsToPrint.length === 0) {
      alert('Por favor, selecciona al menos una carta para imprimir.');
      return;
    }

    // Chunk cards in groups of 9 for A4 pages
    const pages: string[][] = [];
    for (let i = 0; i < itemsToPrint.length; i += 9) {
      pages.push(itemsToPrint.slice(i, i + 9));
    }

    // Generate HTML pages
    const pagesHtml = pages.map((pageCards, pageIdx) => {
      const cardsInPage = pageCards.map(img => 
        `<img class="proxy-card" src="${img}" alt="Proxy Card" />`
      ).join('');
      
      return `
        <div class="page" id="page-${pageIdx + 1}">
          ${cardsInPage}
        </div>
      `;
    }).join('');

    // Open print window
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Proxies - ${deckName}</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                background: #f0f0f0;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .no-print-header {
                background: #111;
                color: #fff;
                padding: 14px 24px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                position: sticky;
                top: 0;
                z-index: 10000;
              }
              .no-print-header h1 {
                margin: 0;
                font-size: 15px;
                font-weight: 700;
                letter-spacing: 0.5px;
                color: #d4af37;
              }
              .no-print-header p {
                margin: 4px 0 0 0;
                font-size: 12px;
                color: #aaa;
              }
              .btn-print {
                background: #d4af37;
                color: #000;
                border: none;
                padding: 10px 20px;
                border-radius: 6px;
                font-weight: 800;
                cursor: pointer;
                font-size: 13px;
                box-shadow: 0 4px 10px rgba(212, 175, 55, 0.3);
                transition: transform 0.1s;
              }
              .btn-print:active {
                transform: scale(0.97);
              }
              .pages-container {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
                padding: 20px;
              }
              .page {
                width: 210mm;
                height: 297mm;
                box-sizing: border-box;
                padding: 16.5mm 10.5mm;
                display: grid;
                grid-template-columns: repeat(3, 63mm);
                grid-template-rows: repeat(3, 88mm);
                gap: 0px;
                background: white;
                box-shadow: 0 10px 30px rgba(0,0,0,0.15);
                page-break-after: always;
              }
              .proxy-card {
                width: 63mm;
                height: 88mm;
                box-sizing: border-box;
                border: 0.1mm solid rgba(0, 0, 0, 0.15);
                outline: 0.1mm dashed rgba(0, 0, 0, 0.25);
                outline-offset: -1px;
                display: block;
              }
              
              @media print {
                body {
                  background: white;
                }
                .no-print-header {
                  display: none !important;
                }
                .pages-container {
                  padding: 0 !important;
                  gap: 0 !important;
                }
                .page {
                  box-shadow: none !important;
                  margin: 0 !important;
                  border: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="no-print-header">
              <div>
                <h1>Generador de Proxies: ${deckName}</h1>
                <p>En la ventana de impresión, asegúrate de desactivar márgenes ("Ninguno") y poner escala al 100%.</p>
              </div>
              <button class="btn-print" onclick="window.print()">Imprimir PDF / Hojas</button>
            </div>
            <div class="pages-container">
              ${pagesHtml}
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  const selectedCount = Object.values(selectedCards).reduce((acc, c) => acc + (c.checked ? c.quantity : 0), 0);
  const totalPages = Math.ceil(selectedCount / 9);

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      backdropFilter: 'blur(5px)'
    }} onClick={onClose}>
      <div style={{
        background: '#151515',
        padding: '2rem',
        borderRadius: '16px',
        maxWidth: '650px',
        width: '100%',
        maxHeight: '85vh',
        overflowY: 'auto',
        border: '1px solid #333',
        boxShadow: '0 20px 50px rgba(0,0,0,0.6)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.2rem'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #222', paddingBottom: '0.8rem' }}>
          <div>
            <h3 style={{ margin: 0, color: 'var(--color-gold)', fontSize: '1.2rem', fontWeight: 800 }}>Imprimir Proxies</h3>
            <span style={{ fontSize: '0.8rem', color: '#888' }}>{deckName}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', fontSize: '1.8rem', cursor: 'pointer', padding: 0 }}>&times;</button>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={() => selectAll(true)} className="btn-premium btn-premium-dark" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
            Seleccionar Todo
          </button>
          <button onClick={() => selectAll(false)} className="btn-premium btn-premium-dark" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem' }}>
            Limpiar Todo
          </button>
          <button onClick={excludeBasicLands} className="btn-premium btn-premium-dark" style={{ fontSize: '0.75rem', padding: '0.5rem 1rem', color: '#ff9800', borderColor: 'rgba(255, 152, 0, 0.3)' }}>
            Excluir Tierras Básicas
          </button>
        </div>

        {/* Options */}
        <div style={{ display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.02)', padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid #222' }}>
          <label style={{ color: '#ccc', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input 
              type="checkbox" 
              checked={includeBacks} 
              onChange={e => setIncludeBacks(e.target.checked)} 
              style={{ accentColor: 'var(--color-gold)' }}
            />
            Incluir reverso de cartas de doble cara
          </label>
        </div>

        {/* Card List Container */}
        <div style={{ flex: 1, overflowY: 'auto', maxHeight: '40vh', border: '1px solid #222', borderRadius: '8px', background: '#0a0a0a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#111', borderBottom: '1px solid #222', color: '#666' }}>
                <th style={{ padding: '8px 12px', width: '40px' }}>Imprimir</th>
                <th style={{ padding: '8px 12px' }}>Nombre de Carta</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', width: '100px' }}>Cantidad</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(selectedCards).map(([name, data]) => {
                const isBasic = BASIC_LANDS.has(name.toLowerCase());
                return (
                  <tr key={name} style={{ borderBottom: '1px solid #1c1c1c', background: data.checked ? 'rgba(212,175,55,0.02)' : 'transparent' }}>
                    <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={data.checked} 
                        onChange={e => handleCheckboxChange(name, e.target.checked)}
                        style={{ accentColor: 'var(--color-gold)', cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '8px 12px', color: data.checked ? '#fff' : '#888', fontWeight: data.checked ? '600' : 'normal' }}>
                      {name} {isBasic && <span style={{ color: '#666', fontSize: '0.75rem', marginLeft: '4px' }}>(Básica)</span>}
                      {data.backImageUrl && <span style={{ color: 'var(--color-gold)', fontSize: '0.75rem', marginLeft: '4px' }}>[Doble Cara]</span>}
                    </td>
                    <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button 
                          onClick={() => handleQuantityChange(name, data.quantity - 1)}
                          style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', border: '1px solid #444', color: '#ccc', cursor: 'pointer', borderRadius: '4px', padding: 0 }}
                        >-</button>
                        <span style={{ minWidth: '20px', textAlign: 'center', color: '#fff' }}>{data.quantity}</span>
                        <button 
                          onClick={() => handleQuantityChange(name, data.quantity + 1)}
                          style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#222', border: '1px solid #444', color: '#ccc', cursor: 'pointer', borderRadius: '4px', padding: 0 }}
                        >+</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer info & Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #222', paddingTop: '1rem', marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.85rem', color: '#aaa' }}>
            <span>Cartas a imprimir: <b style={{ color: 'var(--color-gold)' }}>{selectedCount}</b></span>
            <span style={{ marginLeft: '10px', opacity: 0.6 }}>({totalPages} {totalPages === 1 ? 'hoja' : 'hojas'} A4)</span>
          </div>
          <button 
            onClick={handleGenerate}
            className="btn-premium btn-premium-gold"
            style={{ padding: '0.6rem 1.4rem', fontSize: '0.85rem' }}
            disabled={selectedCount === 0}
          >
            Generar Vista de Impresión
          </button>
        </div>

      </div>
    </div>
  );
}
