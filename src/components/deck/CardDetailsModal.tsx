
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { DeckCard } from '@/types';
import { renderSymbols } from '@/components/ManaSymbols';

interface CardDetailsModalProps {
  activeInfoCard: DeckCard;
  fullCardData: any;
  onClose: () => void;
  isLoadingInfo: boolean;
  isOwner: boolean;
  onUpdateDeck?: (change: { card_in?: any, card_out?: string, description?: string, quantity?: number, is_commander?: boolean }) => Promise<void> | void;
  onOpenVersionPicker: () => void;
  onEditTags: () => void;
  onRemoveCard: () => void;
  cardTags: Record<string, string[]>;
}

export default function CardDetailsModal({
  activeInfoCard,
  fullCardData,
  onClose,
  isLoadingInfo,
  isOwner,
  onUpdateDeck,
  onOpenVersionPicker,
  onEditTags,
  onRemoveCard,
  cardTags
}: CardDetailsModalProps) {
  const [modalFace, setModalFace] = useState(0);

  if (!activeInfoCard) return null;

  return createPortal(
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.85)', zIndex: 10000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(10px)'
    }} onClick={onClose}>
      <div 
        className="card-detail-modal"
        style={{ 
          maxWidth: '1000px', width: '100%', maxHeight: '90vh', 
          display: 'flex', gap: '2rem', 
          padding: '2rem', border: '1px solid #444', 
          boxShadow: '0 25px 50px rgba(0,0,0,0.9)',
          background: '#121212', borderRadius: '24px',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="modal-close-btn"
          style={{ 
            position: 'absolute', top: '15px', right: '15px', 
            background: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', 
            width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem',
            zIndex: 10
          }}
        >✕</button>

        {/* Left: Card Render */}
        <div className="card-modal-left">
          <img 
            src={(fullCardData?.card_faces && fullCardData.card_faces[modalFace]?.image_uris?.normal) || activeInfoCard.image_url || ''} 
            alt={activeInfoCard.card_name} 
            className="card-modal-image"
          />
          
          {/* Modal Face Flip Button */}
          {fullCardData?.card_faces && fullCardData.card_faces.length > 1 && (
            <button 
              onClick={() => setModalFace(prev => (prev === 0 ? 1 : 0))}
              className="flip-btn-premium"
              style={{
                marginTop: '1.5rem', 
                width: '50px', height: '50px',
                borderRadius: '50%',
                background: 'var(--color-gold)',
                color: '#000', 
                border: 'none', 
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 15px rgba(212,175,55,0.4)',
                transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.1) rotate(180deg)';
                e.currentTarget.style.boxShadow = '0 0 25px rgba(212, 175, 55, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1) rotate(0deg)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(212,175,55,0.4)';
              }}
              title="Ver Reverso"
            >
               <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                  <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/>
                  <path d="M16 16h5v5"/>
                </svg>
            </button>
          )}
        </div>

        {/* Right: Info & Controls */}
        <div className="card-modal-right">
          <div>
            <h2 style={{ color: 'var(--color-gold)', margin: 0, fontSize: '2rem', fontWeight: '800', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              {fullCardData?.card_faces ? fullCardData.card_faces[modalFace]?.name : activeInfoCard.card_name}
            </h2>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.8rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ color: '#aaa', fontSize: '1rem' }}>
                {fullCardData?.card_faces ? fullCardData.card_faces[modalFace]?.type_line : activeInfoCard.type_line}
              </span>
              <div style={{ background: '#1a1a1a', padding: '4px 10px', borderRadius: '8px', color: 'var(--color-gold)', border: '1px solid rgba(212,175,55,0.3)', fontWeight: 'bold', display: 'flex', gap: '4px', fontSize: '0.9rem' }}>
                {renderSymbols(fullCardData?.card_faces ? fullCardData.card_faces[modalFace]?.mana_cost : activeInfoCard.mana_cost)}
              </div>
            </div>
          </div>

           {/* Mobile Management Controls */}
           {isOwner && (
             <div style={{ background: '#111', padding: '1rem', borderRadius: '12px', border: '1px solid #333', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <h4 style={{ margin: 0, color: '#888', textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '1px' }}>Gestión de Carta</h4>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                   {/* Quantity */}
                   <div style={{ display: 'flex', alignItems: 'center', background: '#000', borderRadius: '8px', border: '1px solid #333' }}>
                      <button 
                        onClick={() => {
                            if (activeInfoCard.quantity > 1) {
                               const newQty = activeInfoCard.quantity - 1;
                               onUpdateDeck?.({ card_in: {...activeInfoCard, quantity: newQty}, card_out: activeInfoCard.card_name }); 
                            } else {
                               onRemoveCard();
                            }
                         }}
                        className="btn"
                        style={{ padding: '4px 12px', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                      >−</button>
                      <span style={{ padding: '0 8px', fontWeight: 'bold', minWidth: '30px', textAlign: 'center' }}>{activeInfoCard.quantity}</span>
                      <button 
                         onClick={() => {
                            const newQty = activeInfoCard.quantity + 1;
                            onUpdateDeck?.({ card_in: {...activeInfoCard, quantity: newQty}, card_out: activeInfoCard.card_name });
                         }}
                        className="btn"
                         style={{ padding: '4px 12px', background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem', cursor: 'pointer' }}
                      >+</button>
                   </div>

                    {/* Version Selection */}
                    <button 
                      onClick={onOpenVersionPicker}
                      className="btn"
                      style={{ background: '#222', fontSize: '0.9rem', padding: '8px 16px', border: '1px solid #444', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      🔄 Cambiar Edición
                    </button>

                   {/* Tags */}
                   <button 
                     onClick={onEditTags}
                     className="btn"
                     style={{ background: '#222', fontSize: '0.9rem', padding: '8px 16px', border: '1px solid #444' }}
                   >
                     🏷️ Etiquetas
                   </button>

                    {/* Remove */}
                    <button 
                      onClick={onRemoveCard}
                      className="btn"
                      style={{ background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', fontSize: '0.9rem', padding: '8px 12px', border: '1px solid rgba(255, 68, 68, 0.3)' }}
                    >
                      🗑️
                    </button>

                    {/* Set as Commander Toggle - Only if eligible */}
                    {(() => {
                       const typeLine = (fullCardData?.type_line || activeInfoCard.type_line || '').toLowerCase();
                       const oracleText = (fullCardData?.oracle_text || activeInfoCard.oracle_text || '').toLowerCase();
                       const isLegendary = typeLine.includes('legendary');
                       const isCreature = typeLine.includes('creature');
                       const isPlaneswalker = typeLine.includes('planeswalker');
                       const isBackground = typeLine.includes('background') && typeLine.includes('enchantment');
                       const canBeCommander = oracleText.includes('can be your commander') || oracleText.includes('puede ser tu comandante');
                       
                       if (activeInfoCard.is_commander || (isLegendary && (isCreature || isBackground || (isPlaneswalker && canBeCommander)))) {
                         return (
                           <button 
                             onClick={() => {
                                const newIsCommander = !activeInfoCard.is_commander;
                                onUpdateDeck?.({ card_in: {...activeInfoCard, is_commander: newIsCommander}, card_out: activeInfoCard.card_name });
                             }}
                             className="btn"
                             style={{ 
                               background: activeInfoCard.is_commander ? 'var(--color-gold)' : '#222', 
                               color: activeInfoCard.is_commander ? '#000' : '#888',
                               fontSize: '0.8rem', padding: '8px 12px', border: '1px solid #444',
                               fontWeight: 'bold'
                             }}
                           >
                             {activeInfoCard.is_commander ? '👑 Comandante' : 'Set Commander'}
                           </button>
                         );
                       }
                       return null;
                    })()}
                </div>
             </div>
           )}
          
          <div style={{ 
            background: '#111', padding: '1.5rem', borderRadius: '16px', border: '1px solid #222',
            lineHeight: '1.6', fontSize: '1.1rem', color: '#E0E0E0', 
            flex: 1, overflowY: 'auto'
          }}>
            <div style={{ fontWeight: 'bold', color: 'var(--color-gold)', marginBottom: '1rem', fontSize: '0.9rem', textTransform: 'uppercase', opacity: 0.8 }}>
               <span>Oracle Text ({modalFace === 0 ? 'Front' : 'Back'})</span>
            </div>
             <div style={{ whiteSpace: 'pre-wrap', color: '#fff', fontSize: '1.1rem', fontWeight: '500' }}>
               {isLoadingInfo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: 0.5 }}>
                   <div className="animate-spin" style={{ width: '20px', height: '20px', border: '2px solid #555', borderTopColor: 'var(--color-gold)', borderRadius: '50%' }}></div>
                   Cargando...
                 </div>
               ) : (
                 renderSymbols((fullCardData?.card_faces && fullCardData.card_faces[modalFace]?.oracle_text) || (modalFace === 0 ? activeInfoCard.oracle_text : '') || 'No text found.')
               )}
             </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
