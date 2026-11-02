import React, { useState, useEffect, useCallback } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Loan } from '../types';
import { apiFetch } from '../services/api';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { EmptyState } from '../components/EmptyState';
import { LoanModal } from '../components/modals/LoanModal';
import { CreditCard, Plus, Trash2, Calendar } from 'lucide-react';

export const LoansPage: React.FC = () => {
  const { reportingCurrency, hideBalances } = useFinance();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  // EMI Payment Modal State
  const [paymentLoanId, setPaymentLoanId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState('');

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ loans: Loan[] }>('/loans');
    setLoading(false);
    if (res.success && res.data) {
      setLoans(res.data.loans);
    }
  }, []);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this loan obligation record?')) return;
    const res = await apiFetch(`/loans/${id}`, { method: 'DELETE' });
    if (res.success) {
      await fetchLoans();
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentLoanId || !payAmount) return;

    const res = await apiFetch(`/loans/${paymentLoanId}/payments`, {
      method: 'POST',
      body: JSON.stringify({ amount: parseFloat(payAmount) })
    });

    if (res.success) {
      setPaymentLoanId(null);
      setPayAmount('');
      await fetchLoans();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-16 select-none font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-finance-border/60 pb-5">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-finance-text">
            Credit Liabilities & Debt Obligations
          </h1>
          <p className="text-xs text-finance-muted mt-1">
            Track mortgages, vehicle leases, term loans, and amortization schedules.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold text-xs tracking-wide rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Credit Facility
        </button>
      </div>

      {loading ? (
        <div className="p-16 text-center text-finance-muted font-serif italic text-sm animate-pulse">
          Calculating amortization schedules and interest components...
        </div>
      ) : loans.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title="No debt or credit obligations registered"
          description="Record borrowed debt facilities (Real Estate Mortgage, Auto Loan, Corporate Credit Line) to calculate principal reduction and monthly liabilities."
          actionText="Add Credit Facility"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {loans.map((l) => (
            <div key={l.id} className="glass-card rounded-2xl p-6 border border-finance-border space-y-4 shadow-wealth">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl border ${l.type === 'BORROWED' ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'}`}>
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-finance-text">{l.name}</h3>
                    <p className="text-[10px] text-finance-muted uppercase font-semibold tracking-wider font-sans">{l.type} • {l.interestRate}% APR</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setPaymentLoanId(l.id);
                      setPayAmount(l.emiAmount.toString());
                    }}
                    className="px-3 py-1 bg-finance-card hover:bg-finance-surface text-finance-text border border-finance-border rounded-lg text-xs font-semibold transition-colors"
                  >
                    Pay EMI
                  </button>
                  <button
                    onClick={() => handleDelete(l.id)}
                    className="p-1.5 text-finance-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Progress & Balances */}
              <div className="grid grid-cols-2 gap-3 p-3.5 bg-finance-bg/60 rounded-xl border border-finance-border/70 text-xs">
                <div>
                  <span className="text-finance-muted">Monthly EMI Liability:</span>
                  <p className="num-font font-bold text-finance-text text-sm mt-0.5">
                    <CurrencyDisplay amount={l.emiAmount} currency={reportingCurrency} showConversion={false} />/mo
                  </p>
                </div>
                <div>
                  <span className="text-finance-muted">Remaining Principal:</span>
                  <p className="num-font font-bold text-rose-700 dark:text-rose-400 text-sm mt-0.5">
                    <CurrencyDisplay amount={l.remainingPrincipal} currency={reportingCurrency} showConversion={false} hideValue={hideBalances} />
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-finance-muted pt-1">
                <span>Tenure: {l.tenureMonths} Months</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Commenced: {new Date(l.startDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pay Modal */}
      {paymentLoanId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="glass-card rounded-2xl p-6 border border-finance-border w-full max-w-sm space-y-4 shadow-2xl">
            <h3 className="font-serif text-lg font-bold text-finance-text">Record Monthly Installment</h3>
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <input
                type="number"
                step="0.01"
                placeholder="Payment Amount"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base font-semibold focus:outline-none focus:border-finance-accent"
                required
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentLoanId(null)}
                  className="flex-1 py-2.5 bg-finance-card text-finance-text text-xs font-medium rounded-xl border border-finance-border"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold text-xs rounded-xl shadow-sm"
                >
                  Confirm Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <LoanModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchLoans} />
    </div>
  );
};
