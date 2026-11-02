import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useFinance } from '../../context/FinanceContext';
import { apiFetch } from '../../services/api';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose }) => {
  const { categories, refreshFinanceData } = useFinance();

  const [categoryId, setCategoryId] = useState('');
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = parseFloat(amount);
    if (!categoryId) {
      setError('Please select a category for this budget.');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Budget limit must be greater than 0.');
      return;
    }

    setSubmitting(true);

    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();

    const res = await apiFetch('/budgets', {
      method: 'POST',
      body: JSON.stringify({
        categoryId,
        amount: numAmount,
        period,
        startDate,
        endDate
      })
    });

    setSubmitting(false);

    if (res.success) {
      await refreshFinanceData();
      onClose();
      setAmount('');
    } else {
      setError(res.error || 'Failed to create budget limit.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Set Category Budget Limit">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Expense Category</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            required
          >
            <option value="">Select Category</option>
            {expenseCategories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Budget Threshold Limit</label>
          <input
            type="number"
            step="0.01"
            placeholder="e.g., 500.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Period</label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'MONTHLY' | 'YEARLY')}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
          >
            <option value="MONTHLY">Monthly</option>
            <option value="YEARLY">Yearly</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-finance-emerald/20 text-sm mt-2 disabled:opacity-50"
        >
          {submitting ? 'Setting Budget...' : 'Create Budget'}
        </button>
      </form>
    </Modal>
  );
};
