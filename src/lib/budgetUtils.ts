export interface BudgetInfo {
  monthsActive: number;
  dynamicLimit: number;
  totalSpent: number;
  remaining: number;
  isOverBudget: boolean;
  statusColor: string;
}

import { LEAGUE_START_DATE, MONTHLY_ALLOWANCE } from './constants';


/**
 * Calculates budget information.
 * @param createdAt Creation date of the deck.
 * @param spent Total registered spent in the DB.
 * @param liveTrendingSpent (Optional) If provided, this replaces the current month's registered cost for a live view.
 */
export function calculateDeckBudget(createdAt: string | Date, spent: number = 0, liveTrendingSpent?: number): BudgetInfo {
  // We ignore createdAt for budget cap purposes now, everyone starts from League Start
  const startDate = LEAGUE_START_DATE;
  const now = new Date();
  
  // Calculate months difference from League Start
  const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  // Active months starts at 1
  const monthsActive = Math.max(1, monthsDiff + 1);
  
  const dynamicLimit = monthsActive * MONTHLY_ALLOWANCE;
  
  // If we have live trending spent, we use it. 
  // IMPORTANT: The caller is responsible for ensuring 'spent' doesn't double count if they provide liveTrendingSpent.
  // In the current implementation, we'll assume 'spent' is total, and if 'liveTrendingSpent' is given, 
  // the caller handled the current month subtraction if needed. 
  // However, it's safer to just provide the final sum to this utility.
  
  const finalSpent = liveTrendingSpent !== undefined ? liveTrendingSpent : spent;
  const remaining = dynamicLimit - finalSpent;
  const isOverBudget = finalSpent > dynamicLimit;

  // Status Color Logic
  let statusColor = 'var(--color-green)';
  if (finalSpent > dynamicLimit + 1) {
      statusColor = 'var(--color-red)'; // Red if over budget by more than 1€
  } else if (finalSpent > dynamicLimit) {
      statusColor = '#ff9800'; // Orange if over budget by up to 1€
  }

  return {
    monthsActive,
    dynamicLimit,
    totalSpent: finalSpent,
    remaining,
    isOverBudget,
    statusColor
  };
}
