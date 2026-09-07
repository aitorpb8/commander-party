'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeckCard from '@/components/DeckCard';
import { createClient } from '@/lib/supabaseClient';
import { calculateDeckBudget } from '@/lib/budgetUtils';

import ConfirmDeleteModal from '@/components/deck/ConfirmDeleteModal';

interface DeckGridItemProps {
  deck: any;
  currentUserId?: string;
  customSpent?: number;
  customBudget?: number;
  totalSpent?: number;
  leagueBudget?: number;
  remainingBalance?: number;
  strategyTags?: string[];
}

export default function DeckGridItem({ 
  deck, currentUserId, customSpent, customBudget,
  totalSpent, leagueBudget, remainingBalance, strategyTags = []
}: DeckGridItemProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const finalMonthlySpent = customSpent !== undefined ? customSpent : 0;
  const finalMonthlyBudget = customBudget !== undefined ? customBudget : 0;
  
  const isOwner = currentUserId === deck.user_id;

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    const { error } = await supabase
      .from('decks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', deck.id);

    if (error) {
      alert('Error al archivar el mazo: ' + error.message);
      setIsDeleting(false);
    } else {
      setShowDeleteModal(false);
      setIsDeleting(false);
      router.refresh();
    }
  };

  return (
    <div style={{ position: 'relative' }}>
        <Link href={`/decks/${deck.id}`}>
            <DeckCard 
                playerName={deck.profiles?.username || 'Invitado'}
                deckName={deck.name}
                commanderName={deck.commander}
                spent={finalMonthlySpent}
                budget={finalMonthlyBudget}
                totalSpent={totalSpent}
                leagueBudget={leagueBudget}
                remainingBalance={remainingBalance}
                imageUrl={deck.image_url || 'https://via.placeholder.com/150'}
                colors={[]}
                strategyTags={strategyTags}
            />
        </Link>
        {isOwner && (
          <>
            <button
                onClick={handleDeleteClick}
                disabled={isDeleting}
                title="Eliminar / Archivar Mazo"
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderRadius: '6px',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.1rem',
                    zIndex: 10,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
                className="hover-red-bg"
            >
                {isDeleting ? '...' : '🗑️'}
            </button>
            <ConfirmDeleteModal
              isOpen={showDeleteModal}
              deckName={deck.name}
              commanderName={deck.commander}
              isDeleting={isDeleting}
              onClose={() => setShowDeleteModal(false)}
              onConfirm={handleConfirmDelete}
            />
          </>
        )}
    </div>
  );
}
