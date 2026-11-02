import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useFinance } from '../../context/FinanceContext';
import { apiFetch } from '../../services/api';
import { AccountType } from '../../types';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AccountModal: React.FC<AccountModalProps> = ({ isOpen, onClose }) => {
  const { refreshFinanceData } = useFinance();

  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('BANK');
  const [institution, setInstitution] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [balance, setBalance] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Account name is required.');
      return;
    }

    const numBalance = parseFloat(balance || '0');
    if (isNaN(numBalance)) {
      setError('Please enter a valid numeric balance.');
      return;
    }

    setSubmitting(true);

    const res = await apiFetch('/accounts', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        type,
        currency,
        institution: institution.trim() || undefined,
        balance: numBalance
      })
    });

    setSubmitting(false);

    if (res.success) {
      await refreshFinanceData();
      onClose();
      setName('');
      setInstitution('');
      setBalance('');
    } else {
      setError(res.error || 'Failed to create account.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Financial Account">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Account Name</label>
          <input
            type="text"
            placeholder="e.g., Chase Checking, HDFC Savings, Cash Wallet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Account Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as AccountType)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
          >
            <option value="BANK">Bank Account</option>
            <option value="SAVINGS">Savings Account</option>
            <option value="CURRENT">Current Account</option>
            <option value="CASH">Cash Wallet</option>
            <option value="CREDIT_CARD">Credit Card</option>
            <option value="DIGITAL_WALLET">Digital Wallet (PayPal, UPI, Apple Pay)</option>
            <option value="OTHER">Other Account</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Account Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-accent font-semibold"
          >
            <option value="INR">INR (₹) — Indian Rupee</option>
            <option value="USD">USD ($) — US Dollar</option>
            <option value="EUR">EUR (€) — Euro</option>
            <option value="GBP">GBP (£) — British Pound</option>
            <option value="AED">AED (AED) — UAE Dirham</option>
            <option value="CAD">CAD (C$) — Canadian Dollar</option>
            <option value="AUD">AUD (A$) — Australian Dollar</option>
            <option value="SGD">SGD (S$) — Singapore Dollar</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Financial Institution (Optional)</label>
          <input
            type="text"
            placeholder="e.g., Bank of America, Fidelity"
            value={institution}
            onChange={(e) => setInstitution(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Current Initial Balance</label>
          <input
            type="number"
            step="0.01"
            placeholder="0.00"
            value={balance}
            onChange={(e) => setBalance(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
          />
          <p className="text-[11px] text-finance-muted mt-1">
            Note: For Credit Cards, enter current owed debt balance as a positive number.
          </p>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-finance-emerald/20 text-sm mt-2 disabled:opacity-50"
        >
          {submitting ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
    </Modal>
  );
};
