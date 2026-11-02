import { describe, it, expect } from 'vitest';
import { AccountAggregatorService } from '../src/services/accountAggregator';
import { AIAdvisorService, UserFinancialSnapshot } from '../src/services/aiAdvisor';

describe('AccountAggregatorService & PAN/Aadhaar Validation', () => {
  it('validates correct Indian PAN format', () => {
    expect(AccountAggregatorService.validatePAN('ABCDE1234F')).toBe(true);
    expect(AccountAggregatorService.validatePAN('invalid_pan')).toBe(false);
  });

  it('validates 12-digit Aadhaar format', () => {
    expect(AccountAggregatorService.validateAadhaar('987654321012')).toBe(true);
    expect(AccountAggregatorService.validateAadhaar('123')).toBe(false);
  });

  it('masks PAN and Aadhaar securely', () => {
    expect(AccountAggregatorService.maskPAN('ABCDE1234F')).toBe('ABCDE****F');
    expect(AccountAggregatorService.maskAadhaar('987654321012')).toBe('XXXX-XXXX-1012');
  });

  it('discovers bank accounts deterministically from PAN', () => {
    const res = AccountAggregatorService.discoverLinkedAccounts('ABCDE1234F');
    expect(res.discoveredAccounts.length).toBeGreaterThan(0);
    expect(res.maskedPan).toBe('ABCDE****F');
  });
});

describe('AIAdvisorService & Financial Health Score Engine', () => {
  const sampleSnapshot: UserFinancialSnapshot = {
    monthlyIncome: 5000,
    monthlyExpenses: 3000,
    totalAssets: 15000,
    totalLiabilities: 2000,
    savingsRate: 40,
    categorySpending: [
      { categoryName: 'Groceries & Dining', amount: 1200 },
      { categoryName: 'Housing & Rent', amount: 1000 },
      { categoryName: 'Entertainment', amount: 800 }
    ],
    subscriptions: [
      { name: 'Netflix', cost: 15.99, billingCycle: 'MONTHLY' },
      { name: 'Spotify', cost: 9.99, billingCycle: 'MONTHLY' }
    ],
    budgets: [
      { categoryName: 'Groceries & Dining', amount: 1500, spent: 1200 }
    ],
    loans: []
  };

  it('calculates Financial Health Score accurately', () => {
    const health = AIAdvisorService.calculateHealthScore(sampleSnapshot);
    expect(health.score).toBeGreaterThan(70);
    expect(health.grade).toBe('EXCELLENT');
    expect(health.strengths.length).toBeGreaterThan(0);
  });

  it('processes expense reduction chatbot query with top spending breakdown', async () => {
    const chat = await AIAdvisorService.processChatPrompt('How can I cut my expenses?', sampleSnapshot);
    expect(chat.reply).toContain('Groceries & Dining');
    expect(chat.reply).toContain('50/30/20');
    expect(chat.suggestions).toContain('Audit Subscriptions');
  });

  it('processes subscription audit prompt', async () => {
    const chat = await AIAdvisorService.processChatPrompt('Audit my subscriptions', sampleSnapshot);
    expect(chat.reply).toContain('Netflix');
    expect(chat.reply).toContain('Spotify');
  });
});
