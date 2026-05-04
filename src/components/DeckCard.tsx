'use client';

import React from 'react';
import Image from 'next/image';
import styles from './deck/list/DeckCard.module.css';

interface DeckCardProps {
  playerName: string;
  playerAvatar?: string;
  deckName: string;
  commanderName: string;
  spent: number;
  budget: number;
  totalSpent?: number;
  leagueBudget?: number;
  remainingBalance?: number;
  imageUrl: string;
  colors: string[];
  strategyTags?: string[];
}

export default function DeckCard({ 
  playerName, playerAvatar, deckName, commanderName, spent, budget, 
  totalSpent = 0, leagueBudget = 0, remainingBalance = 0, imageUrl, strategyTags = []
}: DeckCardProps) {
  const percentage = budget > 0 ? (spent / budget) * 100 : (spent > 0 ? 100 : 0);
  
  const getStatusColor = () => {
    if (spent > budget + 1) return 'var(--color-red)';
    if (spent > budget) return '#ff9800'; // Warning orange
    return 'var(--color-green)';
  };

  const statusColor = getStatusColor();

  return (
    <div className={styles.deckCard}>
      {/* Background Glow */}
      <div 
        className={styles.backgroundGlow} 
        style={{ background: `radial-gradient(circle, ${statusColor} 0%, transparent 70%)` }}
      />

      {/* 1. Header Banner Image */}
      <div className={styles.imageContainer}>
        <Image 
          src={imageUrl} 
          alt={commanderName} 
          fill
          sizes="(max-width: 380px) 100vw, 380px"
          className={styles.deckImage}
          priority={false}
        />
        <div className={styles.imageOverlay}>
          <h3 className={styles.deckTitle}>{deckName}</h3>
          <div className={styles.commanderName}>{commanderName}</div>
        </div>
      </div>
      
      {/* 2. Content Area */}
      <div className={styles.content}>
        
        {/* Player Profile Line */}
        <div className={styles.playerLine}>
          <div className={styles.avatarWrapper}>
            {playerAvatar ? (
              <Image 
                src={playerAvatar} 
                alt={playerName} 
                width={48} 
                height={48} 
                className={styles.avatar}
                style={{ borderColor: statusColor }}
                unoptimized
              />
            ) : (
              <div 
                className={styles.avatar}
                style={{ 
                  width: '48px', height: '48px', 
                  background: `linear-gradient(135deg, ${statusColor}, #1a1a1b)`, 
                  color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '1.1rem', fontWeight: '900', border: '2px solid rgba(255,255,255,0.1)'
                }}
              >
                {playerName[0].toUpperCase()}
              </div>
            )}
            <div 
              className={styles.statusIndicator} 
              style={{ background: statusColor }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span className={styles.playerLabel}>PILOTO</span>
            <span className={styles.playerName}>{playerName}</span>
          </div>
        </div>

        {/* Budget HUD */}
        <div className={styles.budgetHud}>
          
          <div className={styles.monthlyStats}>
            <div className={styles.statBox} style={{ borderLeftColor: spent > budget ? 'var(--color-red)' : 'var(--color-green)', borderLeftWidth: '3px', borderLeftStyle: 'solid' }}>
              <span className={styles.statLabel}>MES ACTUAL</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                <span className={styles.statValue} style={{ color: spent > budget ? 'var(--color-red)' : '#fff' }}>
                    {spent.toFixed(2)}€
                </span>
                <span style={{ fontSize: '0.6rem', color: '#444' }}>/ {budget.toFixed(2)}€</span>
              </div>
            </div>

            <div className={styles.statBox} style={{ borderRightColor: 'var(--color-gold)', borderRightWidth: '3px', borderRightStyle: 'solid', textAlign: 'right' }}>
              <span className={styles.statLabel}>SALDO</span>
              <span className={styles.statValue} style={{ color: remainingBalance < 0 ? 'var(--color-red)' : 'var(--color-gold)' }}>
                {remainingBalance.toFixed(2)}€
              </span>
            </div>
          </div>

          <div className={styles.globalStats}>
            <div className={styles.globalStat}>
              <span className={styles.statLabel} style={{ color: 'var(--color-gold)', opacity: 0.7 }}>INVERSIÓN TOTAL</span>
              <span style={{ fontSize: '0.95rem', color: '#fff', fontWeight: '900', fontFamily: 'monospace' }}>{totalSpent.toFixed(2)}€</span>
            </div>
            <div className={styles.globalStat} style={{ textAlign: 'right' }}>
              <span className={styles.statLabel} style={{ color: 'var(--color-gold)', opacity: 0.7 }}>CUPO LIGA</span>
              <span style={{ fontSize: '0.95rem', color: 'var(--color-gold)', fontWeight: '900', fontFamily: 'monospace' }}>{leagueBudget.toFixed(2)}€</span>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className={styles.progressBarContainer}>
            <div 
              className={styles.progressBar}
              style={{ 
                width: `${Math.max(3, Math.min(100, percentage))}%`, 
                background: `linear-gradient(90deg, ${statusColor}, #fff4 100%)`,
                backgroundColor: statusColor
              }} 
            />
          </div>
        </div>

        {/* Strategy Tags Strip */}
        {strategyTags.length > 0 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.75rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            marginTop: '0.25rem',
            overflow: 'hidden',
          }}>
            <span style={{ fontSize: '0.7rem', color: '#666', flexShrink: 0 }}>🏷️</span>
            <span style={{
              fontSize: '0.7rem',
              color: '#888',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '0.01em',
            }}>
              {strategyTags.join(', ')}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
