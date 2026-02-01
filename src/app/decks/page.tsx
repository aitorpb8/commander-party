import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import DeckCard from '@/components/DeckCard';
import DeckGridItem from '@/components/DeckGridItem';
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
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
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

  const { data: { user } } = await supabase.auth.getUser();

  const { data: decks } = await query;

  // Fetch current month upgrades for budget calculation
  const currentMonth = new Date().toISOString().slice(0, 7);
  const { data: monthlyUpgrades } = await supabase
    .from('deck_upgrades')
    .select('deck_id, cost')
    .eq('month', currentMonth);

  const monthlySpendMap = new Map<string, number>();
  monthlyUpgrades?.forEach((u: any) => {
    monthlySpendMap.set(u.deck_id, (monthlySpendMap.get(u.deck_id) || 0) + (u.cost || 0));
  });

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
          {decks.map((deck: any) => {
             const { dynamicLimit } = calculateDeckBudget(deck.created_at);
             const currentMonthSpent = monthlySpendMap.get(deck.id) || 0;
             const totalSpent = deck.budget_spent || 0;
             
             // Effective Limit = Total Cumulative Limit - (Spent in Previous Months)
             const spentPrevious = totalSpent - currentMonthSpent;
             const effectiveBudget = Math.max(0, dynamicLimit - spentPrevious);

             return (
              <DeckGridItem 
                key={deck.id} 
                deck={deck} 
                currentUserId={user?.id}
                customSpent={currentMonthSpent}
                customBudget={effectiveBudget}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
