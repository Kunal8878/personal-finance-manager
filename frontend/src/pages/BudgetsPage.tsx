import React, { useState, useEffect, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Budget } from '../types';
import { apiFetch } from '../services/api';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { EmptyState } from '../components/EmptyState';
import { BudgetModal } from '../components/modals/BudgetModal';
import { PieChart, Plus, Trash2, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const BudgetsPage: React.FC = () => {
  const { refreshFinanceData, reportingCurrency } = useFinance();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ budgets: Budget[] }>('/budgets');
    setLoading(false);
    if (res.success && res.data) {
      setBudgets(res.data.budgets);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this budget limit?')) return;
    const res = await apiFetch(`/budgets/${id}`, { method: 'DELETE' });
    if (res.success) {
      await refreshFinanceData();
      await fetchBudgets();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-16 select-none font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-finance-border/60 pb-5">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-finance-text">
            Discretionary Capital Budgets
          </h1>
          <p className="text-xs text-finance-muted mt-1">
            Establish category limits, prevent capital erosion, and observe real-time spend utilization.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold text-xs tracking-wide rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Create Category Budget
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-finance-muted font-serif italic text-sm animate-pulse">
          Calculating budget allocations and utilization...
        </div>
      ) : budgets.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="No category budgets established"
          description="Create spending limits for Housing, Groceries, Dining, or Technology to maintain disciplined wealth preservation."
          actionText="Create Budget"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {budgets.map((b) => {
            const u = b.utilization || {
              budgetAmount: b.amount,
              spentAmount: 0,
              remaining: b.amount,
              percentage: 0,
              isOverBudget: false,
              isWarning: false
            };

            return (
              <div key={b.id} className="glass-card rounded-2xl p-6 border border-finance-border space-y-4 shadow-wealth">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
                      style={{ backgroundColor: b.category?.color || 'var(--t-accent)' }}
                    >
                      {b.category?.name ? b.category.name[0] : 'B'}
                    </div>
                    <div>
                      <h3 className="font-serif text-base font-bold text-finance-text">{b.category?.name || 'Category'}</h3>
                      <p className="text-[10px] text-finance-muted uppercase font-semibold tracking-wider font-sans">{b.period} ALLOCATION</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(b.id)}
                    className="p-1.5 text-finance-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-finance-muted font-sans">
                      Spent: <CurrencyDisplay amount={u.spentAmount} currency={reportingCurrency} showConversion={false} className="text-finance-text font-bold" />
                    </span>
                    <span className="text-finance-muted font-sans">
                      Allocation: <CurrencyDisplay amount={u.budgetAmount} currency={reportingCurrency} showConversion={false} className="text-finance-text font-bold" />
                    </span>
                  </div>

                  <div className="w-full h-2 bg-finance-bg rounded-full overflow-hidden border border-finance-border/50">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        u.isOverBudget
                          ? 'bg-rose-500'
                          : u.isWarning
                          ? 'bg-amber-500'
                          : 'bg-finance-accent'
                      }`}
                      style={{ width: `${Math.min(100, u.percentage)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="num-font font-bold text-finance-text">{u.percentage}% Allocated</span>
                    {u.isOverBudget ? (
                      <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Exceeded by <CurrencyDisplay amount={Math.abs(u.remaining)} currency={reportingCurrency} showConversion={false} />
                      </span>
                    ) : (
                      <span className="text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> <CurrencyDisplay amount={u.remaining} currency={reportingCurrency} showConversion={false} /> remaining
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <BudgetModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};
