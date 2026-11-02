export interface User {
  id: string;
  name: string;
  email: string;
  currency: string;
}

export type AccountType = 'BANK' | 'SAVINGS' | 'CURRENT' | 'CASH' | 'CREDIT_CARD' | 'DIGITAL_WALLET' | 'OTHER';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  institution?: string;
  balance: number;
  currency: string;
  isActive: boolean;
}

export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'REFUND' | 'INVESTMENT' | 'LOAN_PAYMENT';

export interface Category {
  id: string;
  name: string;
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER';
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  toAccountId?: string;
  categoryId?: string;
  amount: number; // Exact original amount
  currency: string; // Exact original currency (INR, USD, EUR, etc.)
  currencySymbol?: string;
  baseCurrency?: string;
  exchangeRate?: number;
  convertedAmount?: number;
  reportingCurrency?: string;
  reportingSymbol?: string;
  reportingAmount?: number;
  needsReconciliation?: boolean;
  type: TransactionType;
  date: string;
  notes?: string;
  receiptUrl?: string;
  isRecurring: boolean;
  account?: { id: string; name: string; type: string; currency?: string };
  toAccount?: { id: string; name: string; type: string; currency?: string };
  category?: { id: string; name: string; icon: string; color: string };
}

export interface BudgetUtilization {
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
  isWarning: boolean;
}

export interface Budget {
  id: string;
  categoryId: string;
  amount: number;
  period: 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate: string;
  category?: { id: string; name: string; color: string; icon: string };
  utilization?: BudgetUtilization;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  category: string;
  percentage?: number;
  remainingAmount?: number;
  monthsRemaining?: number;
  requiredMonthlySavings?: number;
}

export interface Investment {
  id: string;
  name: string;
  type: 'STOCKS' | 'MUTUAL_FUNDS' | 'ETFS' | 'FIXED_DEPOSIT' | 'GOLD' | 'BONDS' | 'OTHER';
  investedAmount: number;
  currentValue: number;
  pnl?: number;
  pnlPercentage?: number;
}

export interface LoanPayment {
  id: string;
  loanId: string;
  amount: number;
  paymentDate: string;
  principalComponent: number;
  interestComponent: number;
  notes?: string;
}

export interface Loan {
  id: string;
  name: string;
  type: 'BORROWED' | 'LENT';
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emiAmount: number;
  remainingPrincipal: number;
  startDate: string;
  payments?: LoanPayment[];
}

export interface Subscription {
  id: string;
  name: string;
  cost: number;
  billingCycle: 'MONTHLY' | 'YEARLY';
  nextBillingDate: string;
  categoryId?: string;
  accountId?: string;
  isActive: boolean;
  category?: { id: string; name: string; color: string };
  account?: { id: string; name: string };
}

export interface MonthlyCashFlowPoint {
  month: string;
  fullYearMonth: string;
  income: number;
  expenses: number;
  netCashFlow: number;
}

export interface WealthGrowthPoint {
  label: string;
  date: string;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
}

export interface BudgetProgressItem {
  id: string;
  categoryName: string;
  color: string;
  budgetAmount: number;
  spentAmount: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface DashboardSummary {
  hasData: boolean;
  reportingCurrency: string;
  reportingSymbol: string;
  netWorth: number;
  prevNetWorth?: number;
  netWorthChangePct?: number;
  totalAssets: number;
  totalLiabilities: number;
  monthlyIncome: number;
  prevMonthlyIncome?: number;
  incomeChangePct?: number;
  monthlyExpenses: number;
  prevMonthlyExpenses?: number;
  expenseChangePct?: number;
  netCashFlow: number;
  prevNetCashFlow?: number;
  cashFlowChangePct?: number;
  savings: number;
  savingsRate: number;
  prevSavingsRate?: number;
  savingsRateChangePct?: number;
  spendingBreakdown: Array<{
    categoryId: string | null;
    categoryName: string;
    color: string;
    amount: number;
    percentage: number;
  }>;
  monthlySeries: MonthlyCashFlowPoint[];
  wealthGrowthHistory: WealthGrowthPoint[];
  budgetProgress: BudgetProgressItem[];
  recentTransactions: Transaction[];
  insights: string[];
}
