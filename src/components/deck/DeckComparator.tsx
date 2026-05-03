import React, { useState, useEffect } from 'react';
import { Deck, DeckCard, DeckUpgrade } from '@/types';
import { createClient } from '@/lib/supabaseClient';
import ManaAnalysis from '../ManaAnalysis';

interface DeckComparatorProps {
  currentDeck: Deck;
  currentCards: DeckCard[];
  currentUpgrades: DeckUpgrade[];
  userDecks: Deck[];
}

export default function DeckComparator({ currentDeck, currentCards, currentUpgrades, userDecks }: DeckComparatorProps) {
  const [targetDeckId, setTargetDeckId] = useState<string>('');
  const [targetDeck, setTargetDeck] = useState<Deck | null>(null);
  const [targetCards, setTargetCards] = useState<DeckCard[]>([]);
  const [targetUpgrades, setTargetUpgrades] = useState<DeckUpgrade[]>([]);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    if (!targetDeckId) {
      setTargetDeck(null);
      setTargetCards([]);
      setTargetUpgrades([]);
      return;
    }

    const fetchTargetData = async () => {
      setLoading(true);
      try {
        const { data: deck } = await supabase.from('decks').select('*').eq('id', targetDeckId).single();
        const { data: cards } = await supabase.from('deck_cards').select('*').eq('deck_id', targetDeckId);
        const { data: upgrades } = await supabase.from('deck_upgrades').select('*').eq('deck_id', targetDeckId);
        
        setTargetDeck(deck);
        setTargetCards(cards || []);
        setTargetUpgrades(upgrades || []);
      } catch (err) {
        console.error("Error fetching target deck:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTargetData();
  }, [targetDeckId]);

  const otherDecks = userDecks.filter(d => d.id !== currentDeck.id);

  if (otherDecks.length === 0) return null;

  return (
    <div className="card glass-panel" style={{ marginTop: '3rem', padding: '2.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--color-gold)', fontSize: '1.5rem', fontFamily: 'var(--font-title)' }}>⚔️ Comparador de Mazos</h3>
          <p style={{ color: '#888', margin: '4px 0 0', fontSize: '0.95rem' }}>Compara el rendimiento y la curva de este mazo con otros de tu colección.</p>
        </div>
        
        <select 
          value={targetDeckId} 
          onChange={(e) => setTargetDeckId(e.target.value)}
          className="select-premium"
          style={{ 
            padding: '0.8rem 1.5rem', 
            borderRadius: '12px', 
            background: 'rgba(212, 175, 55, 0.1)', 
            border: '1px solid var(--color-gold)', 
            color: '#fff',
            cursor: 'pointer',
            outline: 'none'
          }}
        >
          <option value="">Selecciona un mazo...</option>
          {otherDecks.map(d => (
            <option key={d.id} value={d.id}>{d.name}</option>
          ))}
        </select>
      </div>

      {!targetDeck ? (
        <div style={{ textAlign: 'center', padding: '4rem', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '20px', color: '#555' }}>
          Selecciona otro mazo para empezar la comparativa side-by-side.
        </div>
      ) : loading ? (
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner-gold"></div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem' }}>
          {/* LEFT SIDE: CURRENT DECK */}
          <ComparisonColumn 
            deck={currentDeck} 
            cards={currentCards} 
            upgrades={currentUpgrades} 
            isCurrent={true} 
          />
          
          {/* RIGHT SIDE: TARGET DECK */}
          <ComparisonColumn 
            deck={targetDeck} 
            cards={targetCards} 
            upgrades={targetUpgrades} 
            isCurrent={false} 
          />
        </div>
      )}
    </div>
  );
}

function ComparisonColumn({ deck, cards, upgrades, isCurrent }: { deck: Deck, cards: DeckCard[], upgrades: DeckUpgrade[], isCurrent: boolean }) {
  const avgCmc = cards.length > 0 
    ? (cards.reduce((sum, c) => sum + (c.quantity * (parseFloat(c.mana_cost || '0') || 0)), 0) / cards.length).toFixed(2)
    : '0.00';

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1.5rem',
      padding: '1.5rem',
      background: isCurrent ? 'rgba(212, 175, 55, 0.03)' : 'rgba(255,255,255,0.02)',
      borderRadius: '24px',
      border: `1px solid ${isCurrent ? 'rgba(212, 175, 55, 0.2)' : 'rgba(255,255,255,0.05)'}`,
      position: 'relative',
      overflow: 'hidden'
    }}>
      {isCurrent && (
        <div style={{ 
          position: 'absolute', top: '1rem', right: '1rem', 
          background: 'var(--color-gold)', color: '#000', 
          padding: '4px 12px', borderRadius: '20px', fontSize: '0.65rem', fontWeight: '900' 
        }}>
          MAZO ACTUAL
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <img src={deck.image_url || ''} style={{ width: '60px', height: '60px', borderRadius: '12px', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.1)' }} />
        <div>
          <div style={{ fontWeight: '900', fontSize: '1.2rem', color: '#fff' }}>{deck.name}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--color-gold)', opacity: 0.8 }}>{deck.commander}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <StatBox label="Inversión Total" value={`${deck.budget_spent.toFixed(2)}€`} color="var(--color-gold)" />
        <StatBox label="Mejoras" value={upgrades.length.toString()} color="#fff" />
        <StatBox label="Cartas" value={cards.length.toString()} color="#fff" />
        <StatBox label="Media CMC" value={avgCmc} color="#fff" />
      </div>

      <div style={{ marginTop: '1rem' }}>
        <ManaAnalysis cards={cards} />
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ fontSize: '0.65rem', color: '#666', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1.2rem', fontWeight: '900', color: color }}>{value}</div>
    </div>
  );
}
