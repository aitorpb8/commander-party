import React from 'react';
import { DeckCard } from '@/types';
import styles from './CardItem.module.css';

interface CardItemProps {
  card: DeckCard;
  idx: number;
  isLast: boolean;
  isHovered: boolean;
  isFlipped: boolean;
  isGC: boolean;
  isOwner?: boolean;
  viewMode?: 'stack' | 'grid';
  userCollection: Set<string>;
  onClick: () => void;
  onMouseEnter: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onFlip: (e: React.MouseEvent) => void;
  onAddOne?: () => void;
  onRemove?: () => void;
  onEditTags?: () => void;
  onShowInfo?: () => void;
}

const CardItem: React.FC<CardItemProps> = ({
  card,
  idx,
  isLast,
  isHovered,
  isFlipped,
  isGC,
  isOwner = false,
  viewMode = 'stack',
  userCollection,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFlip,
  onAddOne,
  onRemove,
  onEditTags,
  onShowInfo
}) => {
  const isStack = viewMode === 'stack';

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    e.currentTarget.style.setProperty('--mouse-x', `${x}%`);
    e.currentTarget.style.setProperty('--mouse-y', `${y}%`);
  };

  return (
    <div 
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseMove={handleMouseMove}
      style={{ 
        marginBottom: !isStack 
          ? '0' 
          : isLast 
            ? '0' 
            : isHovered 
              ? '15px'
              : 'calc(-1 * (88 / 63) * 100% + 38px)', 
        zIndex: idx, 
        transform: isHovered 
          ? (isStack ? 'translateY(-5px) scale(1.02)' : 'translateY(-15px) scale(1.05) rotate(1deg)') 
          : 'none', 
        boxShadow: isHovered ? '0 25px 50px rgba(0,0,0,0.8)' : 'none'
      }}
      className={`${styles.cardItem} ${isStack ? styles.cardSlice : styles.gridCardItem} ${isGC ? styles.isGameChanger : ''}`}
    >
      {/* Premium Sheen Overlay */}
      <div className={styles.sheenWrapper}>
        <div className={styles.sheen} />
        <div className={styles.glareLine} />
      </div>
      {/* Game Changer Badge */}
      {isGC && (
        <div className={styles.gameChangerBadge} title="Game Changer">
          <span>⚡</span>
        </div>
      )}

      {/* 3D Flip Card Container */}
      <div className={styles.card3dContainer}>
        <div className={`${styles.card3dInner} ${isFlipped ? styles.isFlipped : ''}`}>
          {/* Front Face */}
          <div className={styles.card3dFront}>
            {card.image_url ? (
              <img 
                src={card.image_url} 
                alt={card.card_name}
                style={{ width: '100%', height: '100%', objectFit: 'fill' }}
              />
            ) : (
              <div style={{ 
                width: '100%', height: '100%', background: '#111', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: '#444', fontWeight: 'bold' 
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: isGC ? 'var(--color-gold)' : 'white' }}>{card.card_name}</span>
                  {userCollection.has(card.card_name.toLowerCase()) && (
                    <span title="En tu colección personal" style={{ fontSize: '0.8rem' }}>📦</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Back Face */}
          <div className={styles.card3dBack}>
            {card.back_image_url ? (
              <img 
                src={card.back_image_url} 
                alt={`${card.card_name} (back)`}
                style={{ width: '100%', height: '100%', objectFit: 'fill' }}
              />
            ) : (
              <div style={{ 
                width: '100%', height: '100%', background: '#000', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333' 
              }}>
                <div style={{ width: '80%', height: '80%', border: '4px solid #1a1a1a', borderRadius: '12px' }}></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Corner Quantity Indicator */}
      <div className={styles.quantityBadge}>
          {card.quantity}
      </div>

      {/* Flip Button */}
      {(card.back_image_url || (card.type_line?.includes('//') || card.card_name.includes('//'))) && (
        <div style={{ 
          position: 'absolute', top: '50%', left: '12px', 
          transform: 'translateY(-50%)',
          zIndex: 5,
          opacity: (isLast || isHovered) ? 1 : 0,
          transition: 'opacity 0.2s',
          pointerEvents: (isLast || isHovered) ? 'auto' : 'none'
        }}>
          <button 
            onClick={onFlip}
            className={styles.flipBtnPremium}
            title="Voltear carta (DFC)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
              <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
              <path d="M16 16h5v5"/>
            </svg>
          </button>
        </div>
      )}
      {/* Vertical Control Sidebar */}
      {isOwner && (
        <div 
          className={styles.controlSidebar}
          style={{ 
            opacity: (isLast || isHovered) ? 1 : 0, 
            pointerEvents: (isLast || isHovered) ? 'auto' : 'none',
          }}
        >
            <button 
              onClick={(e) => { e.stopPropagation(); onAddOne?.(); }}
              className={`${styles.controlBtn} ${styles.addBtn}`}
              title="Añadir una"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onRemove?.(); }}
              className={`${styles.controlBtn} ${styles.removeBtn}`}
              title="Quitar"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onEditTags?.(); }}
              className={`${styles.controlBtn} ${styles.tagsBtn}`}
              title="Editar Tags"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); onShowInfo?.(); }}
              className={`${styles.controlBtn} ${styles.infoBtn}`}
              title="Ver Detalles"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            </button>
        </div>
      )}
    </div>
  );
};

export default CardItem;
