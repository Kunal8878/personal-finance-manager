/**
 * Financial Calculation Engine
 * Implements strict, decimal-safe financial rules and formulas.
 */

export interface AccountBalance {
  id: string;
  type: string;
  balance: number;
}

export interface InvestmentItem {
  id: string;
  investedAmount: number;
  currentValue: number;
}

export interface LoanItem {
  id: string;
  type: 'BORROWED' | 'LENT' | string;
  remainingPrincipal: number;
}

export class FinancialEngine {
  /**
   * Calculates Monthly Equal Installment (EMI)
   * Formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
   * Where P = Principal, r = Monthly Interest Rate (annualRate / 12 / 100), n = tenureMonths
   */
  static calculateEMI(principal: number, annualInterestRate: number, tenureMonths: number): number {
    if (principal <= 0 || tenureMonths <= 0) return 0;
    if (annualInterestRate === 0) {
      return Number((principal / tenureMonths).toFixed(2));
    }

    const monthlyRate = annualInterestRate / 12 / 100;
    const factor = Math.pow(1 + monthlyRate, tenureMonths);
    const emi = (principal * monthlyRate * factor) / (factor - 1);
    
    return Number(emi.toFixed(2));
  }

  /**
   * Calculates Net Worth from user's accounts, investments, and loans
   */
  static calculateNetWorth(
    accounts: AccountBalance[],
    investments: InvestmentItem[],
    loans: LoanItem[]
  ): { netWorth: number; totalAssets: number; totalLiabilities: number } {
    let liquidAssets = 0;
    let creditDebt = 0;

    for (const acc of accounts) {
      if (acc.type === 'CREDIT_CARD') {
        // If balance is positive, it means debt owed on credit card
        // If balance is negative, user overpaid or credit balance
        if (acc.balance > 0) {
          creditDebt += acc.balance;
        } else {
          liquidAssets += Math.abs(acc.balance);
        }
      } else {
        if (acc.balance >= 0) {
          liquidAssets += acc.balance;
        } else {
          creditDebt += Math.abs(acc.balance);
        }
      }
    }

    const investmentValue = investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0);

    let borrowedLoanDebt = 0;
    let lentLoanAsset = 0;

    for (const loan of loans) {
      if (loan.type === 'BORROWED') {
        borrowedLoanDebt += loan.remainingPrincipal;
      } else if (loan.type === 'LENT') {
        lentLoanAsset += loan.remainingPrincipal;
      }
    }

    const totalAssets = Number((liquidAssets + investmentValue + lentLoanAsset).toFixed(2));
    const totalLiabilities = Number((creditDebt + borrowedLoanDebt).toFixed(2));
    const netWorth = Number((totalAssets - totalLiabilities).toFixed(2));

    return {
      netWorth,
      totalAssets,
      totalLiabilities
    };
  }

  /**
   * Calculates Savings Rate percentage
   */
  static calculateSavingsRate(totalIncome: number, totalExpenses: number): { savings: number; savingsRate: number } {
    const savings = Number((totalIncome - totalExpenses).toFixed(2));
    if (totalIncome <= 0) {
      return { savings: Math.max(0, savings), savingsRate: 0 };
    }
    const rate = Number(((savings / totalIncome) * 100).toFixed(1));
    return {
      savings,
      savingsRate: rate < 0 ? 0 : rate
    };
  }

  /**
   * Calculates Budget Utilization
   */
  static calculateBudgetUtilization(budgetAmount: number, spentAmount: number) {
    const remaining = Number((budgetAmount - spentAmount).toFixed(2));
    const percentage = budgetAmount > 0 ? Number(((spentAmount / budgetAmount) * 100).toFixed(1)) : 0;

    return {
      budgetAmount,
      spentAmount: Number(spentAmount.toFixed(2)),
      remaining,
      percentage,
      isOverBudget: spentAmount > budgetAmount,
      isWarning: percentage >= 85 && percentage <= 100
    };
  }

  /**
   * Generates Personalized Insights based strictly on actual user data
   */
  static generateInsights(summary: {
    totalIncome: number;
    totalExpenses: number;
    savingsRate: number;
    budgetAlerts: Array<{ categoryName: string; percentage: number }>;
    upcomingSubscriptionsCount: number;
    monthlySubscriptionCost: number;
  }): string[] {
    const insights: string[] = [];

    if (summary.totalIncome === 0 && summary.totalExpenses === 0) {
      return []; // Return empty array if no user transaction data
    }

    if (summary.savingsRate > 30) {
      insights.push(`Great job! Your savings rate is strong at ${summary.savingsRate}%.`);
    } else if (summary.savingsRate > 0 && summary.savingsRate <= 15) {
      insights.push(`Your savings rate is ${summary.savingsRate}%. Consider reviewing non-essential spending.`);
    } else if (summary.totalExpenses > summary.totalIncome && summary.totalIncome > 0) {
      insights.push(`Your monthly expenses exceed your monthly income. Check budget alerts below.`);
    }

    for (const alert of summary.budgetAlerts) {
      if (alert.percentage > 100) {
        insights.push(`Overspending Alert: You have exceeded your budget for ${alert.categoryName}.`);
      } else if (alert.percentage >= 85) {
        insights.push(`Budget Warning: You have used ${alert.percentage}% of your ${alert.categoryName} budget.`);
      }
    }

    if (summary.monthlySubscriptionCost > 0) {
      insights.push(`Active subscriptions total $${summary.monthlySubscriptionCost.toFixed(2)} monthly.`);
    }

    return insights;
  }
}
