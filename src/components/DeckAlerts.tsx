'use client'

import React from 'react';

interface DeckCard {
  card_name: string;
  quantity: number;
  type_line: string | null;
  mana_cost: string | null;
  oracle_text: string | null;
  is_commander?: boolean;
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
    const producesMana = (rawStr: string) => {
        if (!rawStr) return false;
        const str = rawStr.toLowerCase();
        
        // precise mapping
        if (str.includes('{w}') || str.includes('plains')) prod.W += c.quantity;
        if (str.includes('{u}') || str.includes('island')) prod.U += c.quantity;
        if (str.includes('{b}') || str.includes('swamp')) prod.B += c.quantity;
        if (str.includes('{r}') || str.includes('mountain')) prod.R += c.quantity;
        if (str.includes('{g}') || str.includes('forest')) prod.G += c.quantity;
        
        // Check for "Any color" detection
        // Matches: "add one mana of any color", "any type", "any one color"
        // AND ALSO "search... basic land" (Evolving Wilds, etc.)
        if (
            str.includes('any color') || 
            str.includes('any type') || 
            str.includes('any one color') ||
            str.includes('basic land')
        ) {
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

        // ...BUT ALSO check if they produce mana (Rocks, Dorks, Enchantments, RITUALS, RAMP)
        // Heuristic: Must have "add" (Rituals/Rocks) OR "search" (Ramp/Fetch)
        if (text.toLowerCase().includes('add') || text.toLowerCase().includes('search')) {
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
  const MULTI_COPY_CARDS = [
    'shadowborn apostle',
    'relentless rats',
    'rat colony',
    'dragon\'s approach',
    'persistent petitioners',
    'slime against humanity',
    'nazgûl'
  ];

  const duplicates: string[] = [];
  cards.forEach(c => {
    const isBasic = c.type_line?.includes('Basic') && c.type_line?.includes('Land');
    const isMultiCopy = MULTI_COPY_CARDS.includes(c.card_name.toLowerCase());
    
    if (!isBasic && !isMultiCopy && c.quantity > 1) {
      duplicates.push(`${c.card_name} (x${c.quantity})`);
    } else if (c.card_name.toLowerCase() === 'nazgûl' && c.quantity > 9) {
      duplicates.push(`Nazgûl (máx 9, tienes ${c.quantity})`);
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

  // Alert 8: Commander Legality
  const invalidCommanders: string[] = [];
  const commanders = cards.filter(c => c.is_commander);

  commanders.forEach(c => {
    const typeLine = c.type_line?.toLowerCase() || '';
    const oracleText = c.oracle_text?.toLowerCase() || '';
    const isLegendary = typeLine.includes('legendary');
    const isCreature = typeLine.includes('creature') || typeLine.includes('criatura'); // Support for local cache/trans
    const isPlaneswalker = typeLine.includes('planeswalker');
    const isBackground = typeLine.includes('background') && typeLine.includes('enchantment');
    const canBeCommanderText = oracleText.includes('can be your commander') || oracleText.includes('puede ser tu comandante');

    let isValid = false;
    if (isLegendary) {
        if (isCreature) isValid = true;
        if (isPlaneswalker && canBeCommanderText) isValid = true;
        if (isBackground) isValid = true;
    }

    if (!isValid) {
        let reason = 'No es una criatura legendaria';
        if (isPlaneswalker && !canBeCommanderText) reason = 'Este Planeswalker no puede ser comandante';
        if (!isLegendary) reason = 'No es legendario/a';
        invalidCommanders.push(`${c.card_name} (${reason})`);
    }
  });

  if (invalidCommanders.length > 0) {
    alerts.push({
      level: 'critical',
      title: 'Comandante no legal',
      message: `Las siguientes cartas no pueden ser tus comandantes según las reglas oficiales: ${invalidCommanders.join(', ')}.`,
      action: 'Cambia tus comandantes por criaturas legendarias o planeswalkers permitidos.'
    });
  }

  // Alert 9: Commander Pairings & Count
  if (commanders.length > 2) {
    alerts.push({
      level: 'critical',
      title: 'Demasiados comandantes',
      message: `Tienes ${commanders.length} comandantes. Solo se permiten 1 o 2 (si tienen Partner, Background, etc.).`,
      action: 'Marca solo las cartas que realmente sean tus comandantes.'
    });
  } else if (commanders.length === 2) {
    const c1Text = commanders[0].oracle_text?.toLowerCase() || '';
    const c2Text = commanders[1].oracle_text?.toLowerCase() || '';
    const c1Type = commanders[0].type_line?.toLowerCase() || '';
    const c2Type = commanders[1].type_line?.toLowerCase() || '';

    const hasPartner = (txt: string) => txt.includes('partner') || txt.includes('companion') || txt.includes('friends forever');
    const hasChooseBackground = (txt: string) => txt.includes('choose a background') || txt.includes('elige un trasfondo');
    const isBackgroundStr = (type: string) => type.includes('background') && type.includes('enchantment');

    const c1Partner = hasPartner(c1Text);
    const c2Partner = hasPartner(c2Text);
    const c1Choose = hasChooseBackground(c1Text);
    const c2Choose = hasChooseBackground(c2Text);
    const c1Back = isBackgroundStr(c1Type);
    const c2Back = isBackgroundStr(c2Type);

    let legalPair = false;
    if (c1Partner && c2Partner) legalPair = true;
    if ((c1Choose && c2Back) || (c2Choose && c1Back)) legalPair = true;
    
    // Support "Partner with [Name]" - usually contains "Partner with"
    if (c1Text.includes('partner with') && c2Text.includes('partner with')) legalPair = true;

    if (!legalPair) {
      alerts.push({
        level: 'critical',
        title: 'Pareja de comandantes no válida',
        message: 'Tienes 2 comandantes, pero no parecen tener habilidades de pareja legales (como Partner o Trasfondo).',
        action: 'Asegúrate de que ambos tengan Partner, o uno tenga "Choose a Background" y el otro sea un Trasfondo.'
      });
    }
  } else if (commanders.length === 0) {
    alerts.push({
      level: 'warning',
      title: 'Sin comandante',
      message: 'No has marcado ninguna carta como comandante en este mazo.',
      action: 'Abre el detalle de una carta y pulsa "Set Commander".'
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
