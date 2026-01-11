export interface BudgetInfo {
  monthsActive: number;
  dynamicLimit: number;
  totalSpent: number;
  remaining: number;
  isOverBudget: boolean;
  statusColor: string;
}

export const MONTHLY_ALLOWANCE = 10;

export function calculateDeckBudget(createdAt: string | Date, spent: number = 0): BudgetInfo {
  const createdDate = new Date(createdAt);
  const now = new Date();
  
  // Calculate months difference
  const monthsDiff = (now.getFullYear() - createdDate.getFullYear()) * 12 + (now.getMonth() - createdDate.getMonth());
  // Active months starts at 1
  const monthsActive = Math.max(1, monthsDiff + 1);
  
  const dynamicLimit = monthsActive * MONTHLY_ALLOWANCE;
  const remaining = dynamicLimit - spent;
  const isOverBudget = spent > dynamicLimit;

  // Status Color Logic
  let statusColor = 'var(--color-green)';
  if (spent > dynamicLimit) {
      statusColor = 'var(--color-red)';
  } else if (spent > dynamicLimit * 0.9) {
      statusColor = '#ff9800'; // Orange warning
  }

  return {
    monthsActive,
    dynamicLimit,
    totalSpent: spent,
    remaining,
    isOverBudget,
    statusColor
  };
}
