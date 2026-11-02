import { useState } from 'react';
import { Modal } from '../Modal';
import { apiFetch } from '../../services/api';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [category, setCategory] = useState('EMERGENCY_FUND');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const target = parseFloat(targetAmount);
    const current = parseFloat(currentAmount || '0');

    if (!name.trim()) {
      setError('Goal name is required.');
      return;
    }
    if (isNaN(target) || target <= 0) {
      setError('Target amount must be greater than 0.');
      return;
    }
    if (!targetDate) {
      setError('Target date is required.');
      return;
    }

    setSubmitting(true);

    const res = await apiFetch('/goals', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        targetAmount: target,
        currentAmount: current,
        targetDate,
        category
      })
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
      setName('');
      setTargetAmount('');
      setCurrentAmount('');
    } else {
      setError(res.error || 'Failed to create savings goal.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Financial Savings Goal">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Goal Title</label>
          <input
            type="text"
            placeholder="e.g., 6-Month Emergency Fund, House Downpayment"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
          >
            <option value="EMERGENCY_FUND">Emergency Fund</option>
            <option value="VACATION">Vacation & Travel</option>
            <option value="EDUCATION">Education & Learning</option>
            <option value="VEHICLE">Vehicle / Car Purchase</option>
            <option value="HOME">Home & Real Estate</option>
            <option value="INVESTMENT">Investment Capital</option>
            <option value="CUSTOM">Custom Goal</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Target Amount</label>
            <input
              type="number"
              step="0.01"
              placeholder="10000.00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Current Saved</label>
            <input
              type="number"
              step="0.01"
              placeholder="0.00"
              value={currentAmount}
              onChange={(e) => setCurrentAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Target Date</label>
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-finance-emerald/20 text-sm mt-2 disabled:opacity-50"
        >
          {submitting ? 'Creating Goal...' : 'Save Financial Goal'}
        </button>
      </form>
    </Modal>
  );
};
