'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DeckCard from '@/components/DeckCard';
import { createClient } from '@/lib/supabaseClient';
import { calculateDeckBudget } from '@/lib/budgetUtils';

interface DeckGridItemProps {
  deck: any;
  currentUserId?: string;
  customSpent?: number;
  customBudget?: number;
  totalSpent?: number;
  leagueBudget?: number;
  remainingBalance?: number;
}

export default function DeckGridItem({ 
  deck, currentUserId, customSpent, customBudget,
  totalSpent, leagueBudget, remainingBalance
}: DeckGridItemProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const finalMonthlySpent = customSpent !== undefined ? customSpent : 0;
  const finalMonthlyBudget = customBudget !== undefined ? customBudget : 0;
  
  const isOwner = currentUserId === deck.user_id;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('¿Estás seguro de que quieres eliminar este mazo? Esta acción no se puede deshacer.')) {
      return;
    }

    setIsDeleting(true);
    const { error } = await supabase
      .from('decks')
      .delete()
      .eq('id', deck.id);

    if (error) {
      alert('Error al eliminar el mazo: ' + error.message);
      setIsDeleting(false);
    } else {
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
            />
        </Link>
        {isOwner && (
            <button
                onClick={handleDelete}
                disabled={isDeleting}
                title="Eliminar Mazo"
                style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: 'transparent',
                    width: '32px',
                    height: '32px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem',
                    zIndex: 10
                }}
                className="hover-red-bg"
            >
                {isDeleting ? '...' : '🗑️'}
            </button>
        )}
    </div>
  );
}
