import Link from "next/link";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import DeckCard from "@/components/DeckCard";
import { calculateDeckBudget } from '@/lib/budgetUtils';

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
        <div className="hide-mobile" style={{ position: 'absolute', top: '20px', right: '30px', transform: 'rotate(15deg)', color: 'rgba(212,175,55,0.15)', fontSize: '2.5rem', fontWeight: '900', userSelect: 'none' }}>PARTY!</div>
        <div className="hide-mobile" style={{ position: 'absolute', bottom: '20px', left: '30px', transform: 'rotate(-10deg)', color: 'rgba(212,175,55,0.1)', fontSize: '1.5rem', fontWeight: '900', userSelect: 'none' }}>10€ BUDGET</div>

        <h1 className="hero-title">
          Commander Party
        </h1>
        <p className="hero-subtitle">
          Evoluciona tu mazo con inteligencia. La liga más gamberra donde el dinero no compra la victoria.
        </p>

        <div className="hero-stats-container">
          <div className="hero-stat-item">
            <div style={{ color: "var(--color-gold)", fontSize: "2rem", fontWeight: "900", lineHeight: "1" }}>
              {playerCount || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase", letterSpacing: "2px", marginTop: "0.5rem" }}>
              Jugadores
            </div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat-item">
            <div style={{ color: "var(--color-gold)", fontSize: "2rem", fontWeight: "900", lineHeight: "1" }}>
              {decks?.length || 0}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase", letterSpacing: "2px", marginTop: "0.5rem" }}>
              Decks
            </div>
          </div>
          <div className="hero-divider" />
          <div className="hero-stat-item">
            <div style={{ color: "var(--color-gold)", fontSize: "2rem", fontWeight: "900", lineHeight: "1" }}>
              10€
            </div>
            <div style={{ fontSize: "0.75rem", color: "#666", textTransform: "uppercase", letterSpacing: "2px", marginTop: "0.5rem" }}>
              Presupuesto
            </div>
          </div>
        </div>
      </section>

      {/* NEW PARTICIPANT CTA - Only show if user has NO decks */}
      {userDeckCount === 0 && (
        <div 
          style={{ 
            marginBottom: '4rem', 
            padding: '2rem', 
            background: 'rgba(212, 175, 55, 0.03)', 
            borderRadius: '20px', 
            border: '1px dashed rgba(212, 175, 55, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            textAlign: 'center'
          }}
          className="new-deck-cta"
        >
          <div style={{ maxWidth: '600px' }}>
            <h4 style={{ color: 'var(--color-gold)', marginBottom: '0.5rem', fontSize: '1.2rem', fontFamily: 'var(--font-title)' }}>¿ERES NUEVO EN LA PARTY?</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
              Todo jugador necesita un plan. Empieza tu proyecto de 10€ y demuestra quién manda en la mesa.
            </p>
          </div>
          <Link 
            href="/decks/new" 
            className="btn btn-gold" 
            style={{ 
              padding: '1rem 2.5rem', 
              fontSize: '1rem', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem',
              boxShadow: '0 4px 20px rgba(212, 175, 55, 0.15)',
              textDecoration: 'none'
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>✨</span> CREAR MI MAZO
          </Link>
        </div>
      )}

      {/* DASHBOARD CONTENT */}
      <div className="main-grid-layout">
        {/* COLUMNA IZQUIERDA: FEED & RANKING */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            {/* RECENT ACTIVITY */}
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800" }}>¿QUIÉN HA GANADO?</h3>
                <Link href="/matches" style={{ fontSize: "0.7rem", color: "var(--color-gold)", fontWeight: "bold" }}>VER TODO</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {activityFeed.length > 0 ? (
                  activityFeed.map((match: any) => (
                    <div key={match.id} style={{ padding: "0.75rem", background: "rgba(255,255,255,0.03)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
                        {match.profiles?.avatar_url ? (
                          <img src={match.profiles.avatar_url} style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--color-gold)' }} alt={match.profiles.username} />
                        ) : (
                          <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "var(--color-gold)", color: "#000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "900", fontSize: "0.8rem" }}>
                            {match.profiles?.username?.[0]?.toUpperCase() || "W"}
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: "1.05rem", fontWeight: "bold" }}>{match.profiles?.username} ganó</div>
                          <div style={{ fontSize: "0.85rem", color: "#666" }}>{match.description || "Partida de liga"}</div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: "center", padding: "2rem", color: "#444", fontSize: "0.9rem", border: '1px dashed #333', borderRadius: '12px' }}>
                    No hay partidas recientes... aún.
                  </div>
                )}
              </div>
            </div>

            {/* RANKING MINI */}
            <div className="card" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "800" }}>TOP PARTY</h3>
                <Link href="/ranking" style={{ fontSize: "0.7rem", color: "var(--color-gold)", fontWeight: "bold" }}>RANKING</Link>
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
                     <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem", borderBottom: idx < 2 ? "1px solid rgba(255,255,255,0.05)" : "none" }}>
                       <span style={{ fontSize: "1.05rem" }}>
                         <span style={{ color: idx === 0 ? "var(--color-gold)" : "#888", fontWeight: "bold", marginRight: "8px" }}>{idx + 1}.</span>
                         {name}
                       </span>
                       <span style={{ fontWeight: "bold", fontSize: "0.9rem", color: idx === 0 ? "var(--color-gold)" : "inherit" }}>{wins} {wins === 1 ? 'Win' : 'Wins'}</span>
                     </div>
                   ))
                 ) : (
                   <div style={{ textAlign: "center", padding: "2rem", color: "#444", fontSize: "0.9rem" }}>Calculando...</div>
                 )}
              </div>
            </div>
          </div>

          {/* FEATURED DECKS */}
          <section style={{ marginBottom: "5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2.5rem" }}>
              <div>
                <h2 style={{ fontSize: "2.5rem", fontWeight: "900", marginBottom: "0.25rem", letterSpacing: '-1px' }}>LA COLECCIÓN</h2>
                <p style={{ color: "#666", fontSize: "1rem" }}>Las abominaciones que pueblan nuestra mesa.</p>
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
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "1.5rem" }}>
                {decks.map((deck: any) => {
                   const { dynamicLimit } = calculateDeckBudget(deck.created_at);
                   const spent = monthlySpendMap.get(deck.id) || 0;
                   const totalSpent = deck.budget_spent || 0;
                   const spentPrevious = totalSpent - spent;
                   const effectiveBudget = Math.max(0, dynamicLimit - spentPrevious);

                   return (
                  <Link key={deck.id} href={`/decks/${deck.id}`} style={{ textDecoration: 'none' }}>
                    <DeckCard
                      playerName={deck.profiles?.username || "Jugador Anónimo"}
                      playerAvatar={deck.profiles?.avatar_url}
                      deckName={deck.name}
                      commanderName={deck.commander}
                      spent={spent}
                      budget={effectiveBudget}
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
          <div className="card" style={{ display: "flex", flexDirection: "column", background: "linear-gradient(180deg, var(--bg-card) 0%, #1a1a1a 100%)", border: '1px solid var(--color-gold)' }}>
            <h3 style={{ fontSize: "1.1rem", fontWeight: "800", marginBottom: "1.5rem" }}>ZONA ACCIÓN</h3>
            <div style={{ display: "grid", gap: "1rem" }}>
              <Link href="/ranking?add=true" className="btn btn-gold" style={{ width: "100%", gap: "0.5rem", fontSize: "1rem", padding: '1.25rem' }}>
                <span>🎉</span> Registrar Victoria
              </Link>
              <Link href="/decks" className="btn" style={{ width: "100%", background: "#222", gap: "0.5rem", fontSize: "0.9rem", border: '1px solid #333' }}>
                <span>📂</span> Mis Mazos
              </Link>
              <Link href="/meta" className="btn" style={{ width: "100%", background: "#222", gap: "0.5rem", fontSize: "0.9rem", border: '1px solid #333' }}>
                <span>📊</span> Meta Game
              </Link>
              <Link href="/rules" className="btn" style={{ width: "100%", background: "#222", gap: "0.5rem", fontSize: "0.9rem", border: '1px solid #333' }}>
                <span>📖</span> Reglamento
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* FINAL CTA */}
      <div style={{ padding: "5rem 2rem", background: "linear-gradient(135deg, #1e1e1e 0%, #080808 100%)", borderRadius: "32px", textAlign: "center", border: "1px solid rgba(212,175,55,0.1)", position: "relative", overflow: "hidden", marginTop: '3rem' }}>
        <div style={{ position: "absolute", top: "-50%", left: "-20%", width: "60%", height: "200%", background: "radial-gradient(circle, rgba(212,175,55,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />
        <h2 style={{ fontSize: "3rem", fontWeight: "900", marginBottom: "1rem", letterSpacing: '-2px' }}>¿Te unes a la Party?</h2>
        <p style={{ color: "#888", marginBottom: "3rem", maxWidth: "600px", margin: "0 auto 3rem", fontSize: '1.1rem' }}>
          Demuestra que el dinero no gana partidas, la astucia lo hace. 10€, 100 cartas, gloria infinita.
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
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
