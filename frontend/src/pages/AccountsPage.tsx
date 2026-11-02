import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { EmptyState } from '../components/EmptyState';
import { AccountModal } from '../components/modals/AccountModal';
import { apiFetch } from '../services/api';
import { Wallet, CreditCard, Building2, Landmark, Plus, Trash2 } from 'lucide-react';

export const AccountsPage: React.FC = () => {
  const { accounts, refreshFinanceData, reportingCurrency, hideBalances } = useFinance();
  const [modalOpen, setModalOpen] = useState(false);

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this account? Historical transactions will be detached.')) return;
    const res = await apiFetch(`/accounts/${id}`, { method: 'DELETE' });
    if (res.success) {
      await refreshFinanceData();
    }
  };

  const totalBalance = accounts.reduce((sum, acc) => {
    return sum + (acc.type === 'CREDIT_CARD' ? -acc.balance : acc.balance);
  }, 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-16 select-none font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-finance-border/60 pb-5">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-finance-text">
            Capital Accounts & Depositories
          </h1>
          <p className="text-xs text-finance-muted mt-1">
            Manage multi-currency bank accounts, high-yield vaults, cash reserves, and credit lines.
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold text-xs tracking-wide rounded-xl shadow-sm flex items-center gap-1.5 transition-all"
        >
          <Plus className="w-4 h-4" /> Add Capital Account
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="glass-card rounded-2xl p-6 border border-finance-border flex items-center justify-between shadow-wealth">
          <div>
            <span className="text-xs font-sans font-bold uppercase tracking-wider text-finance-muted">
              Consolidated Depository Balance ({reportingCurrency})
            </span>
            <div className="font-serif text-3xl font-bold mt-1 text-finance-text">
              <CurrencyDisplay
                amount={totalBalance}
                currency={reportingCurrency}
                type="NET_WORTH"
                showConversion={false}
                hideValue={hideBalances}
              />
            </div>
          </div>
          <div className="p-3 rounded-2xl bg-finance-accent/15 text-finance-accent border border-finance-accent/30">
            <Landmark className="w-6 h-6" />
          </div>
        </div>
      )}

      {accounts.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No capital accounts or vaults registered"
          description="Create your first account (Savings, Checking, Credit Card, or Foreign Remittance) to start monitoring liquidity."
          actionText="Add Capital Account"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="glass-card glass-card-hover rounded-2xl p-6 border border-finance-border flex flex-col justify-between shadow-sm space-y-4"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-finance-accent/10 text-finance-accent border border-finance-accent/20">
                      {acc.type === 'CREDIT_CARD' ? <CreditCard className="w-4 h-4" /> : <Building2 className="w-4 h-4" />}
                    </div>
                    <div>
                      <h3 className="font-serif text-sm font-bold text-finance-text">{acc.name}</h3>
                      <p className="text-[11px] text-finance-muted">{acc.institution || acc.type} • {acc.currency || 'INR'}</p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDelete(acc.id)}
                    className="p-1.5 text-finance-muted hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-finance-border/50 flex items-center justify-between">
                <span className="text-xs text-finance-muted">Native Account Balance:</span>
                <CurrencyDisplay
                  amount={acc.balance}
                  currency={acc.currency || 'INR'}
                  type={acc.type === 'CREDIT_CARD' ? 'DEBT' : 'NET_WORTH'}
                  className="text-base font-bold"
                  showConversion={false}
                  hideValue={hideBalances}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <AccountModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
};
