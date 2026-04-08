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
 * @param totalSpent Total registered spent in the DB.
 */
export function calculateDeckBudget(createdAt: string | Date, totalSpent: number = 0): BudgetInfo {
  const startDate = LEAGUE_START_DATE;
  const now = new Date();
  
  // Calculate months difference from League Start
  const monthsDiff = (now.getFullYear() - startDate.getFullYear()) * 12 + (now.getMonth() - startDate.getMonth());
  const monthsActive = Math.max(1, monthsDiff + 1);
  
  const dynamicLimit = monthsActive * MONTHLY_ALLOWANCE;
  const remaining = dynamicLimit - totalSpent;
  const isOverBudget = totalSpent > dynamicLimit;

  // Status Color Logic
  let statusColor = 'var(--color-green)';
  if (totalSpent > dynamicLimit + 0.01) {
      statusColor = 'var(--color-red)';
  } else if (totalSpent > dynamicLimit - 1) {
      statusColor = '#ff9800'; // Close to limit
  }

  return {
    monthsActive,
    dynamicLimit,
    totalSpent,
    remaining,
    isOverBudget,
    statusColor
  };
}
