import React, { useMemo } from 'react';
import Image from 'next/image';
import { getDeckArchetype } from '@/lib/magicUtils';
import { DeckCard } from '@/types';
import styles from './DeckHeader.module.css';

interface DeckHeaderProps {
  name: string;
  commander: string;
  imageUrl: string;
  isOwner: boolean;
  onShowPicker: () => void;
  budgetInfo: {
    dynamicLimit: number;
    totalSpent: number;
    remaining: number;
  };
  currentMonthSpent: number;
  effectiveMonthlyLimit: number;
  cards: DeckCard[];
}

export default function DeckHeader({
  name,
  commander,
  imageUrl,
  isOwner,
  onShowPicker,
  currentMonthSpent,
  effectiveMonthlyLimit,
  cards,
}: DeckHeaderProps) {
  const archetype = useMemo(() => getDeckArchetype(cards), [cards]);
  const remaining = effectiveMonthlyLimit - currentMonthSpent;
  let statusColor = 'var(--color-green)';
  if (currentMonthSpent > effectiveMonthlyLimit + 1) statusColor = 'var(--color-red)';
  else if (currentMonthSpent > effectiveMonthlyLimit) statusColor = '#ff9800';

  const progressPercentage = effectiveMonthlyLimit > 0 
    ? Math.min((currentMonthSpent / effectiveMonthlyLimit) * 100, 100) 
    : 100;

  return (
    <div className={`card ${styles.headerCard}`}>
      <div className={styles.imageContainer}>
        <Image 
          src={imageUrl || 'https://via.placeholder.com/300x400'} 
          alt={commander} 
          width={400}
          height={540}
          className={styles.commanderImage}
        />
        {isOwner && (
          <button 
            onClick={onShowPicker}
            className={`btn btn-gold ${styles.pickerButton}`}
          >
            Cambiar Arte
          </button>
        )}
      </div>
      
      <h1 className={styles.deckName}>{name}</h1>
      <p className={styles.commanderName}>Comandante: {commander}</p>
      
      <div className={styles.archetypeBadge}>
        <span>🏷️ {archetype}</span>
      </div>
      <div className={styles.budgetStatus}>
        <div className={styles.budgetRow}>
          <span>Presupuesto Mensual (+Acumulado):</span>
          <span style={{ color: statusColor }}>
            {currentMonthSpent.toFixed(2)}€ / {effectiveMonthlyLimit.toFixed(2)}€
          </span>
        </div>
        <div className={styles.progressBarBg}>
          <div 
            className={styles.progressBarFill}
            style={{ 
              width: `${progressPercentage}%`, 
              backgroundColor: statusColor 
            }} 
          />
        </div>
        <div className={styles.budgetFooter}>
          {currentMonthSpent > effectiveMonthlyLimit 
            ? `Te has pasado ${Math.abs(remaining).toFixed(2)}€.` 
            : `Tienes ${remaining.toFixed(2)}€ disponibles.`
          }
        </div>
      </div>
    </div>
  );
}
