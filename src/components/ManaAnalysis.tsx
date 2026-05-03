'use client'

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import { Bar, Pie, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

import { DeckCard } from '@/types';
import { calculateCMC } from '@/lib/magicUtils';

interface ManaAnalysisProps {
  cards: DeckCard[];
  onCMCFilter?: (cmc: number | null) => void;
  activeFilter?: number | null;
}

export default function ManaAnalysis({ cards, onCMCFilter, activeFilter }: ManaAnalysisProps) {
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const prod = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const curve = new Array(8).fill(0); // 0, 1, 2, 3, 4, 5, 6, 7+


  cards.forEach(c => {
    const isLand = c.type_line?.toLowerCase().includes('land');
    const cost = c.mana_cost || '';
    const text = c.oracle_text || '';

    if (!isLand) {
      const cmc = Math.min(calculateCMC(cost), 7);
      curve[cmc] += c.quantity;

      (cost.match(/W/g) || []).forEach(() => pips.W += c.quantity);
      (cost.match(/U/g) || []).forEach(() => pips.U += c.quantity);
      (cost.match(/B/g) || []).forEach(() => pips.B += c.quantity);
      (cost.match(/R/g) || []).forEach(() => pips.R += c.quantity);
      (cost.match(/G/g) || []).forEach(() => pips.G += c.quantity);
    } else {
      if (text.includes('{W}') || text.includes('Plains')) prod.W += c.quantity;
      if (text.includes('{U}') || text.includes('Island')) prod.U += c.quantity;
      if (text.includes('{B}') || text.includes('Swamp')) prod.B += c.quantity;
      if (text.includes('{R}') || text.includes('Mountain')) prod.R += c.quantity;
      if (text.includes('{G}') || text.includes('Forest')) prod.G += c.quantity;
      if (text.includes('any color')) {
         prod.W += c.quantity; prod.U += c.quantity; prod.B += c.quantity; prod.R += c.quantity; prod.G += c.quantity;
      }
    }
  });

  const wubrgColors = {
    W: '#f8f9fa',
    U: '#0ea5e9',
    B: '#4b5563',
    R: '#ef4444',
    G: '#10b981'
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    onClick: (evt: any, element: any) => {
      if (element.length > 0 && onCMCFilter) {
        const index = element[0].index;
        onCMCFilter(activeFilter === index ? null : index);
      }
    },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.9)',
        titleFont: { family: 'Cinzel', size: 14 },
        padding: 12,
        borderColor: 'rgba(212, 175, 55, 0.3)',
        borderWidth: 1
      }
    },
    scales: {
      y: { grid: { display: false }, ticks: { color: '#666', font: { size: 10 } } },
      x: { grid: { display: false }, ticks: { color: '#aaa', font: { weight: 'bold' as const } } }
    }
  };

  const cmcData = {
    labels: ['0', '1', '2', '3', '4', '5', '6', '7+'],
    datasets: [{
      data: curve,
      backgroundColor: curve.map((_, i) => i === activeFilter ? 'var(--color-gold)' : 'rgba(212, 175, 55, 0.4)'),
      hoverBackgroundColor: 'var(--color-gold)',
      borderRadius: 6,
      borderWidth: 0,
    }]
  };

  const pipsData = {
    labels: ['Blanco', 'Azul', 'Negro', 'Rojo', 'Verde'],
    datasets: [{
      data: [pips.W, pips.U, pips.B, pips.R, pips.G],
      backgroundColor: Object.values(wubrgColors),
      borderWidth: 0,
      hoverOffset: 15
    }]
  };

  const prodData = {
    labels: ['W', 'U', 'B', 'R', 'G'],
    datasets: [{
      data: [prod.W, prod.U, prod.B, prod.R, prod.G],
      backgroundColor: Object.values(wubrgColors).map(c => c + 'aa'),
      borderColor: Object.values(wubrgColors),
      borderWidth: 1,
      borderRadius: 4
    }]
  };

  const radarData = {
    labels: ['Blanco (W)', 'Azul (U)', 'Negro (B)', 'Rojo (R)', 'Verde (G)'],
    datasets: [
      {
        label: 'Requerido (Símbolos)',
        data: [pips.W, pips.U, pips.B, pips.R, pips.G],
        backgroundColor: 'rgba(212, 175, 55, 0.2)',
        borderColor: 'var(--color-gold)',
        borderWidth: 2,
        pointBackgroundColor: 'var(--color-gold)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'var(--color-gold)',
        fill: true
      },
      {
        label: 'Disponible (Tierras)',
        data: [prod.W, prod.U, prod.B, prod.R, prod.G],
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 2,
        pointBackgroundColor: 'rgba(255, 255, 255, 0.5)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgba(255, 255, 255, 0.5)',
        fill: true
      }
    ]
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
        grid: { color: 'rgba(255, 255, 255, 0.1)' },
        pointLabels: { 
          color: '#aaa',
          font: { size: 10, weight: 'bold' as const }
        },
        ticks: { display: false }
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
        labels: {
          color: '#666',
          boxWidth: 10,
          font: { size: 10 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 10, 0.9)',
        titleFont: { family: 'Cinzel', size: 14 },
        padding: 12,
        borderColor: 'rgba(212, 175, 55, 0.3)',
        borderWidth: 1
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
      {/* CMC CURVE */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem' }}>
          <h4 style={{ fontSize: '0.8rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold' }}>
            Curva de Maná (CMC)
          </h4>
          {activeFilter !== null && (
            <button 
              onClick={() => onCMCFilter?.(null)}
              style={{ background: 'none', border: 'none', color: '#666', fontSize: '0.7rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Limpiar filtro
            </button>
          )}
        </div>
        <div style={{ height: '160px', position: 'relative' }}>
          <Bar data={cmcData} options={chartOptions} />
        </div>
      </div>

      {/* BALANCE ANALYSIS (RADAR) */}
      <div style={{ background: 'rgba(255,255,255,0.02)', padding: '1.5rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h4 style={{ fontSize: '0.8rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 'bold', marginBottom: '1.5rem', textAlign: 'center' }}>
          Análisis de Balance
        </h4>
        <div style={{ height: '280px', position: 'relative' }}>
          <Radar data={radarData} options={radarOptions} />
        </div>
        <p style={{ fontSize: '0.7rem', color: '#555', marginTop: '1rem', textAlign: 'center', fontStyle: 'italic' }}>
          Compara los símbolos requeridos por tus hechizos vs la producción de tus tierras.
        </p>
      </div>

      {/* PIE & PRODUCTION BAR */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontSize: '0.75rem', color: '#888', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'center' }}>Símbolos</h4>
          <div style={{ height: '120px', display: 'flex', justifyContent: 'center' }}>
            <Pie data={pipsData} options={{ ...chartOptions, scales: { x: { display: false }, y: { display: false } } }} />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ fontSize: '0.75rem', color: '#888', marginBottom: '1.5rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Producción Tierras</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {Object.entries(prod).map(([col, val]) => {
              const maxVal = Math.max(...Object.values(prod), 1);
              const percentage = (val / maxVal) * 100;
              const color = wubrgColors[col as keyof typeof wubrgColors];
              
              return (
                <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#aaa', width: '12px' }}>{col}</span>
                  <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ 
                      height: '100%', 
                      width: `${percentage}%`, 
                      background: color,
                      boxShadow: `0 0 10px ${color}44`,
                      borderRadius: '10px',
                      transition: 'width 1s ease-out'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
