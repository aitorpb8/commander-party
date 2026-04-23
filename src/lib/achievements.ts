
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
  },
  pata_negra: {
    id: 'pata_negra',
    name: 'Pata Negra',
    description: 'Juega con un mazo original (0€ gastados) tras al menos una partida.',
    icon: '🐗',
    color: '#8B4513'
  },
  streak: {
    id: 'streak',
    name: 'Imparable',
    description: 'Ha conseguido una racha de 2 o más victorias consecutivas.',
    icon: '🔥',
    color: '#FFD700'
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
  if (userUpgrades.some(u => Number(u.cost || 0) >= HIGH_ROLLER_THRESHOLD)) {
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
    const cost = Number(u.cost || 0);
    if (!isNaN(cost)) {
      monthlyTotals[u.month] = (monthlyTotals[u.month] || 0) + cost;
    }
  });
  if (Object.values(monthlyTotals).some(total => total === MONTHLY_ALLOWANCE)) {
    earned.push(BADGES.budget_master);
  }

  // 7. Pata Negra
  if (userDecks.some(d => (d.budget_spent || 0) <= 0.01) && userMatches.length >= 1) {
    earned.push(BADGES.pata_negra);
  }

  // 8. Imparable (Streak)
  const sortedMatches = [...userMatches].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  let currentStreak = 0;
  let maxStreak = 0;
  sortedMatches.forEach(m => {
    if (m.winner_id === userId) {
      currentStreak++;
      if (currentStreak > maxStreak) maxStreak = currentStreak;
    } else {
      currentStreak = 0;
    }
  });
  if (maxStreak >= 2) {
    earned.push(BADGES.streak);
  }

  return earned;
}
