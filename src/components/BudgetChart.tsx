'use client'

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartData
} from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { DeckUpgrade } from '@/types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  LineController,
  BarElement,
  BarController,
  Title,
  Tooltip,
  Legend,
  Filler
);

import { LEAGUE_START_DATE, MONTHLY_ALLOWANCE } from '@/lib/constants';


interface BudgetChartProps {
  upgrades: DeckUpgrade[];
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
  
  // Force start date to be League Start Date to show full history/accumulation context
  let startDate = new Date(LEAGUE_START_DATE);

  // If we have data OLDER than league start (legacy?), we extend backwards, but otherwise default to league start
  if (creationDate && new Date(creationDate) < startDate) {
      startDate = new Date(creationDate);
  } else if (upgrades.length > 0) {
      const validUpgrades = upgrades.filter(u => u.month);
      if (validUpgrades.length > 0) {
        const sorted = [...validUpgrades].sort((a, b) => a.month!.localeCompare(b.month!));
        const [y, m] = sorted[0].month!.split('-');
        const firstUpgrade = new Date(parseInt(y), parseInt(m) - 1);
        if (firstUpgrade < startDate) {
             startDate = firstUpgrade;
        }
      }
  }

  // Generate full month list
  const months = getMonthList(startDate, now);

  // Group real spending by month
  const monthlyTotals: { [key: string]: number } = {};
  upgrades.forEach(u => {
    if (u.month && u.cost) {
      monthlyTotals[u.month] = (monthlyTotals[u.month] || 0) + u.cost;
    }
  });

  // Calculate data points (Monthly, non-cumulative)
  const spentData = months.map(m => monthlyTotals[m] || 0);

  // Constant limit from config
  const limitData = months.map(() => MONTHLY_ALLOWANCE);

  const data: ChartData<'bar' | 'line', number[], string> = {
    labels: months,
    datasets: [
      {
        type: 'bar' as const,
        label: 'Gasto Mensual (€)',
        data: spentData,
        backgroundColor: 'rgba(212, 175, 55, 0.6)', // Gold with opacity
        borderColor: '#D4AF37',
        borderWidth: 1,
        borderRadius: 4,
        order: 2
      },
      {
        type: 'line' as const,
        label: `Límite (${MONTHLY_ALLOWANCE}€)`,
        data: limitData,
        borderColor: 'rgba(255, 255, 255, 0.5)', // Faint white

        borderDash: [5, 5],
        pointRadius: 0,
        fill: false,
        tension: 0,
        order: 1
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
        ticks: { color: '#666', callback: (val: any) => `${val}€` },
        beginAtZero: true
      },
      x: {
        grid: { display: false },
        ticks: { color: '#666', maxRotation: 45, minRotation: 45 }
      }
    },
  };

  return (
    <div style={{ height: '100%', width: '100%' }}>
      <Chart type='bar' data={data} options={options} />
    </div>
  );
}
