export interface BudgetInfo {
  monthsActive: number;
  dynamicLimit: number;
  totalSpent: number;
  remaining: number;
  isOverBudget: boolean;
  statusColor: string;
}

export const MONTHLY_ALLOWANCE = 10;

/**
 * Calculates budget information.
 * @param createdAt Creation date of the deck.
 * @param spent Total registered spent in the DB.
 * @param liveTrendingSpent (Optional) If provided, this replaces the current month's registered cost for a live view.
 */
export function calculateDeckBudget(createdAt: string | Date, spent: number = 0, liveTrendingSpent?: number): BudgetInfo {
  const createdDate = new Date(createdAt);
  const now = new Date();
  
  // Calculate months difference
  const monthsDiff = (now.getFullYear() - createdDate.getFullYear()) * 12 + (now.getMonth() - createdDate.getMonth());
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
  if (finalSpent > dynamicLimit) {
      statusColor = 'var(--color-red)';
  } else if (finalSpent > dynamicLimit * 0.9) {
      statusColor = '#ff9800'; // Orange warning
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
