
export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

import { MONTHLY_ALLOWANCE, WHALE_THRESHOLD, HIGH_ROLLER_THRESHOLD } from './constants';

export const BADGES: { [key: string]: Badge } = {
  budget_master: {
    id: 'budget_master',
    name: 'Budget Master',
    description: `Ha gastado exactamente ${MONTHLY_ALLOWANCE}.00€ en mejoras en un solo mes.`,
    icon: '🎯',
    color: '#D4AF37'
  },

  slayer: {
    id: 'slayer',
    name: 'Slayer',
    description: 'Ha conseguido al menos una victoria en la liga.',
    icon: '⚔️',
    color: '#FF4500'
  },
  veteran: {
    id: 'veteran',
    name: 'Veterano',
    description: 'Ha participado en 5 o más partidas.',
    icon: '🎖️',
    color: '#4682B4'
  },
  brewer: {
    id: 'brewer',
    name: 'Brewer',
    description: 'Tiene 3 o más mazos registrados.',
    icon: '🧪',
    color: '#32CD32'
  },
  high_roller: {
    id: 'high_roller',
    name: 'High Roller',
    description: `Ha realizado una mejora de ${HIGH_ROLLER_THRESHOLD}.00€ o más.`,
    icon: '💎',
    color: '#00FFFF'
  },
  whale: {
    id: 'whale',
    name: 'Ballena',
    description: `Uno de sus mazos supera los ${WHALE_THRESHOLD}€ de inversión total.`,
    icon: '🐋',
    color: '#1E90FF'
  }
};

export function calculateAchievements(data: {
  decks: any[];
  upgrades: any[];
  matches: any[];
  userId: string;
}) {
  const { decks, upgrades, matches, userId } = data;
  const userDecks = decks.filter(d => d.user_id === userId);
  const userUpgrades = upgrades.filter(u => userDecks.some(d => d.id === u.deck_id));
  const userMatches = matches.filter(m => m.players.includes(userId));
  const userWins = matches.filter(m => m.winner_id === userId);

  const earned: Badge[] = [];

  // 1. Brewer
  if (userDecks.length >= 3) {
    earned.push(BADGES.brewer);
  }

  // 2. Slayer
  if (userWins.length >= 1) {
    earned.push(BADGES.slayer);
  }

  // 3. Veteran
  if (userMatches.length >= 5) {
    earned.push(BADGES.veteran);
  }

  // 4. High Roller
  if (userUpgrades.some(u => parseFloat(u.cost) >= HIGH_ROLLER_THRESHOLD)) {
    earned.push(BADGES.high_roller);
  }

  // 5. Whale
  if (userDecks.some(d => d.budget_spent >= WHALE_THRESHOLD)) {
    earned.push(BADGES.whale);
  }

  // 6. Budget Master
  // Group upgrades by month for all decks
  const monthlyTotals: { [key: string]: number } = {};
  userUpgrades.forEach(u => {
    monthlyTotals[u.month] = (monthlyTotals[u.month] || 0) + parseFloat(u.cost);
  });
  if (Object.values(monthlyTotals).some(total => total === MONTHLY_ALLOWANCE)) {

    earned.push(BADGES.budget_master);
  }

  return earned;
}
