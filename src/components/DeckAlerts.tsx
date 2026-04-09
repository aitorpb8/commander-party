import React, { useEffect, useState } from 'react';
import { getCollection } from '@/lib/scryfall';
import { DeckCard } from '@/types';
import { 
  checkSingleton, 
  validateCommanderLegality, 
  getCardColorIdentity 
} from '@/lib/magicUtils';

interface Alert {
  level: 'ok' | 'warning' | 'critical';
  title: string;
  message: string;
  action?: string;
  progress?: {
    current: number;
    total: number;
    color: string;
  };
}

interface DeckAlertsProps {
  cards: DeckCard[];
  cardTags: Record<string, string[]>;
  totalSpent: number;
  budgetLimit: number;
}

export default function DeckAlerts({ cards, cardTags, totalSpent, budgetLimit }: DeckAlertsProps) {
  const [validatedIdentities, setValidatedIdentities] = useState<Record<string, string[]> | null>(null);
  const alerts: Alert[] = [];

  // 1. Fetch Authoritative Identities from Scryfall
  useEffect(() => {
    const fetchIdentities = async () => {
      const uniqueCards = new Map<string, { id?: string, name: string }>();
      cards.forEach(c => {
        if (!uniqueCards.has(c.card_name)) {
          uniqueCards.set(c.card_name, { id: c.scryfall_id || undefined, name: c.card_name });
        }
      });
      
      const identifiers = Array.from(uniqueCards.values());
      const chunks = [];
      for (let i = 0; i < identifiers.length; i += 75) chunks.push(identifiers.slice(i, i + 75));
      
      try {
        const results = await Promise.all(chunks.map(chunk => getCollection(chunk)));
        const flatResults = results.flat();
        const map: Record<string, string[]> = {};
        flatResults.forEach(c => { map[c.name] = c.color_identity || []; });
        setValidatedIdentities(map);
      } catch (e) {
        console.error("Error validando identidades:", e);
      }
    };
    if (cards.length > 0) fetchIdentities();
  }, [cards]);

  // 2. Local Tag Counters
  const taggedCards = Object.entries(cardTags);
  const drawCount = taggedCards.filter(([_, tags]) => tags.includes('Draw')).length;
  const rampCount = taggedCards.filter(([_, tags]) => tags.includes('Ramp')).length;
  const removalCount = taggedCards.filter(([_, tags]) => tags.includes('Removal') || tags.includes('Board Wipe')).length;
  const winConCount = taggedCards.filter(([_, tags]) => tags.includes('Win-Con')).length;

  // 3. Mana & Pip Analysis
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const prod = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  cards.forEach(c => {
    const isLand = c.type_line?.toLowerCase().includes('land');
    const cost = c.mana_cost || '';
    const text = c.oracle_text || '';

    const producesMana = (rawStr: string) => {
        if (!rawStr) return;
        const str = rawStr.toLowerCase();
        if (str.includes('{w}') || str.includes('plains')) prod.W += c.quantity;
        if (str.includes('{u}') || str.includes('island')) prod.U += c.quantity;
        if (str.includes('{b}') || str.includes('swamp')) prod.B += c.quantity;
        if (str.includes('{r}') || str.includes('mountain')) prod.R += c.quantity;
        if (str.includes('{g}') || str.includes('forest')) prod.G += c.quantity;
        if (str.includes('any color') || str.includes('any type') || str.includes('any one color') || str.includes('basic land')) {
            prod.W += c.quantity; prod.U += c.quantity; prod.B += c.quantity; prod.R += c.quantity; prod.G += c.quantity;
        }
    };

    if (isLand) { producesMana(text); } else {
        (cost.match(/W/g) || []).forEach(() => pips.W += c.quantity);
        (cost.match(/U/g) || []).forEach(() => pips.U += c.quantity);
        (cost.match(/B/g) || []).forEach(() => pips.B += c.quantity);
        (cost.match(/R/g) || []).forEach(() => pips.R += c.quantity);
        (cost.match(/G/g) || []).forEach(() => pips.G += c.quantity);
        if (text.toLowerCase().includes('add') || text.toLowerCase().includes('search')) producesMana(text);
    }
  });

  // 4. Generate Alerts
  // 4.1. Core Categories
  if (drawCount < 8) alerts.push({ level: drawCount < 5 ? 'critical' : 'warning', title: 'Pocas fuentes de robo', message: `Solo tienes ${drawCount} cartas de robo. Objetivo: 8-10.`, action: 'Añade más fuentes de robo de cartas' });
  if (rampCount < 8) alerts.push({ level: rampCount < 5 ? 'critical' : 'warning', title: 'Poco ramp', message: `Solo tienes ${rampCount} cartas de ramp. Objetivo: 8-10.`, action: 'Añade más fuentes de maná' });
  if (removalCount < 5) alerts.push({ level: removalCount < 3 ? 'critical' : 'warning', title: 'Poco removal', message: `Solo tienes ${removalCount} cartas de removal. Objetivo: 5-7.`, action: 'Añade más removal o board wipes' });
  if (winConCount === 0) alerts.push({ level: 'warning', title: 'Sin win-cons etiquetadas', message: 'No has etiquetado ninguna carta como "Win-Con".', action: 'Etiqueta tus condiciones de victoria' });

  // 4.2. Mana Balance
  ['W', 'U', 'B', 'R', 'G'].forEach(col => {
    const c = col as keyof typeof pips;
    if (pips[c] > prod[c] * 2 && pips[c] > 0) {
      const names: any = { W: 'Blanco', U: 'Azul', B: 'Negro', R: 'Rojo', G: 'Verde' };
      alerts.push({ level: 'warning', title: `Déficit de maná ${names[c]}`, message: `Pides mucho ${names[c]} (${pips[c]} pips) pero tienes pocas fuentes (${prod[c]}).`, action: `Añade más fuentes de maná ${names[c]}` });
    }
  });

  // 4.3. Singleton (using magicUtils)
  const duplicates = checkSingleton(cards);
  if (duplicates.length > 0) alerts.push({ level: 'critical', title: 'Singleton violado', message: `Tienes cartas repetidas: ${duplicates.join(', ')}.`, action: 'Deja solo 1 copia de cada carta (excepto tierras básicas).' });

  // 4.4. Budget (using local props)
  if (totalSpent > budgetLimit) {
    alerts.push({ level: 'critical', title: 'Presupuesto excedido', message: `Has gastado ${totalSpent.toFixed(2)}€, superando el límite de ${budgetLimit}€.`, progress: { current: totalSpent, total: budgetLimit, color: 'var(--color-red)' } });
  } else if (totalSpent > budgetLimit * 0.9) {
    alerts.push({ level: 'warning', title: 'Cerca del límite de presupuesto', message: `Has gastado el ${((totalSpent / budgetLimit) * 100).toFixed(0)}% del presupuesto.`, progress: { current: totalSpent, total: budgetLimit, color: '#ffcc00' } });
  } else {
    alerts.push({ level: 'ok', title: 'Presupuesto OK', message: `Tienes ${(budgetLimit - totalSpent).toFixed(2)}€ de margen.`, progress: { current: totalSpent, total: budgetLimit, color: 'var(--color-green)' } });
  }

  // 4.5. Commander & Pairing (using magicUtils)
  const commanders = cards.filter(c => c.is_commander);
  const legalityErrors = validateCommanderLegality(commanders);
  if (legalityErrors.length > 0) {
    alerts.push({ level: 'critical', title: 'Ilegalidad en Comandante', message: legalityErrors.join('. '), action: 'Marca correctamente a tus comandantes y sus habilidades.' });
  }

  // 4.6. Color Identity (using magicUtils)
  if (commanders.length > 0) {
    const commanderColors = new Set<string>();
    commanders.forEach(c => getCardColorIdentity(c, validatedIdentities || undefined).forEach(col => commanderColors.add(col)));
    const invalidColorCards: string[] = [];
    cards.forEach(c => {
      if (c.is_commander) return;
      const cardColors = getCardColorIdentity(c, validatedIdentities || undefined);
      let valid = true;
      cardColors.forEach(col => { if (!commanderColors.has(col)) valid = false; });
      if (!valid) invalidColorCards.push(c.card_name);
    });
    if (invalidColorCards.length > 0) {
      alerts.push({ level: 'critical', title: 'Identidad de Color Inválida', message: `Las siguientes cartas violan la identidad de color: ${invalidColorCards.join(', ')}.`, action: 'Elimina estas cartas, son ilegales.' });
    }
  }

  if (alerts.length === 0) {
    alerts.push({ level: 'ok', title: '¡Mazo bien equilibrado!', message: 'No se han detectado problemas en la construcción.' });
  }

  // UI Helpers
  const getIcon = (level: string) => {
    switch (level) {
      case 'ok': return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-green)' }}>
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      );
      case 'warning': return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#ffcc00' }}>
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
          <line x1="12" y1="9" x2="12" y2="13"></line>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      );
      case 'critical': return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-red)' }}>
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="15" y1="9" x2="9" y2="15"></line>
          <line x1="9" y1="9" x2="15" y2="15"></line>
        </svg>
      );
      default: return null;
    }
  };

  const getStatusColor = (level: string) => {
    switch (level) {
      case 'ok': return 'var(--color-green)';
      case 'warning': return '#ffcc00';
      case 'critical': return 'var(--color-red)';
      default: return '#888';
    }
  };

  return (
    <div className="card glass-panel" style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <h3 style={{ margin: 0, color: 'var(--color-gold)', fontFamily: 'var(--font-title)', fontSize: '1.5rem', letterSpacing: '0.05em' }}>Alertas de Oráculo</h3>
        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(to right, rgba(212,175,55,0.3), transparent)' }}></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {alerts.map((alert, i) => {
          const statusColor = getStatusColor(alert.level);
          return (
            <div key={i} className="premium-border" style={{
                padding: '1.25rem',
                borderRadius: '16px',
                background: `${statusColor}0a`,
                display: 'flex',
                gap: '1.25rem',
                alignItems: 'flex-start',
                transition: 'all 0.3s ease',
                animation: `slideIn 0.4s ease-out ${i * 0.1}s both`,
                position: 'relative',
                overflow: 'hidden'
            }}>
              <div style={{ flexShrink: 0, width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(0,0,0,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 15px ${statusColor}22` }}>
                {getIcon(alert.level)}
              </div>
              
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '900', marginBottom: '0.4rem', color: statusColor, fontSize: '1rem', letterSpacing: '0.05em' }}>
                  {alert.title.toUpperCase()}
                </div>
                <div style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: alert.action || alert.progress ? '1rem' : 0 }}>
                  {alert.message}
                </div>
                
                {alert.progress && (
                  <div style={{ margin: '1rem 0', width: '100%' }}>
                     <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, (alert.progress.current / alert.progress.total) * 100)}%`, background: `linear-gradient(to right, ${statusColor}, ${statusColor}dd)`, boxShadow: `0 0 12px ${statusColor}66`, transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)', borderRadius: 'inherit' }} />
                     </div>
                  </div>
                )}

                {alert.action && (
                  <div style={{ fontSize: '0.8rem', color: '#666', padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', borderLeft: `2px solid ${statusColor}aa` }}>
                    <span style={{ opacity: 0.7 }}>💡 Pista:</span>
                    <span style={{ fontWeight: '500' }}>{alert.action}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
