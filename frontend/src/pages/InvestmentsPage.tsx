import React, { useState, useEffect, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Investment } from '../types';
import { apiFetch } from '../services/api';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { EmptyState } from '../components/EmptyState';
import { InvestmentModal } from '../components/modals/InvestmentModal';
import { TrendingUp, Plus, Trash2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const InvestmentsPage: React.FC = () => {
  const { reportingCurrency, hideBalances } = useFinance();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [summary, setSummary] = useState({ totalInvested: 0, totalCurrentValue: 0, totalPnl: 0, totalPnlPercentage: 0 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchInvestments = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ investments: Investment[]; summary: any }>('/investments');
    setLoading(false);
    if (res.success && res.data) {
      setInvestments(res.data.investments);
      setSummary(res.data.summary);
    }
  }, []);

  useEffect(() => {
    fetchInvestments();
  }, [fetchInvestments]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this investment record?')) return;
    const res = await apiFetch(`/investments/${id}`, { method: 'DELETE' });
    if (res.success) {
      await fetchInvestments();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-16 select-none font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-finance-border/60 pb-5">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-finance-text">
            Capital Investment Portfolio
          </h1>
          <p className="text-xs text-finance-muted mt-1">
            Track listed equities, mutual fund indices, gold reserves, and fixed yield instruments.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold text-xs tracking-wide rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Portfolio Asset
        </button>
      </div>

      {/* Portfolio Summary Banner */}
      {investments.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card rounded-2xl p-6 border border-finance-border shadow-wealth space-y-2">
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-finance-muted">Total Capital Deployed</span>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-finance-text">
              <CurrencyDisplay amount={summary.totalInvested} currency={reportingCurrency} showConversion={false} hideValue={hideBalances} />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-finance-border shadow-wealth space-y-2">
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-finance-muted">Current Market Valuation</span>
            <div className="font-serif text-2xl sm:text-3xl font-bold text-finance-text">
              <CurrencyDisplay amount={summary.totalCurrentValue} currency={reportingCurrency} type="INCOME" showConversion={false} hideValue={hideBalances} />
            </div>
          </div>

          <div className="glass-card rounded-2xl p-6 border border-finance-border shadow-wealth space-y-2">
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-finance-muted">Net Unrealized P&L Return</span>
            <div className="font-serif text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <CurrencyDisplay amount={summary.totalPnl} currency={reportingCurrency} showSign type={summary.totalPnl >= 0 ? 'INCOME' : 'EXPENSE'} showConversion={false} hideValue={hideBalances} />
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-sans font-bold ${summary.totalPnl >= 0 ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30'}`}>
                {summary.totalPnlPercentage}%
              </span>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-finance-muted font-serif italic text-sm animate-pulse">Valuating investment assets...</div>
      ) : investments.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No investment assets tracked"
          description="Add your stocks, mutual funds, gold bonds, or fixed deposits to track portfolio capital gains accurately."
          actionText="Add Investment Asset"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="glass-card rounded-2xl border border-finance-border overflow-hidden shadow-wealth">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-finance-text">
              <thead className="bg-finance-bg/60 border-b border-finance-border text-finance-muted uppercase tracking-wider text-[10px] font-sans">
                <tr>
                  <th className="py-3 px-4 font-bold">Asset Name</th>
                  <th className="py-3 px-4 font-bold">Asset Class</th>
                  <th className="py-3 px-4 font-bold text-right">Cost Basis</th>
                  <th className="py-3 px-4 font-bold text-right">Current Valuation</th>
                  <th className="py-3 px-4 font-bold text-right">Unrealized Gain / Loss</th>
                  <th className="py-3 px-4 font-bold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-finance-border/50">
                {investments.map((inv) => {
                  const isProfit = (inv.pnl || 0) >= 0;
                  return (
                    <tr key={inv.id} className="hover:bg-finance-bg/50 transition-colors">
                      <td className="py-3.5 px-4 font-serif font-bold text-sm text-finance-text">{inv.name}</td>
                      <td className="py-3.5 px-4 text-finance-muted uppercase text-[10px] font-semibold">{inv.type}</td>
                      <td className="py-3.5 px-4 text-right font-medium">
                        <CurrencyDisplay amount={inv.investedAmount} currency={reportingCurrency} showConversion={false} hideValue={hideBalances} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <CurrencyDisplay amount={inv.currentValue} currency={reportingCurrency} type="INCOME" showConversion={false} hideValue={hideBalances} />
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold">
                        <span className={`inline-flex items-center gap-1 ${isProfit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400'}`}>
                          {isProfit ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          <CurrencyDisplay amount={inv.pnl || 0} currency={reportingCurrency} showSign type={isProfit ? 'INCOME' : 'EXPENSE'} showConversion={false} hideValue={hideBalances} />
                          <span className="text-[10px] font-semibold">({inv.pnlPercentage}%)</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleDelete(inv.id)}
                          className="p-1.5 text-finance-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <InvestmentModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchInvestments} />
    </div>
  );
};
