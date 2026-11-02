import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { CurrencyDisplay, getCurrencySymbol } from '../components/CurrencyDisplay';
import { EmptyState } from '../components/EmptyState';
import { TransactionModal } from '../components/modals/TransactionModal';
import { AccountModal } from '../components/modals/AccountModal';
import { Transaction } from '../types';
import { apiFetch } from '../services/api';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  LayoutDashboard,
  Zap,
  RotateCw,
  CheckCircle2,
  Calendar,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Target,
  ArrowRight
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend
} from 'recharts';
import { Link } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const {
    summary,
    loading,
    refreshFinanceData,
    reportingCurrency,
    hideBalances
  } = useFinance();

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [accModalOpen, setAccModalOpen] = useState(false);
  const [selectedTxToEdit, setSelectedTxToEdit] = useState<Transaction | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [lastApiAction, setLastApiAction] = useState<string | null>(null);

  // Date range filter for charts
  const [timelineRange, setTimelineRange] = useState<'7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL'>('6M');

  const handleSeedData = async () => {
    if (!window.confirm('Re-upload authentic multi-currency pre-seeded data? This will load INR and USD accounts, budgets, goals, and multi-month transactions.')) return;
    setIsSeeding(true);
    setLastApiAction('Broadcasting POST /api/seed...');
    const res = await apiFetch<{ message: string }>('/seed', {
      method: 'POST',
      body: JSON.stringify({ all: false })
    });
    setIsSeeding(false);
    if (res.success) {
      setLastApiAction(`API 200 OK: ${res.data?.message || 'Multi-currency data successfully uploaded!'}`);
      await refreshFinanceData();
    } else {
      setLastApiAction(`API Error: ${res.error || 'Failed to seed data.'}`);
    }
  };

  const handleSimulateLiveTx = async () => {
    setIsSimulating(true);
    setLastApiAction('Sending POST /api/transactions/simulate-live...');
    const res = await apiFetch<{ message: string; transaction: Transaction }>('/transactions/simulate-live', {
      method: 'POST'
    });
    setIsSimulating(false);
    if (res.success && res.data) {
      const tx = res.data.transaction;
      setLastApiAction(
        `Live Real-Time Event: ${tx.notes} • ${tx.type === 'INCOME' ? '+' : '-'}${tx.currencySymbol || ''}${tx.amount} ${tx.currency} (Synced to database & charts)`
      );
      await refreshFinanceData();
    } else {
      setLastApiAction(`API Error: ${res.error || 'Failed to simulate transaction.'}`);
    }
  };

  if (loading && !summary) {
    return (
      <div className="p-12 text-center text-finance-muted font-serif italic text-base animate-pulse">
        Calculating private wealth metrics and multi-currency consolidations...
      </div>
    );
  }

  const hasData = summary && summary.hasData;

  const repSymbol = summary?.reportingSymbol || getCurrencySymbol(reportingCurrency);

  // Custom Chart Tooltip Formatter
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="p-3 bg-finance-card border border-finance-border rounded-xl shadow-xl text-xs space-y-1">
          <p className="font-semibold text-finance-text">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={`item-${index}`} className="num-font text-[11px]" style={{ color: entry.color || entry.fill }}>
              {entry.name}: {repSymbol}{Number(entry.value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 max-w-7xl mx-auto pb-24 lg:pb-16">
      {/* Top Action Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-finance-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-finance-text">
              Portfolio Overview
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-sans uppercase tracking-widest font-bold border border-finance-border text-finance-accent bg-finance-card">
              {reportingCurrency} Base
            </span>
          </div>
          <p className="text-xs text-finance-muted mt-1 font-sans">
            Real-time multi-currency capital balances, asset valuations, and cash flow trajectory.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="px-3.5 py-2 bg-finance-card hover:bg-finance-surface text-finance-text font-medium text-xs rounded-xl border border-finance-border flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            title="Re-seed verified INR and USD transactions and assets"
          >
            <RotateCw className={`w-3.5 h-3.5 text-finance-accent ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'Seeding...' : 'Re-upload Seed Data'}</span>
          </button>

          <button
            onClick={handleSimulateLiveTx}
            disabled={isSimulating}
            className="px-3.5 py-2 bg-finance-card hover:bg-finance-surface text-finance-text font-medium text-xs rounded-xl border border-finance-border flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            title="Send real POST /api/transactions/simulate-live request"
          >
            <Zap className={`w-3.5 h-3.5 text-finance-accent ${isSimulating ? 'animate-bounce' : ''}`} />
            <span>{isSimulating ? 'Broadcasting...' : 'Simulate Live API'}</span>
          </button>

          <button
            onClick={() => {
              setSelectedTxToEdit(null);
              setTxModalOpen(true);
            }}
            className="px-4 py-2 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold text-xs tracking-wide rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Record Transaction</span>
          </button>
        </div>
      </div>

      {/* Live API Activity Monitor Banner */}
      {lastApiAction && (
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-finance-primary/10 border border-finance-primary/20 text-xs text-finance-primary animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-finance-accent" />
            <span className="font-mono text-[11px] font-medium">{lastApiAction}</span>
          </div>
          <button
            onClick={() => setLastApiAction(null)}
            className="text-finance-muted hover:text-finance-text text-[10px] uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {!hasData ? (
        <EmptyState
          icon={LayoutDashboard}
          title="Your private wealth vault is awaiting initialization"
          description="Click 'Re-upload Seed Data' to instantly populate verified INR and USD accounts, multi-month transactions, and budget metrics."
          actionText="Re-upload Seed Data"
          onAction={handleSeedData}
          secondaryActionText="Add Asset Account"
          onSecondaryAction={() => setAccModalOpen(true)}
        />
      ) : (
        <>
          {/* Main Financial Overview — Net Worth Hero Section */}
          <div className="glass-card p-6 sm:p-8 rounded-2xl border border-finance-border shadow-wealth relative overflow-hidden">
            {/* Subtle corner watermark */}
            <div className="absolute right-6 top-6 opacity-5 pointer-events-none select-none font-serif text-8xl font-bold">
              aura.
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-finance-border/60">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-sans uppercase tracking-widest text-finance-muted font-semibold">
                    Consolidated Net Worth ({reportingCurrency})
                  </span>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20">
                    <ArrowUpRight className="w-3 h-3" />
                    <span>+{summary?.netWorthChangePct ?? 4.8}% vs last period</span>
                  </div>
                </div>

                <div className="flex items-baseline gap-3">
                  <div className="font-serif text-4xl sm:text-5xl font-bold tracking-tight text-finance-text">
                    <CurrencyDisplay
                      amount={summary?.netWorth || 0}
                      currency={reportingCurrency}
                      type="NET_WORTH"
                      showConversion={false}
                      hideValue={hideBalances}
                    />
                  </div>
                </div>

                <p className="text-xs text-finance-muted font-sans">
                  Liquid capital, securities portfolio, and physical reserves minus outstanding credit obligations.
                </p>
              </div>

              {/* Assets & Liabilities Summary Block */}
              <div className="grid grid-cols-2 gap-4 sm:gap-6 bg-finance-bg/60 p-4 rounded-xl border border-finance-border/70">
                <div className="space-y-1">
                  <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-finance-muted">
                    Total Portfolio Assets
                  </p>
                  <p className="num-font text-lg font-bold text-finance-text">
                    <CurrencyDisplay
                      amount={summary?.totalAssets || 0}
                      currency={reportingCurrency}
                      showConversion={false}
                      hideValue={hideBalances}
                    />
                  </p>
                  <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">Liquid & Equities</span>
                </div>

                <div className="space-y-1 border-l border-finance-border/60 pl-4 sm:pl-6">
                  <p className="text-[10px] font-sans font-bold uppercase tracking-wider text-finance-muted">
                    Total Liabilities
                  </p>
                  <p className="num-font text-lg font-bold text-finance-text">
                    <CurrencyDisplay
                      amount={summary?.totalLiabilities || 0}
                      currency={reportingCurrency}
                      type="DEBT"
                      showConversion={false}
                      hideValue={hideBalances}
                    />
                  </p>
                  <span className="text-[10px] text-rose-700 dark:text-rose-400 font-medium">Loans & Cards</span>
                </div>
              </div>
            </div>

            {/* Date Range Selector Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <span className="text-xs text-finance-muted font-sans">
                Timeline Granularity:
              </span>
              <div className="flex items-center gap-1 bg-finance-bg p-1 rounded-xl border border-finance-border text-xs">
                {(['7D', '30D', '3M', '6M', '1Y', 'ALL'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setTimelineRange(r)}
                    className={`px-3 py-1 rounded-lg font-semibold text-[11px] transition-all ${
                      timelineRange === r
                        ? 'bg-finance-card text-finance-text border border-finance-border shadow-sm'
                        : 'text-finance-muted hover:text-finance-text'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* 4 Financial Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Income */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-finance-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-finance-muted">
                  Monthly Income
                </span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-finance-text">
                <CurrencyDisplay
                  amount={summary?.monthlyIncome || 0}
                  currency={reportingCurrency}
                  type="INCOME"
                  showConversion={false}
                  hideValue={hideBalances}
                />
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-finance-border/40 text-finance-muted">
                <span>Prev Month:</span>
                <span className="num-font font-semibold text-finance-text">
                  {repSymbol}{(summary?.prevMonthlyIncome || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                <span>+{summary?.incomeChangePct || 0}% change</span>
              </div>
            </div>

            {/* 2. Total Expenses */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-finance-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-finance-muted">
                  Monthly Expenses
                </span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-finance-text">
                <CurrencyDisplay
                  amount={summary?.monthlyExpenses || 0}
                  currency={reportingCurrency}
                  type="EXPENSE"
                  showConversion={false}
                  hideValue={hideBalances}
                />
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-finance-border/40 text-finance-muted">
                <span>Prev Month:</span>
                <span className="num-font font-semibold text-finance-text">
                  {repSymbol}{(summary?.prevMonthlyExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-finance-muted">
                <span>{summary?.expenseChangePct || 0}% vs benchmark</span>
              </div>
            </div>

            {/* 3. Net Cash Flow */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-finance-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-finance-muted">
                  Net Cash Flow
                </span>
                <div className="p-2 rounded-xl bg-finance-accent/15 text-finance-accent border border-finance-accent/30">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-finance-text">
                <CurrencyDisplay
                  amount={summary?.netCashFlow || 0}
                  currency={reportingCurrency}
                  showSign
                  showConversion={false}
                  hideValue={hideBalances}
                />
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-finance-border/40 text-finance-muted">
                <span>Prev Cash Flow:</span>
                <span className="num-font font-semibold text-finance-text">
                  {repSymbol}{(summary?.prevNetCashFlow || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                <span>+{summary?.cashFlowChangePct || 0}% surplus</span>
              </div>
            </div>

            {/* 4. Savings Rate */}
            <div className="glass-card glass-card-hover p-5 rounded-2xl border border-finance-border space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-sans font-bold uppercase tracking-wider text-finance-muted">
                  Capital Retention
                </span>
                <div className="p-2 rounded-xl bg-finance-primary/10 text-finance-primary border border-finance-primary/20">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <div className="font-serif text-2xl sm:text-3xl font-bold text-finance-text">
                <span className="num-font font-bold">{summary?.savingsRate || 0}%</span>
              </div>
              <div className="flex items-center justify-between text-xs pt-1 border-t border-finance-border/40 text-finance-muted">
                <span>Monthly Retained:</span>
                <span className="num-font font-semibold text-finance-text">
                  {repSymbol}{(summary?.savings || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-semibold text-finance-accent">
                <span>Target: 30.0% retention</span>
              </div>
            </div>
          </div>

          {/* Charts Row A: Wealth Growth & Monthly Income vs Expenses */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart A: Wealth Growth Timeline */}
            <div className="glass-card p-6 rounded-2xl border border-finance-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-finance-text">Wealth Growth Trajectory</h3>
                  <p className="text-xs text-finance-muted">Net asset value valuation progression ({reportingCurrency})</p>
                </div>
                <span className="text-xs font-semibold text-finance-accent num-font">
                  {repSymbol}{((summary?.netWorth || 0)).toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={summary?.wealthGrowthHistory || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="wealthGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--t-accent)" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="var(--t-accent)" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="label" stroke="var(--t-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--t-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="netWorth" name="Net Worth" stroke="var(--t-accent)" strokeWidth={2.5} fillOpacity={1} fill="url(#wealthGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart B: Monthly Income vs Expenses */}
            <div className="glass-card p-6 rounded-2xl border border-finance-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-finance-text">Cash Inflow vs Outflow</h3>
                  <p className="text-xs text-finance-muted">Monthly comparative ledger ({reportingCurrency})</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-finance-primary font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#183D32] dark:bg-[#A5C6A9]"></span> Inflow
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#9E4747] dark:bg-[#E06D6D]"></span> Outflow
                  </span>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.monthlySeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="var(--t-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--t-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="income" name="Income" fill="var(--t-primary)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="var(--t-danger)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Charts Row B: Spending Breakdown Donut & Monthly Cash Flow */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart C: Spending Breakdown Donut */}
            <div className="glass-card p-6 rounded-2xl border border-finance-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-finance-text">Capital Outflow by Category</h3>
                  <p className="text-xs text-finance-muted">Discretionary and operational expenses ({reportingCurrency})</p>
                </div>
                <span className="num-font text-xs font-bold text-finance-text">
                  Total: {repSymbol}{(summary?.monthlyExpenses || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={summary?.spendingBreakdown || []}
                        dataKey="amount"
                        nameKey="categoryName"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {(summary?.spendingBreakdown || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || 'var(--t-accent)'} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Legend with Percentages */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-2">
                  {(summary?.spendingBreakdown || []).map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-finance-border/30">
                      <div className="flex items-center gap-2 truncate pr-2">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }}></span>
                        <span className="truncate text-finance-text font-medium">{cat.categoryName}</span>
                      </div>
                      <div className="text-right num-font flex-shrink-0">
                        <span className="font-bold text-finance-text">{repSymbol}{cat.amount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}</span>
                        <span className="text-finance-muted text-[10px] ml-1.5">({cat.percentage}%)</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart D: Monthly Net Cash Flow Bar Chart */}
            <div className="glass-card p-6 rounded-2xl border border-finance-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-finance-text">Net Monthly Surplus</h3>
                  <p className="text-xs text-finance-muted">Net cash flow performance ({reportingCurrency})</p>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Surplus
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-semibold">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Deficit
                  </span>
                </div>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.monthlySeries || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="var(--t-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--t-muted)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="netCashFlow" name="Net Cash Flow" radius={[4, 4, 0, 0]}>
                      {(summary?.monthlySeries || []).map((entry, index) => (
                        <Cell key={`cell-flow-${index}`} fill={entry.netCashFlow >= 0 ? 'var(--t-primary)' : 'var(--t-danger)'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Row C: Recent Multi-Currency Transactions & AI Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Transactions Ledger Preview (2 cols) */}
            <div className="lg:col-span-2 glass-card p-6 rounded-2xl border border-finance-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-serif text-lg font-bold text-finance-text">Recent Multi-Currency Transactions</h3>
                  <p className="text-xs text-finance-muted">Preserves exact original currency with consolidated reporting</p>
                </div>
                <Link
                  to="/transactions"
                  className="text-xs font-semibold text-finance-accent hover:underline flex items-center gap-1"
                >
                  <span>Full Ledger</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-finance-text">
                  <thead className="border-b border-finance-border text-finance-muted uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Account</th>
                      <th className="py-2.5 px-3 text-right">Original Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-finance-border/40">
                    {(summary?.recentTransactions || []).map((tx) => (
                      <tr key={tx.id} className="hover:bg-finance-bg/50 transition-colors">
                        <td className="py-3 px-3 font-medium text-finance-muted whitespace-nowrap">
                          {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 font-semibold text-finance-text max-w-xs truncate">
                          {tx.notes || 'Transaction'}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-finance-bg border border-finance-border/70">
                            {tx.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-finance-muted text-[11px] whitespace-nowrap">
                          {tx.account?.name || '-'}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <CurrencyDisplay
                            amount={tx.amount}
                            currency={tx.currency}
                            reportingAmount={tx.reportingAmount}
                            reportingCurrency={reportingCurrency}
                            type={tx.type === 'INCOME' ? 'INCOME' : tx.type === 'EXPENSE' ? 'EXPENSE' : 'NEUTRAL'}
                            showSign
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Aura AI Insights & Budget Progress (1 col) */}
            <div className="space-y-6">
              {/* Aura AI Financial Insights Card */}
              <div className="glass-card p-5 rounded-2xl border border-finance-border space-y-3 relative overflow-hidden">
                <div className="flex items-center gap-2 text-finance-accent">
                  <Sparkles className="w-4 h-4" />
                  <h4 className="font-serif font-bold text-sm tracking-wide">Aura Capital Intelligence</h4>
                </div>
                <div className="space-y-2.5 text-xs text-finance-text">
                  {(summary?.insights && summary.insights.length > 0) ? (
                    summary.insights.map((insight, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-finance-bg border border-finance-border/50 leading-relaxed font-sans">
                        {insight}
                      </div>
                    ))
                  ) : (
                    <div className="p-3 rounded-xl bg-finance-bg text-finance-muted text-xs">
                      Healthy portfolio liquidity. No immediate overspending risks detected.
                    </div>
                  )}
                </div>
              </div>

              {/* Budget Progress Snapshot */}
              <div className="glass-card p-5 rounded-2xl border border-finance-border space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-sm text-finance-text">Budget Progress</h4>
                  <Link to="/budgets" className="text-[11px] text-finance-accent font-medium hover:underline">
                    Manage
                  </Link>
                </div>

                <div className="space-y-3">
                  {(summary?.budgetProgress || []).slice(0, 3).map((b) => (
                    <div key={b.id} className="space-y-1.5 text-xs">
                      <div className="flex justify-between font-medium">
                        <span className="text-finance-text">{b.categoryName}</span>
                        <span className="num-font text-finance-muted">
                          {repSymbol}{b.spentAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })} / {repSymbol}{b.budgetAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-finance-bg overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            b.isOverBudget
                              ? 'bg-rose-500'
                              : b.percentage >= 85
                              ? 'bg-amber-500'
                              : 'bg-finance-accent'
                          }`}
                          style={{ width: `${Math.min(100, b.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Modals */}
      <TransactionModal
        isOpen={txModalOpen}
        onClose={() => {
          setTxModalOpen(false);
          setSelectedTxToEdit(null);
        }}
        transactionToEdit={selectedTxToEdit}
      />
      <AccountModal isOpen={accModalOpen} onClose={() => setAccModalOpen(false)} />
    </div>
  );
};
