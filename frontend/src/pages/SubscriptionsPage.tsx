import React, { useState, useEffect, useCallback } from 'react';
import { Subscription } from '../types';
import { apiFetch } from '../services/api';
import { CurrencyDisplay } from '../components/CurrencyDisplay';
import { EmptyState } from '../components/EmptyState';
import { SubscriptionModal } from '../components/modals/SubscriptionModal';
import { Repeat, Plus, Trash2, CheckCircle2, XCircle, ShieldCheck } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [summary, setSummary] = useState({ monthlyTotal: 0, yearlyTotal: 0, activeCount: 0 });
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { reportingCurrency } = useFinance();

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    const res = await apiFetch<{ subscriptions: Subscription[]; summary: any }>('/subscriptions');
    setLoading(false);
    if (res.success && res.data) {
      setSubscriptions(res.data.subscriptions);
      setSummary(res.data.summary);
    }
  }, []);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleToggle = async (id: string) => {
    const res = await apiFetch(`/subscriptions/${id}/toggle`, { method: 'PUT' });
    if (res.success) {
      await fetchSubscriptions();
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete subscription?')) return;
    const res = await apiFetch(`/subscriptions/${id}`, { method: 'DELETE' });
    if (res.success) {
      await fetchSubscriptions();
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-finance-border/60 pb-6">
        <div>
          <span className="text-[11px] font-medium tracking-widest text-finance-accent uppercase">
            Recurring Commitments
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-finance-text mt-1">
            Subscriptions & Memberships
          </h2>
          <p className="text-xs text-finance-muted mt-1">
            Monitor software licenses, executive retainers, and lifestyle memberships
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2.5 bg-finance-primary text-finance-bg hover:opacity-95 font-medium text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add Subscription
        </button>
      </div>

      {/* KPI Cards */}
      {subscriptions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-finance-card rounded-2xl p-6 border border-finance-border shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <span className="text-[11px] font-medium tracking-wider text-finance-muted uppercase">Active Retainers</span>
            <div className="text-2xl font-serif text-finance-text num-font mt-2">
              {summary.activeCount}
            </div>
            <p className="text-[11px] text-finance-muted mt-1">Monitored ongoing charges</p>
          </div>

          <div className="bg-finance-card rounded-2xl p-6 border border-finance-border shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <span className="text-[11px] font-medium tracking-wider text-finance-muted uppercase">Monthly Allocation</span>
            <div className="text-2xl font-serif text-finance-text num-font mt-2">
              <CurrencyDisplay amount={summary.monthlyTotal} currency={reportingCurrency} />
              <span className="text-xs font-sans text-finance-muted ml-1">/ mo</span>
            </div>
            <p className="text-[11px] text-finance-muted mt-1">Equivalent in {reportingCurrency}</p>
          </div>

          <div className="bg-finance-card rounded-2xl p-6 border border-finance-border shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
            <span className="text-[11px] font-medium tracking-wider text-finance-muted uppercase">Annual Projection</span>
            <div className="text-2xl font-serif text-finance-text num-font mt-2">
              <CurrencyDisplay amount={summary.yearlyTotal} currency={reportingCurrency} />
              <span className="text-xs font-sans text-finance-muted ml-1">/ yr</span>
            </div>
            <p className="text-[11px] text-finance-muted mt-1">Projected annualized burn</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-finance-muted text-xs animate-pulse">
          Loading commitments...
        </div>
      ) : subscriptions.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="No recurring commitments tracked"
          description="Register software licenses, digital subscriptions, or recurring advisory retainers."
          actionText="Add Subscription"
          onAction={() => setModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subscriptions.map((sub) => (
            <div
              key={sub.id}
              className="bg-finance-card rounded-2xl p-6 border border-finance-border shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between space-y-4 hover:border-finance-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-finance-elevated border border-finance-border flex items-center justify-center text-finance-accent">
                    <Repeat className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-finance-text">{sub.name}</h3>
                    <p className="text-[11px] text-finance-muted uppercase tracking-wider font-medium">
                      {sub.billingCycle}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(sub.id)}
                  className="p-1.5 text-finance-muted hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"
                  title="Remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-finance-border/60">
                <div>
                  <div className="text-base font-medium num-font text-finance-text">
                    <CurrencyDisplay amount={sub.cost} currency={reportingCurrency} />
                  </div>
                  <span className="text-[10px] text-finance-muted">per {sub.billingCycle.toLowerCase().replace('ly', '')}</span>
                </div>

                <button
                  onClick={() => handleToggle(sub.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    sub.isActive
                      ? 'bg-finance-primary/10 text-finance-primary border border-finance-primary/20'
                      : 'bg-finance-elevated text-finance-muted border border-finance-border'
                  }`}
                >
                  {sub.isActive ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                  {sub.isActive ? 'Active' : 'Paused'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <SubscriptionModal isOpen={modalOpen} onClose={() => setModalOpen(false)} onSuccess={fetchSubscriptions} />
    </div>
  );
};
