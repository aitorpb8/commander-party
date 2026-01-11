'use client'

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface Upgrade {
  id: string;
  month: string;
  cost: number;
}

interface BudgetChartProps {
  upgrades: Upgrade[];
  initialBudget?: number;
  creationDate?: string;
}

export default function BudgetChart({ upgrades, initialBudget = 0, creationDate }: BudgetChartProps) {
  // Helper to generate all months between two dates
  const getMonthList = (start: Date, end: Date) => {
    const list = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);
    const stop = new Date(end.getFullYear(), end.getMonth(), 1);
    
    while (current <= stop) {
       const m = current.getMonth() + 1;
       const str = `${current.getFullYear()}-${m < 10 ? '0' + m : m}`;
       list.push(str);
       current.setMonth(current.getMonth() + 1);
    }
    return list;
  };

  const now = new Date();
  // Default start date: Creation date OR first upgrade date OR 3 months ago
  let startDate = new Date();
  if (creationDate) {
      startDate = new Date(creationDate);
  } else if (upgrades.length > 0) {
      const sorted = [...upgrades].sort((a, b) => a.month.localeCompare(b.month));
      const [y, m] = sorted[0].month.split('-');
      startDate = new Date(parseInt(y), parseInt(m) - 1);
  } else {
      startDate.setMonth(now.getMonth() - 2); 
  }

  // Generate full month list
  const months = getMonthList(startDate, now);

  // Group real spending by month
  const monthlyTotals: { [key: string]: number } = {};
  upgrades.forEach(u => {
    monthlyTotals[u.month] = (monthlyTotals[u.month] || 0) + u.cost;
  });

  // Calculate cumulative data points over the FULL timeline
  let cumulativeSpent = initialBudget;
  const spentData = months.map(m => {
    cumulativeSpent += (monthlyTotals[m] || 0);
    return cumulativeSpent;
  });

  // Calculate cumulative limit (10€ per month since start)
  const limitData = months.map((_, i) => (i + 1) * 10);

  const data = {
    labels: months,
    datasets: [
      {
        label: 'Presupuesto Gastado (€)',
        data: spentData,
        borderColor: '#D4AF37', // Gold
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
        fill: true,
        tension: 0.2, // Slightly smoother
        pointRadius: 4,
        pointBackgroundColor: '#D4AF37',
        pointBorderColor: '#1a1a1a',
      },
      {
        label: 'Límite Acumulado (10€/mes)',
        data: limitData,
        borderColor: 'rgba(255, 255, 255, 0.3)', // Faint white
        borderDash: [4, 4],
        fill: false,
        pointRadius: 0,
        spanGaps: true
      }
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#888',
          font: { size: 10 }
        }
      },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#D4AF37',
        bodyColor: '#fff',
        borderColor: '#444',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
        callbacks: {
            title: (items: any[]) => items[0].label,
            label: (item: any) => {
                const val = item.raw as number;
                return `${item.dataset.label}: ${val.toFixed(2)}€`;
            }
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#666', callback: (val: any) => `${val}€` }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#666', maxRotation: 45, minRotation: 45 }
      }
    },
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Line data={data} options={options} />
    </div>
  );
}
