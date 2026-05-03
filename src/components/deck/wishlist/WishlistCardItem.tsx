import React, { useState, useRef, useEffect } from 'react';
import { WishlistCard } from '@/hooks/useWishlist';
import { IconSwap, IconTrash, IconRefresh } from '@/components/deck/wishlist/WishlistIcons';

interface WishlistCardItemProps {
  card: WishlistCard;
  isOwner: boolean;
  trendingPrice: number | undefined;
  monthOptions: { value: string, label: string }[];
  onOpenVersionPicker: (card: WishlistCard) => void;
  onUpdateMonth: (id: string, month: string | null) => void;
  onUpdateSwap: (id: string, cardOut: string | null) => void;
  onRemove: (id: string) => void;
  onStartSwap: (card: WishlistCard) => void;
}

const WishlistCardItem: React.FC<WishlistCardItemProps> = ({
  card,
  isOwner,
  trendingPrice,
  monthOptions,
  onOpenVersionPicker,
  onUpdateMonth,
  onUpdateSwap,
  onRemove,
  onStartSwap
}) => {
  const price = trendingPrice !== undefined ? trendingPrice : card.price;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const toggleDropdown = (e: React.MouseEvent) => {
    if (!isOwner) return;
    setIsDropdownOpen(!isDropdownOpen);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const clickedOutsideTrigger = dropdownRef.current && !dropdownRef.current.contains(target);
      const clickedOutsideMenu = menuRef.current && !menuRef.current.contains(target);
      
      if (clickedOutsideTrigger && clickedOutsideMenu) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  return (
    <div className="wishlist-card-premium" style={{ 
      display: 'flex', 
      gap: '1rem', 
      background: 'rgba(255, 255, 255, 0.03)', 
      padding: '1rem', 
      borderRadius: '16px', 
      border: '1px solid rgba(255, 255, 255, 0.05)',
      transition: 'all 0.3s ease',
      position: 'relative',
      overflow: 'visible',
      zIndex: isDropdownOpen ? 100 : 1
    }}>
      {/* Left side: Image + Basic Info */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', minWidth: '90px' }}>
        <div 
          onClick={() => isOwner && onOpenVersionPicker(card)}
          style={{ cursor: isOwner ? 'pointer' : 'default', position: 'relative' }}
          className="wishlist-image-container"
        >
          {card.image_url ? (
            <img 
              src={card.image_url} 
              style={{ width: '70px', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }} 
              alt={card.card_name} 
            />
          ) : (
            <div style={{ 
              width: '70px', height: '98px', background: '#222', borderRadius: '8px', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              fontSize: '0.6rem', color: '#555', border: '1px dashed #444' 
            }}>?</div>
          )}
          {isOwner && (
            <div style={{ 
              position: 'absolute', bottom: -4, right: -4, background: 'var(--color-gold)', 
              width: '24px', height: '24px', borderRadius: '50%', 
              display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000',
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
              border: '2px solid #1c1c1c',
              zIndex: 2
            }}>
              <IconRefresh size={12} />
            </div>
          )}
        </div>
        
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontWeight: '800', marginBottom: '2px', fontSize: '0.85rem', lineHeight: '1.2', color: '#fff' }}>
            {card.card_name}
          </div>
          <div style={{ 
            fontSize: '0.85rem', color: 'var(--color-gold)', 
            display: 'flex', alignItems: 'center', gap: '4px', justifyContent: 'center',
            fontWeight: '700'
          }}>
            {price?.toFixed(2)}€
            {trendingPrice !== undefined && <span style={{ fontSize: '0.7rem', opacity: 0.8 }} title="Precio en tendencia real">🔥</span>}
          </div>
          
          {card.card_out && (
            <div 
              onClick={() => isOwner && onUpdateSwap(card.id, null)}
              style={{ 
                fontSize: '0.7rem', color: 'var(--color-red)', marginTop: '6px', 
                cursor: isOwner ? 'pointer' : 'default', 
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', 
                background: 'rgba(244, 67, 54, 0.1)', padding: '3px 8px', borderRadius: '6px',
                border: '1px solid rgba(244, 67, 54, 0.2)',
                fontWeight: 'bold'
              }}
              title="Quitar sustitución"
            >
               Sale: {card.card_out} {isOwner && <span>✕</span>}
            </div>
          )}
        </div>
      </div>

      {/* Right side: Controls */}
      {isOwner && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: 'auto', justifyContent: 'center', minWidth: '150px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '0.6rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: '900' }}>Planificar para:</span>
                <div style={{ position: 'relative' }} ref={dropdownRef}>
                  <div
                    onClick={toggleDropdown}
                    style={{
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      fontSize: '0.85rem',
                      cursor: isOwner ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                    onMouseEnter={(e) => { if(isOwner) e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.4)' }}
                    onMouseLeave={(e) => { if(isOwner) e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
                  >
                    {card.target_month ? (monthOptions.find(o => o.value === card.target_month)?.label || '📥 Backlog') : '📥 Backlog'}
                    {isOwner && <span style={{ fontSize: '0.6rem', color: 'var(--color-gold)', transform: isDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>}
                  </div>
                  
                  {isDropdownOpen && isOwner && (
                    <div ref={menuRef} style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      marginTop: '4px',
                      background: 'rgba(20, 20, 20, 0.95)',
                      backdropFilter: 'blur(20px)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '12px',
                      boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                      zIndex: 50,
                      overflow: 'hidden'
                    }}>
                      <div 
                        onClick={() => { onUpdateMonth(card.id, null); setIsDropdownOpen(false); }}
                        style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)', background: !card.target_month ? 'rgba(212, 175, 55, 0.1)' : 'transparent', color: !card.target_month ? 'var(--color-gold)' : '#fff' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = !card.target_month ? 'rgba(212, 175, 55, 0.1)' : 'transparent'}
                      >
                        📥 Backlog
                      </div>
                      <div style={{ padding: '6px 12px', fontSize: '0.65rem', color: '#888', background: 'rgba(0,0,0,0.5)', fontWeight: 'bold', textTransform: 'uppercase' }}>
                        Asignar a mes...
                      </div>
                      <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                        {monthOptions.map(opt => (
                          <div
                            key={opt.value}
                            onClick={() => { onUpdateMonth(card.id, opt.value); setIsDropdownOpen(false); }}
                            style={{ padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', background: card.target_month === opt.value ? 'rgba(212, 175, 55, 0.1)' : 'transparent', color: card.target_month === opt.value ? 'var(--color-gold)' : '#fff' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212, 175, 55, 0.15)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = card.target_month === opt.value ? 'rgba(212, 175, 55, 0.1)' : 'transparent'}
                          >
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
            </div>
            
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <button 
                    onClick={() => onStartSwap(card)}
                    className="btn-action-premium"
                    title="Seleccionar carta a sustituir"
                    style={{ 
                        flex: 1, 
                        padding: '10px 0', 
                        background: card.card_out ? 'rgba(255,255,255,0.08)' : 'rgba(212, 175, 55, 0.15)', 
                        color: card.card_out ? '#fff' : 'var(--color-gold)', 
                        fontSize: '0.75rem', 
                        border: `1px solid ${card.card_out ? 'rgba(255,255,255,0.15)' : 'rgba(212, 175, 55, 0.4)'}`, 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        boxShadow: card.card_out ? 'none' : '0 4px 15px rgba(212, 175, 55, 0.1)'
                    }}
                >
                    {card.card_out ? '✏️ EDITAR' : <><IconSwap /> SUSTITUIR</>}
                </button>
                <button 
                    onClick={() => onRemove(card.id)}
                    className="btn-action-premium"
                    title="Eliminar del backlog"
                    style={{ 
                        padding: '10px 14px', 
                        background: 'rgba(239, 68, 68, 0.08)', 
                        color: 'var(--color-red)',
                        fontSize: '0.85rem', 
                        border: '1px solid rgba(239, 68, 68, 0.25)', 
                        borderRadius: '12px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                >
                    <IconTrash />
                </button>
            </div>
        </div>
      )}

      <style jsx>{`
        .wishlist-card-premium:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateX(4px);
        }
        .btn-action-premium:hover {
          filter: brightness(1.2);
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default WishlistCardItem;
