import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import DeckGridItem from '@/components/DeckGridItem';
import Link from 'next/link';
import { calculateDeckBudget } from '@/lib/budgetUtils';
import styles from './DecksPage.module.css';

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

  // Fetch card tags to derive per-deck strategy tags
  const deckIds = decks?.map((d: any) => d.id) || [];
  const { data: allCardTags } = deckIds.length > 0
    ? await supabase.from('deck_card_tags').select('deck_id, tags').in('deck_id', deckIds)
    : { data: [] };

  // Compute top-4 most frequent tags per deck
  const deckStrategyTagsMap = new Map<string, string[]>();
  (allCardTags || []).forEach((row: any) => {
    if (!row.tags) return;
    const freq = deckStrategyTagsMap.get(row.deck_id) as any || {};
    row.tags.forEach((tag: string) => { freq[tag] = (freq[tag] || 0) + 1; });
    deckStrategyTagsMap.set(row.deck_id, freq);
  });
  const deckTopTagsMap = new Map<string, string[]>();
  deckStrategyTagsMap.forEach((freq: any, deckId) => {
    const sorted = Object.entries(freq).sort(([,a],[,b]) => (b as number) - (a as number));
    deckTopTagsMap.set(deckId, sorted.slice(0, 4).map(([tag]) => tag));
  });

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {filterUser ? 'Mazos del Jugador' : 'Explorar los Mazos de la Party'}
        </h1>
        <Link href="/decks/new" className="btn-premium btn-premium-gold">Registrar Mi Mazo</Link>
      </div>

      {!decks || decks.length === 0 ? (
        <div className={styles.emptyState}>
          <p className={styles.emptyText}>Aún no hay mazos en esta liga.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {decks.map((deck: any) => {
             const currentMonthSpent = monthlySpendMap.get(deck.id) || 0;
             const budgetInfo = calculateDeckBudget(deck.created_at, deck.budget_spent || 0);
             const monthlyCupo = Math.max(0, budgetInfo.remaining + currentMonthSpent);

             return (
              <DeckGridItem 
                key={deck.id} 
                deck={deck} 
                currentUserId={user?.id}
                customSpent={currentMonthSpent}
                customBudget={monthlyCupo}
                totalSpent={budgetInfo.totalSpent}
                leagueBudget={budgetInfo.dynamicLimit}
                remainingBalance={budgetInfo.remaining}
                strategyTags={deckTopTagsMap.get(deck.id) || []}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
