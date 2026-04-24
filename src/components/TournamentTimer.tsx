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
    <div className="glass-panel" style={{
      background: isExpired ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
      border: isExpired ? '1px solid #ef4444' : '1px solid var(--color-gold)',
      color: isExpired ? '#ef4444' : 'var(--color-gold)',
      padding: '0.6rem 1.5rem',
      borderRadius: '16px',
      fontSize: '1.4rem',
      fontWeight: '900',
      fontFamily: 'var(--font-main)',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.75rem',
      boxShadow: isExpired ? '0 0 30px rgba(239, 68, 68, 0.2)' : '0 0 20px rgba(212, 175, 55, 0.1)',
      backdropFilter: 'blur(10px)',
      animation: isExpired ? 'pulseRed 2s infinite' : 'none'
    }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulseRed {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); box-shadow: 0 0 40px rgba(239, 68, 68, 0.4); }
        }
      `}} />
      <span style={{ fontSize: '1.2rem' }}>{isExpired ? '🚨' : '⏱️'}</span>
      <span style={{ letterSpacing: '2px' }}>
        {timeLeft.m.toString().padStart(2, '0')}:{timeLeft.s.toString().padStart(2, '0')}
      </span>
      {isExpired && <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px', marginLeft: '0.5rem' }}>FIN DE RONDA</span>}
    </div>
  );
}
