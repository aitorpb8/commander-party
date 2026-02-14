
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import React from 'react';
import BudgetChart from '@/components/BudgetChart'; // Maybe reuse part of it or create something else
import { MONTHLY_ALLOWANCE } from '@/lib/constants';

export default async function MetaPage() {
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

  // 1. Fetch all Decks
  const { data: decks } = await supabase.from('decks').select('*, profiles!user_id(username)');
  
  // 2. Fetch all Upgrades
  const { data: upgrades } = await supabase.from('deck_upgrades').select('*').order('created_at', { ascending: false });

  // 3. Fetch all Matches
  const { data: matches } = await supabase.from('matches').select('*');

  // Statistics calculations
  const totalSpent = decks?.reduce((acc, d) => acc + (d.budget_spent || 0), 0) || 0;
  const avgSpent = decks && decks.length > 0 ? totalSpent / decks.length : 0;
  
  const mostExpensive = decks ? [...decks].sort((a, b) => b.budget_spent - a.budget_spent).slice(0, 3) : [];
  const mostUpgraded = decks ? decks.map(d => ({
    ...d,
    upgrade_count: upgrades?.filter(u => u.deck_id === d.id).length || 0
  })).sort((a, b) => b.upgrade_count - a.upgrade_count).slice(0, 3) : [];

  // Recent upgrades (global)
  const recentUpgrades = upgrades?.slice(0, 10).map(u => {
    const deck = decks?.find(d => d.id === u.deck_id);
    return { ...u, deck_name: deck?.name, player: deck?.profiles?.username };
  }) || [];

  return (
    <div className="container" style={{ paddingTop: '2rem' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1 style={{ color: 'var(--color-gold)', marginBottom: '0.5rem' }}>League Meta & Insights</h1>
        <p style={{ color: '#888' }}>Análisis global del estado de la liga y tendencias.</p>
      </header>

      {/* Top Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>VALOR TOTAL LIGA</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>{totalSpent.toFixed(2)}€</div>
          <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.5rem' }}>Sumatorio de todos los mazos</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>GASTO MEDIO / MAZO</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>{avgSpent.toFixed(2)}€</div>
          <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.5rem' }}>De un máximo de {MONTHLY_ALLOWANCE}€/mes</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>TOTAL MEJORAS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>{upgrades?.length || 0}</div>
          <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.5rem' }}>Cartas cambiadas en la liga</div>
        </div>
        <div className="card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.5rem' }}>PARTIDAS JUGADAS</div>
          <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: 'var(--color-gold)' }}>{matches?.length || 0}</div>
          <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.5rem' }}>Batallas épicas registradas</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '2rem' }}>
        
        {/* Activity Feed */}
        <section>
          <h2 style={{ marginBottom: '1.5rem' }}>Últimas Mejoras en la Liga</h2>
          <div className="card" style={{ padding: 0 }}>
             {recentUpgrades.map((u, i) => (
                <div key={u.id} style={{ 
                  padding: '1rem', 
                  borderBottom: i === recentUpgrades.length - 1 ? 'none' : '1px solid #252525',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <div>
                    <div style={{ fontSize: '0.9rem', color: '#fff' }}>
                      <span style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>{u.player}</span> ha añadido <strong>{u.card_in}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666' }}>
                      En el mazo: {u.deck_name} • {u.month}
                    </div>
                  </div>
                  <div style={{ color: 'var(--color-gold)', fontWeight: 'bold' }}>
                    {u.cost.toFixed(2)}€
                  </div>
                </div>
             ))}
             {recentUpgrades.length === 0 && (
               <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>No hay mejoras recientes.</div>
             )}
          </div>
        </section>

        {/* Hall of Fame / Rankings */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="card">
             <h3 style={{ marginBottom: '1rem', color: 'var(--color-gold)' }}>Mazos más Valiosos 💎</h3>
             {mostExpensive.map((d, i) => (
               <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                 <span style={{ color: '#888' }}>{i+1}. {d.name}</span>
                 <span style={{ fontWeight: 'bold' }}>{d.budget_spent.toFixed(2)}€</span>
               </div>
             ))}
          </div>

          <div className="card">
             <h3 style={{ marginBottom: '1rem', color: 'var(--color-gold)' }}>Más Mejorados 🔧</h3>
             {mostUpgraded.map((d, i) => (
               <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                 <span style={{ color: '#888' }}>{i+1}. {d.name}</span>
                 <span style={{ fontWeight: 'bold' }}>{d.upgrade_count} cambios</span>
               </div>
             ))}
          </div>
          
          <div className="card" style={{ background: 'linear-gradient(135deg, #1a1a1a, #000)', border: '1px solid var(--color-gold)' }}>
             <h3 style={{ marginBottom: '0.5rem' }}>League Meta Tip 💡</h3>
             <p style={{ fontSize: '0.85rem', color: '#AAA', lineHeight: '1.4' }}>
               El gasto medio de la liga es de <strong>{avgSpent.toFixed(2)}€</strong>. Si tu mazo está por debajo, ¡tienes margen para buscar ese bombazo de Scryfall!
             </p>
          </div>
        </aside>

      </div>
    </div>
  );
}
