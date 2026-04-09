import { DeckCard } from '@/types';
import BRACKETS_DATA from '@/data/brackets.json';

const BRACKETS = BRACKETS_DATA as { name: string, bracket: number, reason: string }[];

/**
 * Parses a mana cost string like "{1}{W}{U}" and returns the CMC.
 */
export const calculateCMC = (mana_cost: string | null): number => {
  if (!mana_cost) return 0;
  const matches = mana_cost.match(/\{(\d+|X|W|U|B|R|G|C|S|P)\}/g);
  if (!matches) {
     const num = parseInt(mana_cost || '');
     return isNaN(num) ? 0 : num;
  }
  let cmc = 0;
  matches.forEach(m => {
    const val = m.replace(/\{|\}/g, '');
    if (!isNaN(parseInt(val))) cmc += parseInt(val);
    else if (['W', 'U', 'B', 'R', 'G', 'C', 'S', 'P'].includes(val)) cmc += 1;
  });
  return cmc;
};

/**
 * Heuristically determines the function of a card based on its text and type.
 */
export const getCardFunction = (card: DeckCard): 'Ramp' | 'Draw' | 'Removal' | 'Board Wipe' | 'Other' => {
  const text = (card.oracle_text || '').toLowerCase();
  const type = (card.type_line || '').toLowerCase();

  if (text.includes('search your library for a land') || text.includes('add {') || text.includes('put a land card from your hand onto the battlefield')) {
    if (!type.includes('land')) return 'Ramp';
  }
  if (text.includes('draw a card') || text.includes('draw two cards') || text.includes('draw three cards') || (text.includes('reveal the top') && text.includes('put it into your hand'))) {
    return 'Draw';
  }
  if (text.includes('destroy target') || text.includes('exile target') || text.includes('deals damage to target creature') || text.includes('-1/-1 until end of turn')) {
    return 'Removal';
  }
  if (text.includes('destroy all') || text.includes('exile all') || text.includes('each player sacrifices') || text.includes('each creature')) {
     return 'Board Wipe';
  }
  return 'Other';
};

/**
 * High Power / cEDH specific cards and combinations.
 */
export const EXTRA_TURN_CARDS = new Set([
  "time warp", "temporal manipulation", "capture of jingzhou", "expropriate", 
  "time stretch", "nexus of fate", "beacon of tomorrows", "temporal mastery", 
  "walk the aeons", "part the waterveil", "karn's temporal sundering", 
  "alrund's epiphany", "plea for power", "time siege", "notorious throng"
]);

export const CEDH_COMBOS = [
  { name: "Thoracle Combo", cards: ["thassa's oracle", "demonic consultation"] },
  { name: "Thoracle Combo (Pact)", cards: ["thassa's oracle", "tainted pact"] },
  { name: "Breach LED", cards: ["underworld breach", "lion's eye diamond"] },
  { name: "IsoRev", cards: ["isochron scepter", "dramatic reversal"] }
];

export interface BracketResult {
  level: number;
  label: string;
  sub: string;
  reason: string;
  detectedCombos: string[];
  restrictedCards: { name: string, reason: string }[];
  extraTurnCount: number;
}

/**
 * Calculates the power level (Bracket) of a deck.
 */
export function calculateDeckBracket(cards: DeckCard[]): BracketResult {
  const cardNames = new Set(cards.map(c => c.card_name.toLowerCase()));
  
  const detectedBracketCards = cards.map(c => {
    const match = BRACKETS.find(b => b.name === c.card_name);
    return match ? { ...match, card: c } : null;
  }).filter(Boolean) as { name: string, bracket: number, reason: string, card: DeckCard }[];

  const gameChangers = detectedBracketCards.filter(c => c.reason.includes("Game Changer") || c.reason.includes("Tutor") || c.reason.includes("Fast Mana"));
  const mldCards = detectedBracketCards.filter(c => c.reason.includes("Mass Land Denial") || c.reason.includes("Stax"));
  const extraTurnCount = cards.filter(c => EXTRA_TURN_CARDS.has(c.card_name.toLowerCase())).reduce((acc, c) => acc + c.quantity, 0);

  const detectedCombos = CEDH_COMBOS.filter(combo => 
    combo.cards.every(name => cardNames.has(name))
  );

  let level = 2;
  let reason = "Standard Commander Deck";

  if (detectedCombos.length > 0) {
    level = 5;
    reason = "Contains known cEDH win conditions (Combos).";
  } 
  else if (mldCards.length > 0) {
    level = 4;
    reason = "Contains Mass Land Denial or Stax.";
  } else if (extraTurnCount > 1) {
    level = 4;
    reason = "Potential for chaining Extra Turns (>1 card).";
  } else if (gameChangers.length > 3) {
    level = 4;
    reason = `High density of Game Changers (${gameChangers.length}).`;
  }
  else if (gameChangers.length > 0) {
    level = 3;
    reason = `Contains Game Changers (${gameChangers.length} <= 3).`;
  }
  else {
    level = 2;
    if (extraTurnCount > 0) {
      reason = "Contains an Extra Turn spell.";
    } else {
        reason = "Balanced deck with no restricted power cards found.";
    }
  }

  const labels: Record<number, { label: string, sub: string }> = {
    1: { label: 'BRACKET 1', sub: 'Exhibition' },
    2: { label: 'BRACKET 2', sub: 'Core' },
    3: { label: 'BRACKET 3', sub: 'Upgraded' },
    4: { label: 'BRACKET 4', sub: 'Optimized' },
    5: { label: 'BRACKET 5', sub: 'cEDH' }
  };

  const info = labels[level] || { label: '?', sub: 'Unknown' };

  return {
    level,
    label: info.label,
    sub: info.sub,
    reason,
    detectedCombos: detectedCombos.map(c => c.name),
    restrictedCards: detectedBracketCards.map(c => ({ name: c.name, reason: c.reason })),
    extraTurnCount
  };
}

