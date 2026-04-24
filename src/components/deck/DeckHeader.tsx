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
  budgetInfo,
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
        {/* Nivel Mensual */}
        <div className={styles.budgetRow}>
          <span className={styles.budgetLabel}>Gasto este mes:</span>
          <span style={{ color: statusColor, fontWeight: '700' }}>
            {currentMonthSpent.toFixed(2)}€ / {effectiveMonthlyLimit.toFixed(2)}€
          </span>
        </div>
        <div className={styles.progressBarBg}>
          <div 
            className={styles.progressBarFill}
            style={{ 
              width: `${progressPercentage}%`, 
              background: `linear-gradient(90deg, ${statusColor}, var(--color-gold-bright))`,
              boxShadow: `0 0 15px ${statusColor}44`,
              transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)'
            }} 
          />
        </div>

        {/* Nivel Global / Liga */}
        <div className={styles.globalBudgetInfo}>
          <div className={styles.budgetMiniRow}>
            <span>Presupuesto Total Liga:</span>
            <span>{budgetInfo.dynamicLimit.toFixed(2)}€</span>
          </div>
          <div className={styles.budgetMiniRow}>
            <span>Inversión Total Mazo:</span>
            <span>{budgetInfo.totalSpent.toFixed(2)}€</span>
          </div>
          <div className={styles.budgetTotalBalance}>
            <span>SALDO DISPONIBLE:</span>
            <span style={{ color: remaining >= 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
              {remaining.toFixed(2)}€
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
