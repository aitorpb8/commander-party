import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Image from "next/image";
import DeckCard from "@/components/DeckCard";
import { calculateDeckBudget } from '@/lib/budgetUtils';
import { MONTHLY_ALLOWANCE } from '@/lib/constants';

import styles from "./page.module.css";

// Force revalidation on every request to show fresh budget data
export const revalidate = 0;

export default async function Home() {
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

  // Fetch Decks with Profile info - Using more robust query
  // We try to get all decks first. If the join fails, at least we see empty profiles.
  const { data: decks, error: decksError } = await supabase
    .from("decks")
    .select(`*, profiles:user_id (username, avatar_url)`);

  const { count: playerCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true });
    
  const { data: matches } = await supabase
    .from("matches")
    .select("*, profiles!winner_id(username, avatar_url)")
    .not('winner_id', 'is', null)
    .order("created_at", { ascending: false })
    .limit(5);

  const activityFeed = matches || [];

  // Fetch current user to check their personal deck count
  const { data: { user } } = await supabase.auth.getUser();
  let userDeckCount = 0;
  if (user) {
    const { count } = await supabase
      .from("decks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    userDeckCount = count || 0;
  }
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
    <div className="container">
      {/* HERO SECTION */}
      <section className="hero-section">
        <div className={`hide-mobile ${styles.heroContentBox}`}>PARTY!</div>
        <div className={`hide-mobile ${styles.heroContentBadge}`}>{MONTHLY_ALLOWANCE}€ BUDGET</div>

        <h1 className="hero-title">
          Commander Party
        </h1>
        <p className="hero-subtitle">
          Evoluciona tu mazo con inteligencia. La liga más gamberra donde el dinero no compra la victoria.
        </p>

        <div className="hero-stats-container">
          <div className="hero-stat-item">
            <span className="hero-stat-value">{playerCount || 0}</span>
            <span className="hero-stat-label">Jugadores</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat-item">
            <span className="hero-stat-value">{decks?.length || 0}</span>
            <span className="hero-stat-label">Decks</span>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat-item">
            <span className="hero-stat-value">{MONTHLY_ALLOWANCE}€</span>
            <span className="hero-stat-label">Presupuesto</span>
          </div>
        </div>
      </section>

      {/* NEW PARTICIPANT CTA - Only show if user has NO decks */}
      {userDeckCount === 0 && (
        <div className={`new-deck-cta glass-panel premium-border ${styles.newDeckCta}`}>
          <div className={styles.ctaTextContainer}>
            <h4 className={styles.ctaTitle}>¿ERES NUEVO EN LA PARTY?</h4>
            <p className={styles.ctaSubtitle}>
              Todo jugador necesita un plan. Empieza tu proyecto de {MONTHLY_ALLOWANCE}€ y demuestra quién manda en la mesa.
            </p>
          </div>
          <Link href="/decks/new" className={`btn btn-gold ${styles.ctaButton}`}>
            <span className={styles.ctaButtonIcon}>✨</span> CREAR MI MAZO
          </Link>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      <div className="main-grid-layout">
        {/* COLUMNA IZQUIERDA: FEED & RANKING */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: '2rem' }}>
            {/* RECENT ACTIVITY */}
            <div className={`card ${styles.recentActivityCard}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>¿QUIÉN HA GANADO?</h3>
                <Link href="/matches" className={styles.viewAllLink}>VER TODO</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {activityFeed.length > 0 ? (
                  activityFeed.map((match: any) => (
                    <div key={match.id} className={styles.activityItem}>
                      <div className={styles.activityContent}>
                        {match.profiles?.avatar_url ? (
                          <Image 
                            src={match.profiles.avatar_url} 
                            width={32} 
                            height={32} 
                            className={styles.avatarImage}
                            alt={match.profiles.username} 
                            unoptimized
                          />
                        ) : (
                          <div className={styles.avatarFallback}>
                            {match.profiles?.username?.[0]?.toUpperCase() || "W"}
                          </div>
                        )}
                        <div>
                          <div className={styles.activityText}>{match.profiles?.username} ganó</div>
                          <div className={styles.activitySubtext}>{match.description || "Partida de liga"}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.emptyState}>
                    No hay partidas recientes... aún.
                  </div>
                )}
              </div>
            </div>

            {/* RANKING MINI */}
            <div className={`card ${styles.recentActivityCard}`}>
              <div className={styles.cardHeader}>
                <h3 className={styles.cardTitle}>TOP PARTY</h3>
                <Link href="/ranking" className={styles.viewAllLink}>RANKING</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                 {activityFeed.length > 0 ? (
                   Object.entries(
                     activityFeed.reduce((acc: any, match: any) => {
                       const name = match.profiles?.username || 'Anónimo';
                       acc[name] = (acc[name] || 0) + 1;
                       return acc;
                     }, {})
                   )
                   .sort((a: any, b: any) => b[1] - a[1])
                   .slice(0, 3)
                   .map(([name, wins]: any, idx) => (
                     <div key={name} className={styles.rankingItem} style={{ borderBottom: idx < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                       <span className={styles.rankingName}>
                         <span className={styles.rankingPos} style={{ color: idx === 0 ? "var(--color-gold)" : "#888" }}>{idx + 1}.</span>
                         {name}
                       </span>
                       <span className={styles.rankingWins} style={{ color: idx === 0 ? "var(--color-gold)" : "inherit" }}>{wins} {wins === 1 ? 'Win' : 'Wins'}</span>
                     </div>
                   ))
                 ) : (
                   <div className={styles.emptyState}>Calculando...</div>
                 )}
              </div>
            </div>
          </div>

          {/* FEATURED DECKS */}
          <section style={{ marginBottom: "5rem" }}>
            <div className={styles.collectionHeader}>
              <div>
                <h2 className={styles.collectionTitle}>LA COLECCIÓN</h2>
                <p className={styles.collectionSubtitle}>Las abominaciones que pueblan nuestra mesa.</p>
              </div>
              <Link href="/decks" style={{ color: "var(--color-gold)", fontWeight: "bold", fontSize: "0.9rem", borderBottom: '2px solid' }}>VER TODO →</Link>
            </div>

            {!decks || decks.length === 0 ? (
              <div style={{ textAlign: "center", padding: "6rem 2rem", border: "2px dashed #333", borderRadius: "32px", background: 'rgba(255,255,255,0.01)' }}>
                {decksError && <div style={{ color: '#ff4444', marginBottom: '1rem', fontSize: '0.8rem' }}>Error base de datos: {decksError.message}</div>}
                <p style={{ color: "#666", marginBottom: "2rem", fontSize: '1.1rem' }}>No hay rastro de decks... todavía.</p>
                <Link href="/profile" className="btn btn-gold" style={{ padding: '1rem 3rem' }}>CREAR MI PRIMER DECK</Link>
              </div>
            ) : (
              <div className={styles.collectionGrid}>
                {decks.map((deck: any) => {
                   const currentMonthSpent = monthlySpendMap.get(deck.id) || 0;
                   const budgetInfo = calculateDeckBudget(deck.created_at, deck.budget_spent || 0);
                   const monthlyCupo = Math.max(0, budgetInfo.remaining + currentMonthSpent);

                   return (
                  <Link key={deck.id} href={`/decks/${deck.id}`} style={{ textDecoration: 'none' }}>
                    <DeckCard
                      playerName={deck.profiles?.username || "Jugador Anónimo"}
                      playerAvatar={deck.profiles?.avatar_url}
                      deckName={deck.name}
                      commanderName={deck.commander}
                      spent={currentMonthSpent}
                      budget={monthlyCupo}
                      imageUrl={deck.image_url || "https://via.placeholder.com/150"}
                      colors={[]}
                    />
                  </Link>
                )})}
              </div>
            )}
          </section>
        </div>

        {/* COLUMNA DERECHA: QUICK ACTIONS */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div className={`card ${styles.actionCard}`}>
            <h3 className={styles.cardTitle} style={{ marginBottom: '1.5rem' }}>ZONA ACCIÓN</h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              <Link href="/ranking?add=true" className={`btn btn-gold ${styles.actionButton}`}>
                <span>🎉</span> Registrar Victoria
              </Link>
              <Link href="/decks" className={`btn ${styles.secondaryButton}`}>
                <span>📂</span> Mis Mazos
              </Link>
              <Link href="/meta" className={`btn ${styles.secondaryButton}`}>
                <span>📊</span> Meta Game
              </Link>
              <Link href="/rules" className={`btn ${styles.secondaryButton}`}>
                <span>📖</span> Reglamento
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* FINAL CTA */}
      <div className={styles.finalCta}>
        <div className={styles.finalCtaGlow} />
        <h2 className={styles.finalCtaTitle}>¿Te unes a la Party?</h2>
        <p className={styles.finalCtaDesc}>
          Demuestra que el dinero no gana partidas, la astucia lo hace. {MONTHLY_ALLOWANCE}€, 100 cartas, gloria infinita.
        </p>
        <div className={styles.finalCtaActions}>
          <Link 
            href={!user ? "/login" : (userDeckCount === 0 ? "/decks/new" : "/decks")} 
            className="btn btn-gold" 
            style={{ padding: "1.25rem 4rem", fontSize: '1.1rem', textDecoration: 'none' }}
          >
            {!user ? "ÚNETE AHORA" : (userDeckCount === 0 ? "CREAR MI MAZO" : "VER MIS MAZOS")}
          </Link>
          <Link href="/rules" className="btn" style={{ background: "transparent", border: "1px solid #444", padding: '1.25rem 3rem', textDecoration: 'none' }}>VER REGLAS</Link>
        </div>
      </div>
    </div>
  );
}
