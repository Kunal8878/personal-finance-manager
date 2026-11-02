import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFinance } from '../context/FinanceContext';
import { apiFetch } from '../services/api';
import { Wallet, DollarSign, PieChart, Target, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { getCurrencySymbol } from '../components/CurrencyDisplay';

export const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const { refreshFinanceData, reportingCurrency } = useFinance();
  const symbol = getCurrencySymbol(reportingCurrency);

  const [step, setStep] = useState(1);

  // Step 1 State: Account
  const [accName, setAccName] = useState('');
  const [accBalance, setAccBalance] = useState('');
  const [accType, setAccType] = useState('BANK');

  // Step 2 State: Income
  const [incAmount, setIncAmount] = useState('');
  const [incNotes, setIncNotes] = useState('');

  // Step 3 State: Budget
  const [budAmount, setBudAmount] = useState('');

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (accName.trim()) {
      await apiFetch('/accounts', {
        method: 'POST',
        body: JSON.stringify({
          name: accName.trim(),
          type: accType,
          balance: parseFloat(accBalance || '0'),
          currency: reportingCurrency
        })
      });
      await refreshFinanceData();
    }
    setStep(2);
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (incAmount) {
      const accountsRes = await apiFetch<{ accounts: any[] }>('/accounts');
      const firstAcc = accountsRes.data?.accounts[0];
      if (firstAcc) {
        await apiFetch('/transactions', {
          method: 'POST',
          body: JSON.stringify({
            accountId: firstAcc.id,
            amount: parseFloat(incAmount),
            currency: reportingCurrency,
            type: 'INCOME',
            date: new Date().toISOString(),
            notes: incNotes || 'Primary Inflow'
          })
        });
        await refreshFinanceData();
      }
    }
    setStep(3);
  };

  const handleStep3 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (budAmount) {
      const catRes = await apiFetch<{ categories: any[] }>('/categories');
      const groceryCat = catRes.data?.categories.find((c) => c.name.includes('Groceries')) || catRes.data?.categories[0];
      if (groceryCat) {
        const now = new Date();
        await apiFetch('/budgets', {
          method: 'POST',
          body: JSON.stringify({
            categoryId: groceryCat.id,
            amount: parseFloat(budAmount),
            period: 'MONTHLY',
            startDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
            endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString()
          })
        });
        await refreshFinanceData();
      }
    }
    await refreshFinanceData();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-finance-bg flex items-center justify-center p-6 selection:bg-finance-accent/20">
      <div className="w-full max-w-xl bg-finance-card rounded-2xl p-8 md:p-10 border border-finance-border shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-finance-border/60">
          <div className="flex items-center gap-3">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-serif transition-all ${
                  step === s
                    ? 'bg-finance-primary text-finance-bg shadow-sm scale-105'
                    : step > s
                    ? 'bg-finance-primary/10 text-finance-primary border border-finance-primary/30'
                    : 'bg-finance-elevated text-finance-muted border border-finance-border'
                }`}
              >
                {step > s ? <CheckCircle2 className="w-4 h-4" /> : s}
              </div>
            ))}
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-xs text-finance-muted hover:text-finance-text uppercase tracking-wider font-medium cursor-pointer"
          >
            Skip to Dashboard →
          </button>
        </div>

        {/* Step 1: Add Account */}
        {step === 1 && (
          <form onSubmit={handleStep1} className="space-y-5">
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-12 h-12 rounded-xl bg-finance-elevated border border-finance-border flex items-center justify-center text-finance-accent">
                <Wallet className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-medium tracking-widest text-finance-accent uppercase">Phase I</span>
                <h2 className="text-xl font-serif text-finance-text">Primary Depository or Custody Account</h2>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
                Account Designation
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC Private Banking, Morgan Stanley Treasury"
                value={accName}
                onChange={(e) => setAccName(e.target.value)}
                className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-primary transition-colors"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
                  Account Type
                </label>
                <select
                  value={accType}
                  onChange={(e) => setAccType(e.target.value)}
                  className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-primary transition-colors cursor-pointer"
                >
                  <option value="BANK">Checking / Current</option>
                  <option value="SAVINGS">High-Yield Savings</option>
                  <option value="INVESTMENT">Investment Custody</option>
                  <option value="CASH">Liquid Cash</option>
                  <option value="CREDIT_CARD">Credit Facility</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
                  Starting Balance ({reportingCurrency})
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-finance-muted text-sm">{symbol}</span>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="100000.00"
                    value={accBalance}
                    onChange={(e) => setAccBalance(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-primary transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-finance-primary text-finance-bg hover:opacity-95 font-medium rounded-xl transition-all shadow-sm text-sm flex items-center justify-center gap-2 mt-4 cursor-pointer"
            >
              <span>Next: Record Cash Inflow</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {/* Step 2: Add Income */}
        {step === 2 && (
          <form onSubmit={handleStep2} className="space-y-5">
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-12 h-12 rounded-xl bg-finance-elevated border border-finance-border flex items-center justify-center text-finance-accent">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-medium tracking-widest text-finance-accent uppercase">Phase II</span>
                <h2 className="text-xl font-serif text-finance-text">Initial Revenue or Retainer Inflow</h2>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
                Inflow Amount ({reportingCurrency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-finance-muted text-base">{symbol}</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="250000.00"
                  value={incAmount}
                  onChange={(e) => setIncAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-lg focus:outline-none focus:border-finance-primary transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
                Narration / Source
              </label>
              <input
                type="text"
                placeholder="Executive Compensation, Dividend Distribution, Consulting Fee"
                value={incNotes}
                onChange={(e) => setIncNotes(e.target.value)}
                className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-primary transition-colors"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-finance-elevated hover:bg-finance-border/40 text-finance-text font-medium rounded-xl border border-finance-border text-sm cursor-pointer"
              >
                Skip Step
              </button>
              <button
                type="submit"
                className="flex-1 py-3 bg-finance-primary text-finance-bg hover:opacity-95 font-medium rounded-xl transition-all shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Next: Setup Capital Limit</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        )}

        {/* Step 3: Add Budget Limit */}
        {step === 3 && (
          <form onSubmit={handleStep3} className="space-y-5">
            <div className="flex items-center gap-3.5 mb-2">
              <div className="w-12 h-12 rounded-xl bg-finance-elevated border border-finance-border flex items-center justify-center text-finance-accent">
                <PieChart className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-medium tracking-widest text-finance-accent uppercase">Phase III</span>
                <h2 className="text-xl font-serif text-finance-text">Operating Expenditure Cap</h2>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
                Monthly Groceries & Dining Limit ({reportingCurrency})
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-finance-muted text-base">{symbol}</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="30000.00"
                  value={budAmount}
                  onChange={(e) => setBudAmount(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-lg focus:outline-none focus:border-finance-primary transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-finance-primary text-finance-bg hover:opacity-95 font-medium rounded-xl transition-all shadow-sm text-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Initialize Portfolio Dashboard</span>
              <Target className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