export const MULTI_COPY_CARDS = [
  'shadowborn apostle',
  'relentless rats',
  'rat colony',
  'dragon\'s approach',
  'persistent petitioners',
  'slime against humanity',
  'nazgûl'
];

/**
 * Checks for Singleton rule violations.
 */
export function checkSingleton(cards: DeckCard[]): string[] {
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
  return duplicates;
}

/**
 * Validates if a card (or pair) can be a commander.
 */
export function validateCommanderLegality(commanders: DeckCard[]): string[] {
  const errors: string[] = [];
  
  if (commanders.length === 0) {
    errors.push('No hay comandante seleccionado');
    return errors;
  }

  if (commanders.length > 2) {
    errors.push(`Demasiados comandantes (${commanders.length}). Máximo 2 con Partner/Background.`);
    return errors;
  }

  commanders.forEach(c => {
    const typeLine = c.type_line?.toLowerCase() || '';
    const oracleText = c.oracle_text?.toLowerCase() || '';
    const isLegendary = typeLine.includes('legendary');
    const isCreature = typeLine.includes('creature') || typeLine.includes('criatura');
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
        errors.push(`${c.card_name}: ${reason}`);
    }
  });

  if (commanders.length === 2) {
    const c1Text = commanders[0].oracle_text?.toLowerCase() || '';
    const c2Text = commanders[1].oracle_text?.toLowerCase() || '';
    const c1Type = commanders[0].type_line?.toLowerCase() || '';
    const c2Type = commanders[1].type_line?.toLowerCase() || '';

    const hasPartner = (txt: string) => txt.includes('partner') || txt.includes('companion') || txt.includes('friends forever');
    const hasChooseBackground = (txt: string) => txt.includes('choose a background') || txt.includes('elige un trasfondo');
    const isBackgroundStr = (type: string) => type.includes('background') && type.includes('enchantment');

    let legalPair = false;
    if (hasPartner(c1Text) && hasPartner(c2Text)) legalPair = true;
    if ((hasChooseBackground(c1Text) && isBackgroundStr(c2Type)) || (hasChooseBackground(c2Text) && isBackgroundStr(c1Type))) legalPair = true;
    if (c1Text.includes('partner with') && c2Text.includes('partner with')) legalPair = true;

    if (!legalPair) {
      errors.push('La pareja de comandantes no es legal (faltan habilidades de Partner o Trasfondo)');
    }
  }

  return errors;
}

/**
 * Heuristically extracts color identity from card data.
 */
export function getCardColorIdentity(card: DeckCard, scryfallMap?: Record<string, string[]>): Set<string> {
  if (scryfallMap && scryfallMap[card.card_name]) {
    return new Set(scryfallMap[card.card_name]);
  }
  const identities = new Set<string>();
  const oracleClean = (card.oracle_text || '').replace(/\([^)]*\)/g, '');
  const combined = (card.mana_cost || '') + ' ' + oracleClean;
  const typeLine = card.type_line?.toLowerCase() || '';

  if (typeLine.includes('plains')) identities.add('W');
  if (typeLine.includes('island')) identities.add('U');
  if (typeLine.includes('swamp')) identities.add('B');
  if (typeLine.includes('mountain')) identities.add('R');
  if (typeLine.includes('forest')) identities.add('G');
  
  const matches = combined.match(/\{[^}]+\}/g) || [];
  matches.forEach(s => {
      const upper = s.toUpperCase();
      if (upper.includes('W')) identities.add('W');
      if (upper.includes('U')) identities.add('U');
      if (upper.includes('B')) identities.add('B');
      if (upper.includes('R')) identities.add('R');
      if (upper.includes('G')) identities.add('G');
  });
  return identities;
}
