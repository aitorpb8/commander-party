'use client'

import React, { useState, useEffect } from 'react';

interface TournamentTimerProps {
  startTime: string; // ISO String
  durationMinutes: number;
}

export default function TournamentTimer({ startTime, durationMinutes }: TournamentTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{ m: number, s: number } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!startTime) return;

    const timer = setInterval(() => {
      const start = new Date(startTime).getTime();
      const end = start + (durationMinutes * 60 * 1000);
      const now = new Date().getTime();
      const diff = end - now;

      if (diff <= 0) {
        setTimeLeft({ m: 0, s: 0 });
        setIsExpired(true);
        clearInterval(timer);
      } else {
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ m, s });
        setIsExpired(false);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime, durationMinutes]);

  if (!timeLeft) return <div>Calculando...</div>;

  return (
    <div style={{
      background: isExpired ? '#3a0000' : '#222',
      border: isExpired ? '1px solid #ff4444' : '1px solid var(--color-gold)',
      color: isExpired ? '#ff4444' : 'var(--color-gold)',
      padding: '0.4rem 1rem',
      borderRadius: '4px',
      fontSize: '1.2rem',
      fontWeight: 'bold',
      fontFamily: 'monospace',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      boxShadow: isExpired ? '0 0 10px rgba(255, 0, 0, 0.3)' : 'none'
    }}>
      <span>⏱</span>
      <span>
        {timeLeft.m.toString().padStart(2, '0')}:{timeLeft.s.toString().padStart(2, '0')}
      </span>
      {isExpired && <span style={{ fontSize: '0.8rem', textTransform: 'uppercase' }}>Fin de Ronda</span>}
    </div>
  );
}
