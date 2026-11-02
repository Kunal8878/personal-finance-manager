import React, { useState, useEffect, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Goal } from '../types';
import { apiFetch } from '../services/api';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { EmptyState } from '../components/EmptyState';
import { GoalModal } from '../components/modals/GoalModal';
import { Target, Plus, Trash2, Calendar, TrendingUp } from 'lucide-react';

export const GoalsPage: React.FC = () => {
  const { reportingCurrency, hideBalances } = useFinance();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // Contribute Modal State
  const [contributeGoalId, setContributeGoalId] = useState<string | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ goals: Goal[] }>('/goals');
    setLoading(false);
    if (res.success && res.data) {
      setGoals(res.data.goals);
    }
  }, []);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this wealth accumulation goal?')) return;
    const res = await apiFetch(`/goals/${id}`, { method: 'DELETE' });
    if (res.success) {
      await fetchGoals();
    }
  };

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoalId || !depositAmount) return;

    const res = await apiFetch(`/goals/${contributeGoalId}/contribute`, {
      method: 'PUT',
      body: JSON.stringify({ amount: parseFloat(depositAmount) })
    });

    if (res.success) {
      setContributeGoalId(null);
      setDepositAmount('');
      await fetchGoals();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-16 select-none font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-finance-border/60 pb-5">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-finance-text">
            Wealth Accumulation Goals
          </h1>
          <p className="text-xs text-finance-muted mt-1">
            Establish long-term capital targets, asset acquisition reserves, and calculated monthly contributions.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold text-xs tracking-wide rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Wealth Goal
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-finance-muted font-serif italic text-sm animate-pulse">
          Calculating goal trajectories and required monthly savings...
        </div>
      ) : goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No wealth targets established"
          description="Create your first financial target (e.g. 12-Month Liquidity Reserve, Real Estate Acquisition) to calculate monthly funding requirements."
          actionText="Create Wealth Goal"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {goals.map((g) => (
            <div key={g.id} className="glass-card rounded-2xl p-6 border border-finance-border space-y-4 shadow-wealth">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-finance-accent/15 text-finance-accent border border-finance-accent/30">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-finance-text">{g.name}</h3>
                    <p className="text-[10px] text-finance-muted uppercase font-semibold tracking-wider font-sans">
                      {g.category.replace('_', ' ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setContributeGoalId(g.id)}
                    className="px-3 py-1 bg-finance-accent/15 hover:bg-finance-accent/25 text-finance-accent border border-finance-accent/30 rounded-lg text-xs font-semibold transition-colors"
                  >
                    + Contribute
                  </button>
                  <button
                    onClick={() => handleDelete(g.id)}
                    className="p-1.5 text-finance-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-finance-muted">
                    Accumulated: <CurrencyDisplay amount={g.currentAmount} currency={reportingCurrency} showConversion={false} hideValue={hideBalances} type="INCOME" className="font-bold" />
                  </span>
                  <span className="text-finance-muted">
                    Target: <CurrencyDisplay amount={g.targetAmount} currency={reportingCurrency} showConversion={false} hideValue={hideBalances} className="text-finance-text font-bold" />
                  </span>
                </div>

                <div className="w-full h-2 bg-finance-bg rounded-full overflow-hidden border border-finance-border/50">
                  <div
                    className="h-full rounded-full bg-finance-accent transition-all duration-500"
                    style={{ width: `${Math.min(100, g.percentage || 0)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="num-font font-bold text-finance-accent">{g.percentage}% Achieved</span>
                  <span className="text-finance-muted flex items-center gap-1 text-[11px]">
                    <Calendar className="w-3.5 h-3.5" /> Target Date: {new Date(g.targetDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>

              {/* Required Monthly Contribution */}
              {(g.requiredMonthlySavings || 0) > 0 && (
                <div className="p-3 bg-finance-bg/60 border border-finance-border/70 rounded-xl flex items-center justify-between text-xs">
                  <span className="text-finance-muted flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-finance-accent" /> Required Monthly Allocation:
                  </span>
                  <span className="num-font font-bold text-finance-text">
                    <CurrencyDisplay amount={g.requiredMonthlySavings || 0} currency={reportingCurrency} showConversion={false} />/mo
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Deposit Contribution Modal */}
      {contributeGoalId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card rounded-2xl p-6 border border-finance-border w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-finance-text">Deposit Capital Allocation</h3>
            <form onSubmit={handleDeposit} className="space-y-4">
              <input
                type="number"
                step="0.01"
                placeholder="Allocation Amount"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base font-semibold focus:outline-none focus:border-finance-accent"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setContributeGoalId(null)}
                  className="flex-1 py-2.5 bg-finance-card text-finance-text text-xs font-medium rounded-xl border border-finance-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold text-xs rounded-xl shadow-sm"
                >
                  Confirm Deposit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <GoalModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchGoals} />
    </div>
  );
};
