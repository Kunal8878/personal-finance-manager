import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  currency: z.string().default('USD')
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export const accountSchema = z.object({
  name: z.string().min(1, 'Account name is required'),
  type: z.enum(['BANK', 'SAVINGS', 'CURRENT', 'CASH', 'CREDIT_CARD', 'DIGITAL_WALLET', 'OTHER']),
  institution: z.string().optional(),
  balance: z.number().default(0.0),
  currency: z.string().default('USD')
});

export const transactionSchema = z.object({
  accountId: z.string().uuid('Valid account ID required'),
  toAccountId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.number().positive('Transaction amount must be greater than 0'),
  currency: z.string().min(2).max(5).default('INR'),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'INVESTMENT', 'LOAN_PAYMENT']),
  date: z.string().or(z.date()),
  notes: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  isRecurring: z.boolean().default(false)
});

export const updateTransactionSchema = z.object({
  accountId: z.string().uuid().optional(),
  toAccountId: z.string().uuid().optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  amount: z.number().positive().optional(),
  currency: z.string().min(2).max(5).optional(),
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'REFUND', 'INVESTMENT', 'LOAN_PAYMENT']).optional(),
  date: z.string().or(z.date()).optional(),
  notes: z.string().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
  isRecurring: z.boolean().optional()
});

export const budgetSchema = z.object({
  categoryId: z.string().uuid('Valid category ID required'),
  amount: z.number().positive('Budget amount must be greater than 0'),
  period: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date())
});

export const goalSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  targetAmount: z.number().positive('Target amount must be positive'),
  currentAmount: z.number().min(0).default(0.0),
  targetDate: z.string().or(z.date()),
  category: z.string().default('EMERGENCY_FUND')
});

export const investmentSchema = z.object({
  name: z.string().min(1, 'Investment name is required'),
  type: z.enum(['STOCKS', 'MUTUAL_FUNDS', 'ETFS', 'FIXED_DEPOSIT', 'GOLD', 'BONDS', 'OTHER']),
  investedAmount: z.number().positive('Invested amount must be positive'),
  currentValue: z.number().min(0, 'Current value cannot be negative')
});

export const loanSchema = z.object({
  name: z.string().min(1, 'Loan name is required'),
  type: z.enum(['BORROWED', 'LENT']),
  principal: z.number().positive('Principal must be positive'),
  interestRate: z.number().min(0, 'Interest rate cannot be negative'),
  tenureMonths: z.number().int().positive('Tenure in months must be at least 1'),
  startDate: z.string().or(z.date())
});

export const subscriptionSchema = z.object({
  name: z.string().min(1, 'Subscription name is required'),
  cost: z.number().positive('Cost must be positive'),
  billingCycle: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
  nextBillingDate: z.string().or(z.date()),
  categoryId: z.string().uuid().optional().nullable(),
  accountId: z.string().uuid().optional().nullable(),
  isActive: z.boolean().default(true)
});
