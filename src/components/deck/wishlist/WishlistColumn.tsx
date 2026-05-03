import React from 'react';
import { WishlistCard } from '@/hooks/useWishlist';
import WishlistCardItem from './WishlistCardItem';
import { IconInbox, IconPlus } from '@/components/deck/wishlist/WishlistIcons';
import { MONTHLY_ALLOWANCE } from '@/lib/constants';

interface WishlistColumnProps {
  monthKey: string;
  items: WishlistCard[];
  isOwner: boolean;
  currentMonthKey: string;
  trendingPrices: Record<string, number>;
  monthOptions: { value: string, label: string }[];
  onAddAllToMainboard: (key: string) => void;
  onOpenVersionPicker: (card: WishlistCard) => void;
  onUpdateMonth: (id: string, month: string | null) => void;
  onUpdateSwap: (id: string, cardOut: string | null) => void;
  onRemove: (id: string) => void;
  onStartSwap: (card: WishlistCard) => void;
}

const WishlistColumn: React.FC<WishlistColumnProps> = ({
  monthKey,
  items,
  isOwner,
  currentMonthKey,
  trendingPrices,
  monthOptions,
  onAddAllToMainboard,
  onOpenVersionPicker,
  onUpdateMonth,
  onUpdateSwap,
  onRemove,
  onStartSwap
}) => {
  const isBacklog = monthKey === 'backlog';
  
  const monthTotal = items.reduce((sum, item) => {
      const trending = item.scryfall_id ? trendingPrices[item.scryfall_id] : trendingPrices[item.card_name.toLowerCase()];
      return sum + (trending !== undefined ? trending : (item.price || 0));
  }, 0);
  
  let statusColor = '#3f3f46';
  let headerBg = isBacklog ? 'rgba(63, 63, 70, 0.2)' : 'rgba(0, 0, 0, 0.3)';
  let textColor = '#fff';
  let borderColor = isBacklog ? 'rgba(63, 63, 70, 0.3)' : 'rgba(255, 255, 255, 0.05)';

  if (!isBacklog) {
    if (monthTotal > 11) { // High alert
      statusColor = 'var(--color-red)';
      headerBg = 'rgba(244, 67, 54, 0.15)';
      textColor = 'var(--color-red)';
      borderColor = 'var(--color-red)';
    } else if (monthTotal > MONTHLY_ALLOWANCE) { // Warning
      statusColor = '#ff9800'; 
      headerBg = 'rgba(255, 152, 0, 0.15)';
      textColor = '#ff9800';
      borderColor = '#ff9800';
    }
  }
  
  const date = new Date(`${monthKey}-01`);
  const monthName = date.toLocaleDateString('es-ES', { month: 'long' });
  const year = date.getFullYear();
  const title = isBacklog ? <><IconInbox /> Backlog</> : `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} ${year}`;

  return (
    <div className="wishlist-column-premium" style={{ 
        background: isBacklog ? 'rgba(39, 39, 42, 0.5)' : 'rgba(0, 0, 0, 0.4)', 
        borderRadius: '20px', 
        border: `1px solid ${borderColor}`,
        overflow: 'hidden',
        minWidth: '340px',
        maxWidth: '340px',
        scrollSnapAlign: 'start',
        display: 'flex',
        flexDirection: 'column',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        contain: 'content',
        willChange: 'transform'
    }}>
      {/* HEADER */}
      <div style={{ 
          padding: '1.25rem', 
          background: headerBg,
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          borderBottom: `1px solid ${borderColor}`
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          <h4 style={{ margin: 0, fontSize: '1.1rem', color: textColor, display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '800' }}>
              {title}
          </h4>
          <span style={{ opacity: 0.4, fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>{items.length} CARTAS PLANIFICADAS</span>
        </div>
        
        <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px' }}>ESTIMADO</div>
            <div style={{ fontWeight: '900', fontSize: '1.2rem', color: !isBacklog && monthTotal > MONTHLY_ALLOWANCE ? textColor : 'var(--color-gold)', fontFamily: 'monospace' }}>
                {monthTotal.toFixed(2)}€
            </div>
        </div>
      </div>

      {/* ACTION BAR (Only for current month) */}
      {!isBacklog && monthKey === currentMonthKey && items.length > 0 && isOwner && (
        <div style={{ padding: '0.75rem 1rem', background: 'rgba(212, 175, 55, 0.05)', borderBottom: '1px solid rgba(212, 175, 55, 0.1)' }}>
            <button
                onClick={() => onAddAllToMainboard(monthKey)}
                className="btn-add-all-premium"
                style={{
                    width: '100%',
                    padding: '8px',
                    background: 'var(--color-gold)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: '900',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    boxShadow: '0 4px 15px rgba(212, 175, 55, 0.3)',
                    transition: 'all 0.2s'
                }}
            >
                <IconPlus /> Aplicar cambios al mazo
            </button>
        </div>
      )}

      {/* LIST */}
      <div className="custom-scrollbar" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', overflowY: 'auto', flex: 1 }}>
        {items.length === 0 ? (
            <div style={{ padding: '3rem 1rem', textAlign: 'center', color: '#444', fontStyle: 'italic', fontSize: '0.9rem' }}>
                No hay cartas planificadas.
            </div>
        ) : (
            items.map(card => (
                <WishlistCardItem 
                    key={card.id}
                    card={card}
                    isOwner={isOwner}
                    trendingPrice={card.scryfall_id ? trendingPrices[card.scryfall_id] : trendingPrices[card.card_name.toLowerCase()]}
                    monthOptions={monthOptions}
                    onOpenVersionPicker={onOpenVersionPicker}
                    onUpdateMonth={onUpdateMonth}
                    onUpdateSwap={onUpdateSwap}
                    onRemove={onRemove}
                    onStartSwap={onStartSwap}
                />
            ))
        )}
      </div>

      <style jsx>{`
        .btn-add-all-premium:hover {
            transform: translateY(-2px);
            filter: brightness(1.1);
            boxShadow: 0 6px 20px rgba(212, 175, 55, 0.4);
        }
        .wishlist-column-premium {
            transition: border-color 0.3s ease;
        }
      `}</style>
    </div>
  );
};

export default WishlistColumn;
