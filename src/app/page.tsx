import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import Image from "next/image";
import DeckCard from "@/components/DeckCard";
import { calculateDeckBudget } from '@/lib/budgetUtils';
import { MONTHLY_ALLOWANCE } from '@/lib/constants';

import RealtimeActivityFeed from "@/components/RealtimeActivityFeed";
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
  const { data: decks, error: decksError } = await supabase
    .from("decks")
    .select(`*, profiles!user_id (username, avatar_url)`);

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
      <section className="hero-section" style={{ 
        position: 'relative', 
        padding: '8rem 2rem', 
        textAlign: 'center', 
        borderRadius: '40px', 
        overflow: 'hidden',
        marginBottom: '4rem',
        minHeight: '600px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255,255,255,0.05)',
        background: '#000'
      }}>
        {/* Keyframe Animations */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes kenBurns {
            0% { transform: scale(1) translate(0, 0); }
            50% { transform: scale(1.1) translate(-1%, -1%); }
            100% { transform: scale(1) translate(0, 0); }
          }
          @keyframes shine {
            0% { background-position: -200% center; }
            100% { background-position: 200% center; }
          }
          @keyframes glowPulse {
            0%, 100% { filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.2)); }
            50% { filter: drop-shadow(0 0 40px rgba(212, 175, 55, 0.5)); }
          }
          .stat-orb-premium {
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) !important;
          }
          .stat-orb-premium:hover {
            transform: translateY(-10px) rotateX(5deg) scale(1.02) !important;
            border-color: var(--color-gold) !important;
            box-shadow: 0 15px 40px rgba(212, 175, 55, 0.3) !important;
            background: rgba(255,255,255,0.06) !important;
          }
        `}} />
        
        {/* 1. Background Image Layer */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
          <Image 
            src="/hero.jpg"
            alt="Hero Background"
            fill
            priority
            style={{ 
              objectFit: 'cover', 
              objectPosition: 'center 20%',
              filter: 'brightness(0.9) contrast(1.1)',
              animation: 'kenBurns 40s ease-in-out infinite alternate'
            }}
          />
        </div>

        {/* 2. Gradient Overlay Layer */}
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          zIndex: 2,
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.85) 100%)'
        }} />

        {/* 3. Content Layer */}
        <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1200px' }}>
          <h1 className="hero-title" style={{ 
            fontSize: 'clamp(3.5rem, 12vw, 7.5rem)', 
            margin: '0 0 1.5rem 0',
            lineHeight: '0.85',
            letterSpacing: '-4px',
            fontWeight: '900',
            color: '#fff',
            textTransform: 'uppercase',
            backgroundImage: 'linear-gradient(90deg, #fff 0%, var(--color-gold) 25%, #fff 50%, var(--color-gold) 75%, #fff 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            animation: 'shine 6s linear infinite, glowPulse 4s ease-in-out infinite',
          }}>
            COMMANDER<br/><span style={{ fontWeight: '200', letterSpacing: '10px', marginLeft: '15px', fontSize: '0.6em' }}>PARTY</span>
          </h1>
          
          <p className="hero-subtitle" style={{ 
            maxWidth: '800px', 
            fontSize: '1.25rem', 
            fontWeight: '300',
            color: 'rgba(255,255,255,0.7)',
            margin: '0 auto 4rem',
            lineHeight: '1.4',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            Bienvenido al <span style={{ color: 'var(--color-gold)', fontWeight: '600' }}>templo de la estrategia</span>. 
            Aquí, cada euro cuenta y cada jugada te acerca a la inmortalidad.
          </p>

          <div className="hero-stats-container" style={{ 
            display: 'flex', 
            gap: '2rem', 
            flexWrap: 'wrap', 
            justifyContent: 'center',
            perspective: '1000px'
          }}>
            {[
              { label: 'Jugadores', value: playerCount || 0, color: '#fff' },
              { label: 'Mazos', value: decks?.length || 0, color: '#fff' },
              { label: 'Presupuesto', value: `${MONTHLY_ALLOWANCE}€`, color: 'var(--color-gold)' }
            ].map((stat, i) => (
              <div key={i} className="glass-panel stat-orb-premium" style={{ 
                padding: '1.5rem 2.5rem', 
                borderRadius: '24px', 
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(15px)',
                border: '1px solid rgba(212, 175, 55, 0.2)',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                display: 'flex', 
                flexDirection: 'column', 
                gap: '6px', 
                minWidth: '200px',
                cursor: 'default'
              }}>
                 <span style={{ fontSize: '0.7rem', color: 'var(--color-gold)', textTransform: 'uppercase', letterSpacing: '3px', fontWeight: '800', opacity: 0.8 }}>{stat.label}</span>
                 <span style={{ fontSize: '2.4rem', fontWeight: '900', color: stat.color, textShadow: '0 0 20px rgba(255,255,255,0.1)' }}>{stat.value}</span>
              </div>
            ))}
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
              <RealtimeActivityFeed initialMatches={activityFeed} />
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
                      totalSpent={budgetInfo.totalSpent}
                      leagueBudget={budgetInfo.dynamicLimit}
                      remainingBalance={budgetInfo.remaining}
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
