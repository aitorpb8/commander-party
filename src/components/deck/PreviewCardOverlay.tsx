
import React from 'react';
import { createPortal } from 'react-dom';

interface PreviewCardOverlayProps {
  previewCard: { name: string, image: string, x: number, y: number } | null;
}

export default function PreviewCardOverlay({ previewCard }: PreviewCardOverlayProps) {
  if (!previewCard || typeof document === 'undefined') return null;

  const cardWidth = 280;
  const cardHeight = 390;
  const offset = 20;
  
  let left = previewCard.x + offset;
  let top = previewCard.y + offset;
  
  if (left + cardWidth > window.innerWidth) {
    left = previewCard.x - cardWidth - offset;
  }
  
  if (top + cardHeight > window.innerHeight) {
    top = Math.max(10, window.innerHeight - cardHeight - 10);
  }

  return createPortal(
    <div 
      style={{ 
        position: 'fixed', 
        top: top, 
        left: left, 
        zIndex: 9999999, 
        pointerEvents: 'none',
        animation: 'fadeIn 0.2s ease-out'
      }}
    >
      <img 
        src={previewCard.image} 
        alt={previewCard.name}
        style={{ 
          width: `${cardWidth}px`, 
          borderRadius: '14px', 
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
          border: '1px solid rgba(255,255,255,0.2)'
        }}
      />
    </div>,
    document.body
  );
}
