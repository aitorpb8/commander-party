'use client'

import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { getCollection, ScryfallCard } from '@/lib/scryfall';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

interface ManaCurveProps {
  cardNames: string[];
}

export default function ManaCurve({ cardNames }: ManaCurveProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchManaData = async () => {
      if (cardNames.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      // Fetch card data from Scryfall (limited to 75 at a time, decks are usually 100)
      // We'll take the first 75 for now as a representative sample or split if needed
      const cards = await getCollection(cardNames.slice(0, 75).map(name => ({ name })));
      
      // Filter out lands as they don't usually count for the "curve"
      const nonLandCards = cards.filter(c => !c.type_line.includes('Land'));

      const curve = new Array(8).fill(0); // 0, 1, 2, 3, 4, 5, 6, 7+
      
      nonLandCards.forEach(card => {
        const mv = Math.min(Math.floor(card.cmc), 7);
        curve[mv]++;
      });

      setData({
        labels: ['0', '1', '2', '3', '4', '5', '6', '7+'],
        datasets: [
          {
            label: 'Número de Cartas',
            data: curve,
            backgroundColor: 'rgba(212, 175, 55, 0.6)',
            borderColor: '#D4AF37',
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      });
      setLoading(false);
    };

    fetchManaData();
  }, [cardNames]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1a1a1a',
        titleColor: '#D4AF37',
        bodyColor: '#fff',
        borderColor: '#444',
        borderWidth: 1,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#666', stepSize: 1 }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#666' }
      }
    },
  };

  if (loading) return <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem' }}>Calculando curva...</div>;
  if (!data) return <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', fontSize: '0.8rem' }}>Sin datos de cartas.</div>;

  return (
    <div style={{ height: '150px', width: '100%' }}>
      <Bar data={data} options={options} />
    </div>
  );
}
