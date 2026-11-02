import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFinance } from '../context/FinanceContext';
import { Transaction } from '../types';
import { apiFetch } from '../services/api';
import { CurrencyDisplay, getCurrencySymbol } from '../components/CurrencyDisplay';
import { EmptyState } from '../components/EmptyState';
import { TransactionModal } from '../components/modals/TransactionModal';
import { CSVImportModal } from '../components/modals/CSVImportModal';
import {
  ArrowRightLeft,
  Search,
  Download,
  Upload,
  Trash2,
  Pencil,
  ChevronLeft,
  ChevronRight,
  Plus,
  Zap,
  RotateCw,
  Radio,
  CheckCircle2,
  Filter
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const { accounts, categories, refreshFinanceData, reportingCurrency } = useFinance();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters state
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('');
  const [accountId, setAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  // Live stream & demo states
  const [liveSync, setLiveSync] = useState(true);
  const [lastApiAction, setLastApiAction] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchTransactions = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    const query = new URLSearchParams({
      page: page.toString(),
      limit: '12',
      reportingCurrency,
      sortBy,
      sortOrder,
      ...(search && { search }),
      ...(type && { type }),
      ...(currencyFilter && { currency: currencyFilter }),
      ...(accountId && { accountId }),
      ...(categoryId && { categoryId })
    }).toString();

    const res = await apiFetch<{
      transactions: Transaction[];
      pagination: { totalPages: number };
      reportingCurrency: string;
      reportingSymbol: string;
    }>(`/transactions?${query}`);

    if (!silent) setLoading(false);

    if (res.success && res.data) {
      setTransactions(res.data.transactions);
      setTotalPages(res.data.pagination.totalPages || 1);
    }
  }, [page, search, type, currencyFilter, accountId, categoryId, sortBy, sortOrder, reportingCurrency]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  // Live-time Polling fallback (every 5 seconds when liveSync is on)
  useEffect(() => {
    if (!liveSync) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      fetchTransactions(true);
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [liveSync, fetchTransactions]);

  const handleSimulateLiveTx = async () => {
    setIsSimulating(true);
    setLastApiAction('Sending POST /api/transactions/simulate-live...');

    const res = await apiFetch<{ message: string; transaction: Transaction }>('/transactions/simulate-live', {
      method: 'POST'
    });

    setIsSimulating(false);

    if (res.success && res.data) {
      const tx = res.data.transaction;
      setJustAddedId(tx.id);
      setLastApiAction(
        `API 201 Created: "${tx.notes}" • ${tx.type === 'INCOME' ? '+' : '-'}${tx.currencySymbol || ''}${tx.amount} ${tx.currency} (Confirmed in database)`
      );
      setTimeout(() => setJustAddedId(null), 8000);
      await Promise.all([fetchTransactions(true), refreshFinanceData()]);
    } else {
      setLastApiAction(`API Error: ${res.error || 'Failed to simulate transaction.'}`);
    }
  };

  const handleSeedData = async () => {
    if (!window.confirm('Re-upload authentic multi-currency pre-seeded records into the database?')) return;
    setIsSeeding(true);
    setLastApiAction('Sending POST /api/seed...');

    const res = await apiFetch<{ message: string }>('/seed', {
      method: 'POST',
      body: JSON.stringify({ all: false })
    });

    setIsSeeding(false);

    if (res.success) {
      setLastApiAction(`API 200 OK: ${res.data?.message || 'Pre-seeded multi-currency data uploaded!'}`);
      setPage(1);
      await Promise.all([fetchTransactions(false), refreshFinanceData()]);
    } else {
      setLastApiAction(`API Error: ${res.error || 'Failed to seed data.'}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this transaction? Account balance will be safely recalculated in its native currency.')) return;
    setLastApiAction(`Sending DELETE /api/transactions/${id}...`);
    const res = await apiFetch(`/transactions/${id}`, { method: 'DELETE' });
    if (res.success) {
      setLastApiAction(`API 200 OK: Transaction deleted and account balance recalculated.`);
      await Promise.all([refreshFinanceData(), fetchTransactions(true)]);
    } else {
      setLastApiAction(`API Error: ${res.error || 'Failed to delete transaction.'}`);
    }
  };

  const handleExportCSV = () => {
    window.open('/api/transactions/export', '_blank');
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto pb-24 lg:pb-16 select-none">
      {/* Header Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-finance-border/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-finance-text">
              Multi-Currency Ledger
            </h1>
            <button
              onClick={() => setLiveSync(!liveSync)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-sans font-bold flex items-center gap-1 border transition-all ${
                liveSync
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-finance-bg text-finance-muted border-finance-border'
              }`}
              title="Toggle background synchronization"
            >
              <Radio className={`w-3 h-3 ${liveSync ? 'animate-pulse text-emerald-500' : ''}`} />
              {liveSync ? 'SSE Live Stream: Connected' : 'Stream Paused'}
            </button>
          </div>
          <p className="text-xs text-finance-muted mt-1 font-sans">
            Every transaction strictly preserves its original currency and amount while displaying consolidated {reportingCurrency} equivalents.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleSeedData}
            disabled={isSeeding}
            className="px-3.5 py-2 bg-finance-card hover:bg-finance-surface text-finance-text font-medium text-xs rounded-xl border border-finance-border flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            title="Re-seed verified multi-currency data"
          >
            <RotateCw className={`w-3.5 h-3.5 text-finance-accent ${isSeeding ? 'animate-spin' : ''}`} />
            <span>{isSeeding ? 'Seeding...' : 'Re-seed Data'}</span>
          </button>

          <button
            onClick={handleSimulateLiveTx}
            disabled={isSimulating}
            className="px-3.5 py-2 bg-finance-card hover:bg-finance-surface text-finance-text font-medium text-xs rounded-xl border border-finance-border flex items-center gap-1.5 transition-all shadow-sm disabled:opacity-50"
            title="Broadcast authentic live transaction"
          >
            <Zap className={`w-3.5 h-3.5 text-finance-accent ${isSimulating ? 'animate-bounce' : ''}`} />
            <span>Simulate Live</span>
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className="px-3 py-2 bg-finance-card hover:bg-finance-surface text-finance-text font-medium text-xs rounded-xl border border-finance-border flex items-center gap-1.5 transition-all"
          >
            <Upload className="w-3.5 h-3.5 text-finance-muted" /> Import
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3 py-2 bg-finance-card hover:bg-finance-surface text-finance-text font-medium text-xs rounded-xl border border-finance-border flex items-center gap-1.5 transition-all"
          >
            <Download className="w-3.5 h-3.5 text-finance-muted" /> Export
          </button>

          <button
            onClick={() => {
              setEditingTx(null);
              setModalOpen(true);
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

      {/* Filter Controls Bar */}
      <div className="glass-card p-4 rounded-2xl border border-finance-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search Input (2 cols) */}
        <div className="relative lg:col-span-2">
          <Search className="w-4 h-4 text-finance-muted absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search description, notes or vendor..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-3 py-2 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-accent"
          />
        </div>

        {/* Currency Filter (INR, USD, EUR, GBP) */}
        <div>
          <select
            value={currencyFilter}
            onChange={(e) => {
              setCurrencyFilter(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs font-semibold focus:outline-none focus:border-finance-accent"
          >
            <option value="">All Currencies</option>
            <option value="INR">INR (₹)</option>
            <option value="USD">USD ($)</option>
            <option value="EUR">EUR (€)</option>
            <option value="GBP">GBP (£)</option>
          </select>
        </div>

        {/* Type Filter */}
        <div>
          <select
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-accent"
          >
            <option value="">All Types</option>
            <option value="INCOME">Income</option>
            <option value="EXPENSE">Expense</option>
            <option value="TRANSFER">Transfer</option>
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-accent"
          >
            <option value="">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <select
            value={`${sortBy}_${sortOrder}`}
            onChange={(e) => {
              const [f, o] = e.target.value.split('_');
              setSortBy(f);
              setSortOrder(o);
              setPage(1);
            }}
            className="w-full px-3 py-2 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-accent"
          >
            <option value="date_desc">Date (Newest)</option>
            <option value="date_asc">Date (Oldest)</option>
            <option value="amount_desc">Amount (Highest)</option>
            <option value="amount_asc">Amount (Lowest)</option>
          </select>
        </div>
      </div>

      {/* Transaction List: Desktop Table + Mobile Cards */}
      {loading ? (
        <div className="p-16 text-center text-finance-muted font-serif italic text-sm animate-pulse">
          Synchronizing multi-currency records...
        </div>
      ) : transactions.length === 0 ? (
        <EmptyState
          icon={ArrowRightLeft}
          title="No transaction records found"
          description="Click 'Re-seed Data' to populate authentic multi-currency transactions, or record one manually."
          actionText="Re-seed Multi-Currency Data"
          onAction={handleSeedData}
          secondaryActionText="Record Transaction"
          onSecondaryAction={() => {
            setEditingTx(null);
            setModalOpen(true);
          }}
        />
      ) : (
        <div className="glass-card rounded-2xl border border-finance-border overflow-hidden shadow-wealth">
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs text-finance-text">
              <thead className="bg-finance-bg/60 border-b border-finance-border text-finance-muted uppercase tracking-wider text-[10px] font-sans">
                <tr>
                  <th className="py-3 px-4 font-bold">Date</th>
                  <th className="py-3 px-4 font-bold">Description</th>
                  <th className="py-3 px-4 font-bold">Category</th>
                  <th className="py-3 px-4 font-bold">Account</th>
                  <th className="py-3 px-4 font-bold">Type</th>
                  <th className="py-3 px-4 font-bold text-right">Original Amount</th>
                  <th className="py-3 px-4 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-finance-border/50">
                {transactions.map((tx) => {
                  const isJustAdded = tx.id === justAddedId;
                  return (
                    <tr
                      key={tx.id}
                      className={`transition-all duration-300 ${
                        isJustAdded
                          ? 'bg-emerald-500/15 ring-1 ring-emerald-500/30 font-semibold'
                          : 'hover:bg-finance-bg/50'
                      }`}
                    >
                      {/* Date */}
                      <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isJustAdded && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-finance-accent text-slate-950 font-black animate-pulse">
                              LIVE
                            </span>
                          )}
                          <span className="text-finance-text font-serif">
                            {new Date(tx.date).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Description */}
                      <td className="py-3.5 px-4 font-semibold text-finance-text max-w-xs truncate">
                        {tx.notes || 'Transaction'}
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 font-medium whitespace-nowrap">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-finance-bg border border-finance-border">
                          {tx.category?.name || 'Uncategorized'}
                        </span>
                      </td>

                      {/* Account */}
                      <td className="py-3.5 px-4 text-finance-muted whitespace-nowrap text-[11px]">
                        {tx.account?.name || '-'}
                        {tx.toAccount && (
                          <span className="text-finance-accent font-medium"> → {tx.toAccount.name}</span>
                        )}
                      </td>

                      {/* Type Badge */}
                      <td className="py-3.5 px-4 font-bold uppercase text-[10px] whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full border ${
                            tx.type === 'INCOME'
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                              : tx.type === 'EXPENSE'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                              : 'bg-finance-accent/10 text-finance-accent border-finance-accent/30'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>

                      {/* Original Amount & Reporting Equivalent */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <CurrencyDisplay
                          amount={tx.amount}
                          currency={tx.currency}
                          reportingAmount={tx.reportingAmount}
                          reportingCurrency={reportingCurrency}
                          type={tx.type === 'INCOME' ? 'INCOME' : tx.type === 'EXPENSE' ? 'EXPENSE' : 'NEUTRAL'}
                          showSign
                        />
                      </td>

                      {/* Edit / Delete Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setEditingTx(tx);
                              setModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-finance-muted hover:text-finance-text hover:bg-finance-bg transition-colors"
                            title="Edit transaction"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="p-1.5 rounded-lg text-finance-muted hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
                            title="Delete transaction"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View */}
          <div className="md:hidden divide-y divide-finance-border/50">
            {transactions.map((tx) => (
              <div key={tx.id} className="p-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-finance-muted font-serif">
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                      tx.type === 'INCOME'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                        : tx.type === 'EXPENSE'
                        ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30'
                        : 'bg-finance-accent/10 text-finance-accent border-finance-accent/30'
                    }`}
                  >
                    {tx.type}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-finance-text text-sm">{tx.notes || 'Transaction'}</p>
                    <p className="text-xs text-finance-muted mt-0.5">
                      {tx.category?.name || 'Uncategorized'} • {tx.account?.name || '-'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <CurrencyDisplay
                      amount={tx.amount}
                      currency={tx.currency}
                      reportingAmount={tx.reportingAmount}
                      reportingCurrency={reportingCurrency}
                      type={tx.type === 'INCOME' ? 'INCOME' : tx.type === 'EXPENSE' ? 'EXPENSE' : 'NEUTRAL'}
                      showSign
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-finance-border/30">
                  <button
                    onClick={() => {
                      setEditingTx(tx);
                      setModalOpen(true);
                    }}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-finance-muted hover:text-finance-text border border-finance-border"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(tx.id)}
                    className="px-2.5 py-1 text-xs font-medium rounded-lg text-rose-600 hover:bg-rose-500/10 border border-finance-border"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 && (
            <div className="px-4 py-3.5 border-t border-finance-border flex items-center justify-between text-xs text-finance-muted">
              <span>Page {page} of {totalPages}</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded-lg border border-finance-border hover:bg-finance-bg disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded-lg border border-finance-border hover:bg-finance-bg disabled:opacity-40 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <TransactionModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
        }}
        transactionToEdit={editingTx}
      />
      <CSVImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </div>
  );
};
