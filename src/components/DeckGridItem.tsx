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
}

export default function DeckGridItem({ deck, currentUserId, customSpent, customBudget }: DeckGridItemProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isDeleting, setIsDeleting] = useState(false);

  const { dynamicLimit, totalSpent } = calculateDeckBudget(deck.created_at, deck.budget_spent);
  
  const finalSpent = customSpent !== undefined ? customSpent : totalSpent;
  const finalBudget = customBudget !== undefined ? customBudget : dynamicLimit;
  
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
                spent={finalSpent}
                budget={finalBudget}
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
