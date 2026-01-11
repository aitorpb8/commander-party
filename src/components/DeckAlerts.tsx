'use client'

import React from 'react';

interface DeckCard {
  card_name: string;
  quantity: number;
  type_line: string | null;
  mana_cost: string | null;
  oracle_text: string | null;
}

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

const MONTHLY_LIMIT = 10; // Not used for limit anymore, but could be ref for warnings

export default function DeckAlerts({ cards, cardTags, totalSpent, budgetLimit }: DeckAlertsProps) {
  const alerts: Alert[] = [];

  // ... (keeping existing checks for Draw, Ramp, WinCon etc)

  // Count cards by tag
  const taggedCards = Object.entries(cardTags);
  const drawCount = taggedCards.filter(([_, tags]) => tags.includes('Draw')).length;
  const rampCount = taggedCards.filter(([_, tags]) => tags.includes('Ramp')).length;
  const removalCount = taggedCards.filter(([_, tags]) => tags.includes('Removal') || tags.includes('Board Wipe')).length;
  const winConCount = taggedCards.filter(([_, tags]) => tags.includes('Win-Con')).length;

  // Analyze mana pips vs sources
  const pips = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const prod = { W: 0, U: 0, B: 0, R: 0, G: 0 };

  cards.forEach(c => {
    const isLand = c.type_line?.toLowerCase().includes('land');
    const cost = c.mana_cost || '';
    const text = c.oracle_text || '';

    // Check for mana sources (Lands AND Rocks/Dorks)
    const producesMana = (str: string) => {
        if (!str) return false;
        // Check for specific color production in text (e.g., "Add {W}")
        if (str.includes('{W}') || str.includes('Plains')) prod.W += c.quantity;
        if (str.includes('{U}') || str.includes('Island')) prod.U += c.quantity;
        if (str.includes('{B}') || str.includes('Swamp')) prod.B += c.quantity;
        if (str.includes('{R}') || str.includes('Mountain')) prod.R += c.quantity;
        if (str.includes('{G}') || str.includes('Forest')) prod.G += c.quantity;
        
        // Check for "Any color" production (e.g., Arcane Signet, Command Tower)
        if (str.toLowerCase().includes('add one mana of any color')) {
            prod.W += c.quantity;
            prod.U += c.quantity;
            prod.B += c.quantity;
            prod.R += c.quantity;
            prod.G += c.quantity;
        }
    };

    if (isLand) {
        producesMana(text);
    } else {
        // NON-LANDS: Count pips for cost...
        (cost.match(/W/g) || []).forEach(() => pips.W += c.quantity);
        (cost.match(/U/g) || []).forEach(() => pips.U += c.quantity);
        (cost.match(/B/g) || []).forEach(() => pips.B += c.quantity);
        (cost.match(/R/g) || []).forEach(() => pips.R += c.quantity);
        (cost.match(/G/g) || []).forEach(() => pips.G += c.quantity);

        // ...BUT ALSO check if they produce mana (Rocks, Dorks)
        // Heuristic: Must have "Add" and "{" in text, or be a signet/talisman
        if (text.includes('Add ')) {
           producesMana(text);
        }
    }
  });

  // Alert 1: Draw
  if (drawCount < 8) {
    alerts.push({
      level: drawCount < 5 ? 'critical' : 'warning',
      title: 'Pocas fuentes de robo',
      message: `Solo tienes ${drawCount} cartas etiquetadas como "Draw". Se recomiendan al menos 8-10.`,
      action: 'Añade más fuentes de robo de cartas'
    });
  }

  // Alert 2: Ramp
  if (rampCount < 8) {
    alerts.push({
      level: rampCount < 5 ? 'critical' : 'warning',
      title: 'Poco ramp',
      message: `Solo tienes ${rampCount} cartas de ramp. Se recomiendan al menos 8-10.`,
      action: 'Añade más fuentes de maná'
    });
  }

  // Alert 3: Removal
  if (removalCount < 5) {
    alerts.push({
      level: removalCount < 3 ? 'critical' : 'warning',
      title: 'Poco removal',
      message: `Solo tienes ${removalCount} cartas de removal. Se recomiendan al menos 5-7.`,
      action: 'Añade más removal o board wipes'
    });
  }

  // Alert 4: Win-cons
  if (winConCount === 0) {
    alerts.push({
      level: 'warning',
      title: 'Sin win-cons etiquetadas',
      message: 'No has etiquetado ninguna carta como "Win-Con". Asegúrate de tener formas claras de ganar.',
      action: 'Etiqueta tus condiciones de victoria'
    });
  }

  // Alert 5: Color imbalance
  const colors = ['W', 'U', 'B', 'R', 'G'] as const;
  colors.forEach(color => {
    const pipCount = pips[color];
    const prodCount = prod[color];
    if (pipCount > 0 && prodCount > 0 && pipCount > prodCount * 2) {
      const colorNames: Record<string, string> = { W: 'Blanco', U: 'Azul', B: 'Negro', R: 'Rojo', G: 'Verde' };
      // Target a safer ratio (e.g., 1.5)
      const recommended = Math.ceil(pipCount / 1.5);
      
      alerts.push({
        level: 'warning',
        title: `Te falta maná ${colorNames[color]}`,
        message: `Tu mazo "pide" mucho ${colorNames[color]} (${pipCount} símbolos) pero tienes pocas tierras que lo produzcan (${prodCount} fuentes). Podrías quedarte atascado.`,
        action: `Añade más tierras o rocas que den maná ${colorNames[color]} (Recomendado: ~${recommended} fuentes)`
      });
    }
  });

  // Alert 6: Singleton Rule
  const duplicates: string[] = [];
  cards.forEach(c => {
    // Check if it's a basic land (usually has "Basic Land" in type line or is one of the 5 basic types)
    // Safe check: type_line includes "Basic" and "Land"
    const isBasic = c.type_line?.includes('Basic') && c.type_line?.includes('Land');
    if (!isBasic && c.quantity > 1) {
      duplicates.push(`${c.card_name} (x${c.quantity})`);
    }
  });

  if (duplicates.length > 0) {
    alerts.push({
      level: 'critical',
      title: 'Regla de Singleton violada',
      message: `Tienes cartas repetidas que no son tierras básicas: ${duplicates.join(', ')}.`,
      action: 'Deja solo 1 copia de cada carta.'
    });
  }

  // Alert 7: Cumulative Budget
  if (totalSpent > budgetLimit) {
    const diff = (totalSpent - budgetLimit).toFixed(2);
    alerts.push({
      level: 'critical',
      title: 'Presupuesto Excedido',
      message: `Has gastado ${totalSpent.toFixed(2)}€, superando el límite acumulado de ${budgetLimit}€. Te has pasado por ${diff}€.`,
      action: 'Considera reducir el coste del mazo o espera al mes siguiente.',
      progress: {
        current: totalSpent,
        total: budgetLimit,
        color: 'var(--color-red)'
      }
    });
  } else if (totalSpent > budgetLimit * 0.9) {
    alerts.push({
      level: 'warning',
      title: 'Cerca del límite de presupuesto',
      message: `Has gastado ${totalSpent.toFixed(2)}€ de ${budgetLimit}€ disponibles (${((totalSpent / budgetLimit) * 100).toFixed(0)}%).`,
      progress: {
        current: totalSpent,
        total: budgetLimit,
        color: '#ff9800'
      }
    });
  } else if (totalSpent < budgetLimit - 5) {
     alerts.push({
      level: 'ok',
      title: 'Presupuesto disponible',
      message: `Tienes un margen de ${(budgetLimit - totalSpent).toFixed(2)}€ para mejorar tu mazo.`,
      progress: {
        current: totalSpent,
        total: budgetLimit,
        color: 'var(--color-green)'
      }
    });
  }

  // If all good
  if (alerts.length === 0) {
    alerts.push({
      level: 'ok',
      title: '¡Mazo bien equilibrado!',
      message: 'No se han detectado problemas graves en la construcción del mazo.'
    });
  }

  const getIcon = (level: string) => {
    switch (level) {
      case 'ok': return '✅';
      case 'warning': return '⚠️';
      case 'critical': return '🔴';
      default: return 'ℹ️';
    }
  };

  const getColor = (level: string) => {
    switch (level) {
      case 'ok': return 'var(--color-green)';
      case 'warning': return '#ff9800';
      case 'critical': return 'var(--color-red)';
      default: return '#888';
    }
  };

  return (
    <div className="card">
      <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-gold)' }}>Alertas Inteligentes</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {alerts.map((alert, i) => (
          <div
            key={i}
            style={{
              padding: '1rem',
              borderRadius: '8px',
              border: `1px solid ${getColor(alert.level)}`,
              background: `${getColor(alert.level)}11`,
              display: 'flex',
              gap: '1rem',
              alignItems: 'flex-start'
            }}
          >
            <div style={{ fontSize: '1.5rem', flexShrink: 0 }}>{getIcon(alert.level)}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 'bold', marginBottom: '0.25rem', color: getColor(alert.level) }}>
                {alert.title}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#aaa', marginBottom: alert.action || alert.progress ? '0.5rem' : 0 }}>
                {alert.message}
              </div>
              
              {alert.progress && (
                <div style={{ margin: '0.8rem 0', width: '100%' }}>
                   <div style={{ height: '6px', background: '#333', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ 
                        height: '100%', 
                        width: `${Math.min(100, (alert.progress.current / alert.progress.total) * 100)}%`, 
                        background: alert.progress.color,
                        transition: 'width 0.3s ease'
                      }} />
                   </div>
                </div>
              )}

              {alert.action && (
                <div style={{ fontSize: '0.8rem', color: '#666', fontStyle: 'italic' }}>
                  💡 {alert.action}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
