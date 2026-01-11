import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleMouseEnter = (e: React.MouseEvent) => {
    setIsVisible(true);
    updatePosition(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    updatePosition(e);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  const updatePosition = (e: React.MouseEvent) => {
    // Keep standard offset
    setPosition({ x: e.clientX + 10, y: e.clientY + 10 });
  };

  return (
    <>
      <div 
        onMouseEnter={handleMouseEnter} 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'inline-flex', cursor: 'help' }}
      >
        {children}
      </div>
      {mounted && isVisible && createPortal(
        <div style={{
          position: 'fixed',
          top: position.y,
          left: position.x,
          background: 'rgba(20, 20, 20, 0.95)',
          border: '1px solid var(--color-gold)',
          padding: '0.6rem 0.9rem',
          borderRadius: '6px',
          color: '#fff',
          fontSize: '0.85rem',
          zIndex: 99999,
          maxWidth: '280px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          pointerEvents: 'none',
          whiteSpace: 'normal',
          lineHeight: '1.4',
          backdropFilter: 'blur(4px)'
        }}>
          {content}
        </div>,
        document.body
      )}
    </>
  );
};
