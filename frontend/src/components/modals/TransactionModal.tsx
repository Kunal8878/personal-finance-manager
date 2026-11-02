import React, { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { useFinance } from '../../context/FinanceContext';
import { apiFetch } from '../../services/api';
import { Transaction } from '../../types';
import { getCurrencySymbol } from '../CurrencyDisplay';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactionToEdit?: Transaction | null;
}

const SUPPORTED_CURRENCIES = [
  { code: 'INR', symbol: '₹', label: 'INR (₹) — Indian Rupee' },
  { code: 'USD', symbol: '$', label: 'USD ($) — US Dollar' },
  { code: 'EUR', symbol: '€', label: 'EUR (€) — Euro' },
  { code: 'GBP', symbol: '£', label: 'GBP (£) — British Pound' },
  { code: 'AED', symbol: 'AED ', label: 'AED — UAE Dirham' },
  { code: 'CAD', symbol: 'C$', label: 'CAD (C$) — Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', label: 'AUD (A$) — Australian Dollar' },
  { code: 'SGD', symbol: 'S$', label: 'SGD (S$) — Singapore Dollar' },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  transactionToEdit
}) => {
  const { accounts, categories, refreshFinanceData, reportingCurrency } = useFinance();

  const isEditing = Boolean(transactionToEdit);

  const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('EXPENSE');
  const [accountId, setAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Conversion preview state
  const [convertedPreview, setConvertedPreview] = useState<number | null>(null);

  // Reset or fill form when opening or editing
  useEffect(() => {
    if (transactionToEdit) {
      setType(
        transactionToEdit.type === 'INCOME'
          ? 'INCOME'
          : transactionToEdit.type === 'TRANSFER'
          ? 'TRANSFER'
          : 'EXPENSE'
      );
      setAccountId(transactionToEdit.accountId);
      setToAccountId(transactionToEdit.toAccountId || '');
      setCategoryId(transactionToEdit.categoryId || '');
      setAmount(transactionToEdit.amount.toString());
      setCurrency(transactionToEdit.currency || 'INR');
      setDate(new Date(transactionToEdit.date).toISOString().split('T')[0]);
      setNotes(transactionToEdit.notes || '');
      setIsRecurring(transactionToEdit.isRecurring);
    } else {
      setType('EXPENSE');
      setAccountId(accounts[0]?.id || '');
      setToAccountId('');
      setCategoryId('');
      setAmount('');
      setCurrency('INR');
      setDate(new Date().toISOString().split('T')[0]);
      setNotes('');
      setIsRecurring(false);
    }
    setError('');
  }, [transactionToEdit, isOpen, accounts]);

  // Live conversion estimation
  useEffect(() => {
    const num = parseFloat(amount);
    if (!num || isNaN(num) || num <= 0) {
      setConvertedPreview(null);
      return;
    }

    if (currency === reportingCurrency) {
      setConvertedPreview(num);
      return;
    }

    // Standard rate multiplier estimate
    let rate = 1.0;
    if (currency === 'USD' && reportingCurrency === 'INR') rate = 83.50;
    else if (currency === 'INR' && reportingCurrency === 'USD') rate = 1 / 83.50;
    else if (currency === 'EUR' && reportingCurrency === 'INR') rate = 90.20;
    else if (currency === 'GBP' && reportingCurrency === 'INR') rate = 106.00;
    else rate = 1.0;

    setConvertedPreview(Math.round(num * rate * 100) / 100);
  }, [amount, currency, reportingCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid positive amount.');
      return;
    }
    if (!accountId) {
      setError('Please select an account.');
      return;
    }
    if (type === 'TRANSFER' && !toAccountId) {
      setError('Please select a destination account for transfer.');
      return;
    }

    setSubmitting(true);

    const payload: any = {
      type,
      accountId,
      amount: numAmount,
      currency: currency.toUpperCase(),
      date,
      notes: notes || null,
      isRecurring
    };

    if (type === 'TRANSFER') {
      payload.toAccountId = toAccountId;
    } else {
      payload.categoryId = categoryId || null;
    }

    const endpoint = isEditing && transactionToEdit
      ? `/transactions/${transactionToEdit.id}`
      : '/transactions';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await apiFetch(endpoint, {
      method,
      body: JSON.stringify(payload)
    });

    setSubmitting(false);

    if (res.success) {
      await refreshFinanceData();
      onClose();
    } else {
      setError(res.error || 'Failed to save transaction.');
    }
  };

  const filteredCategories = categories.filter((c) => c.type === type);
  const activeSymbol = getCurrencySymbol(currency);
  const reportingSymbol = getCurrencySymbol(reportingCurrency);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit Transaction' : 'Record Transaction'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {/* Transaction Type Tabs */}
        <div className="flex bg-finance-bg p-1 rounded-xl border border-finance-border">
          {(['EXPENSE', 'INCOME', 'TRANSFER'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setType(t);
                setError('');
              }}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                type === t
                  ? 'bg-finance-card text-finance-text font-bold shadow-sm border border-finance-border'
                  : 'text-finance-muted hover:text-finance-text'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Amount & Currency Selection Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Currency Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">
              Original Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs font-semibold focus:outline-none focus:border-finance-accent"
              required
            >
              {SUPPORTED_CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.code} ({c.symbol})
                </option>
              ))}
            </select>
          </div>

          {/* Amount Input */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-finance-muted mb-1">
              Amount ({activeSymbol})
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 font-serif font-bold text-finance-muted text-base">
                {activeSymbol}
              </span>
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-accent font-semibold"
                required
              />
            </div>
          </div>
        </div>

        {/* Live Multi-Currency Conversion Preview */}
        {convertedPreview !== null && currency !== reportingCurrency && (
          <div className="p-2.5 rounded-xl bg-finance-bg border border-finance-border/70 text-xs flex items-center justify-between text-finance-muted">
            <span className="font-medium text-[11px]">Consolidated Reporting Value:</span>
            <span className="num-font font-bold text-finance-text">
              ≈ {reportingSymbol}{convertedPreview.toLocaleString('en-IN', { minimumFractionDigits: 2 })} {reportingCurrency}
            </span>
          </div>
        )}

        {/* Source Account */}
        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">
            {type === 'TRANSFER' ? 'From Account' : 'Account'}
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-accent"
            required
          >
            <option value="">Select Account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.currency || 'INR'}) — Balance: {getCurrencySymbol(acc.currency)}{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </option>
            ))}
          </select>
        </div>

        {/* Destination Account (Only for TRANSFER) */}
        {type === 'TRANSFER' && (
          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">To Account</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-accent"
              required
            >
              <option value="">Select Destination Account</option>
              {accounts
                .filter((acc) => acc.id !== accountId)
                .map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({acc.currency || 'INR'}) — Balance: {getCurrencySymbol(acc.currency)}{acc.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </option>
                ))}
            </select>
          </div>
        )}

        {/* Category (For INCOME / EXPENSE) */}
        {type !== 'TRANSFER' && (
          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-accent"
            >
              <option value="">Select Category (Optional)</option>
              {filteredCategories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date */}
        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-accent"
            required
          />
        </div>

        {/* Notes / Description */}
        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Notes / Description</label>
          <input
            type="text"
            placeholder="e.g., Nature’s Basket weekly groceries or US client wire"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs focus:outline-none focus:border-finance-accent"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold text-sm tracking-wide rounded-xl transition-all shadow-md mt-2 disabled:opacity-50"
        >
          {submitting ? 'Preserving & Saving Transaction...' : isEditing ? 'Update Transaction' : 'Record Transaction'}
        </button>
      </form>
    </Modal>
  );
};
