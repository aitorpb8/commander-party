
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import DeckCard from '@/components/DeckCard';
import Link from 'next/link';
import { calculateDeckBudget } from '@/lib/budgetUtils';

// Force revalidation on every request to show fresh budget data
export const revalidate = 0;

export default async function DecksPage(props: { searchParams: Promise<{ user?: string }> }) {
  const searchParams = await props.searchParams;
  const filterUser = searchParams.user;
  
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
      },
    }
  );

  let query = supabase
    .from('decks')
    .select('*, profiles!user_id(username)');
  
  if (filterUser) {
    query = query.eq('user_id', filterUser);
  }

  const { data: decks } = await query;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-gold)' }}>
          {filterUser ? 'Mazos del Jugador' : 'Explorar los Mazos de la Party'}
        </h1>
        <Link href="/decks/new" className="btn btn-gold">Registrar Mi Mazo</Link>
      </div>

      {!decks || decks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '5rem', border: '1px dashed #444', borderRadius: '12px' }}>
          <p style={{ color: '#888' }}>Aún no hay mazos en esta liga.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '2rem' }}>
          {decks.map((deck: any) => (
            <Link href={`/decks/${deck.id}`} key={deck.id}>
              {(() => {
                const { dynamicLimit, totalSpent } = calculateDeckBudget(deck.created_at, deck.budget_spent);
                return (
                  <DeckCard 
                    playerName={deck.profiles?.username || 'Invitado'}
                    deckName={deck.name}
                    commanderName={deck.commander}
                    spent={totalSpent}
                    budget={dynamicLimit}
                    imageUrl={deck.image_url || 'https://via.placeholder.com/150'}
                    colors={[]}
                  />
                );
              })()}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
