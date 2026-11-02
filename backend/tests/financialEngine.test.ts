import { describe, it, expect } from 'vitest';
import { FinancialEngine } from '../src/services/financialEngine';

describe('FinancialEngine Calculations', () => {
  it('calculates EMI correctly for standard interest rates', () => {
    // Principal $100,000, 10% annual rate, 12 months
    const emi = FinancialEngine.calculateEMI(100000, 10, 12);
    expect(emi).toBe(8791.59);
  });

  it('handles 0% interest rate EMI calculation', () => {
    const emi = FinancialEngine.calculateEMI(12000, 0, 12);
    expect(emi).toBe(1000);
  });

  it('calculates Net Worth with positive assets and credit card debt', () => {
    const accounts = [
      { id: '1', type: 'BANK', balance: 5000 },
      { id: '2', type: 'CREDIT_CARD', balance: 1200 } // $1200 credit card debt
    ];
    const investments = [
      { id: '1', investedAmount: 2000, currentValue: 2500 }
    ];
    const loans = [
      { id: '1', type: 'BORROWED', remainingPrincipal: 1000 }
    ];

    const result = FinancialEngine.calculateNetWorth(accounts, investments, loans);

    // Total Assets = $5000 (bank) + $2500 (investment) = $7500
    // Total Liabilities = $1200 (credit card) + $1000 (loan) = $2200
    // Net Worth = $7500 - $2200 = $5300
    expect(result.totalAssets).toBe(7500);
    expect(result.totalLiabilities).toBe(2200);
    expect(result.netWorth).toBe(5300);
  });

  it('verifies transfers do not alter total Net Worth', () => {
    // Account A balance $4000, Account B balance $1000
    const beforeAccounts = [
      { id: 'a', type: 'BANK', balance: 4000 },
      { id: 'b', type: 'SAVINGS', balance: 1000 }
    ];
    const beforeNetWorth = FinancialEngine.calculateNetWorth(beforeAccounts, [], []).netWorth;

    // After $500 transfer from A to B: A=3500, B=1500
    const afterAccounts = [
      { id: 'a', type: 'BANK', balance: 3500 },
      { id: 'b', type: 'SAVINGS', balance: 1500 }
    ];
    const afterNetWorth = FinancialEngine.calculateNetWorth(afterAccounts, [], []).netWorth;

    expect(beforeNetWorth).toBe(5000);
    expect(afterNetWorth).toBe(5000);
  });

  it('calculates Savings Rate percentage accurately', () => {
    const { savings, savingsRate } = FinancialEngine.calculateSavingsRate(5000, 3500);
    expect(savings).toBe(1500);
    expect(savingsRate).toBe(30.0);
  });

  it('detects budget overspending and warning thresholds', () => {
    const normal = FinancialEngine.calculateBudgetUtilization(1000, 500);
    expect(normal.percentage).toBe(50);
    expect(normal.isOverBudget).toBe(false);

    const warning = FinancialEngine.calculateBudgetUtilization(1000, 900);
    expect(warning.isWarning).toBe(true);

    const over = FinancialEngine.calculateBudgetUtilization(1000, 1100);
    expect(over.isOverBudget).toBe(true);
  });
});
