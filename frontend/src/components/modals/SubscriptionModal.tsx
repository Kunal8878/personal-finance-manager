import { useState } from 'react';
import { Modal } from '../Modal';
import { useFinance } from '../../context/FinanceContext';
import { apiFetch } from '../../services/api';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { accounts, categories } = useFinance();

  const [name, setName] = useState('');
  const [cost, setCost] = useState('');
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'YEARLY'>('MONTHLY');
  const [nextBillingDate, setNextBillingDate] = useState(new Date().toISOString().split('T')[0]);
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const c = parseFloat(cost);
    if (!name.trim()) {
      setError('Subscription name is required.');
      return;
    }
    if (isNaN(c) || c <= 0) {
      setError('Cost must be greater than 0.');
      return;
    }

    setSubmitting(true);

    const res = await apiFetch('/subscriptions', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        cost: c,
        billingCycle,
        nextBillingDate,
        categoryId: categoryId || undefined,
        accountId: accountId || undefined
      })
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
      setName('');
      setCost('');
    } else {
      setError(res.error || 'Failed to add subscription.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Recurring Subscription">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Subscription Name</label>
          <input
            type="text"
            placeholder="e.g., Netflix, Spotify, AWS, Gym Membership"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Cost</label>
            <input
              type="number"
              step="0.01"
              placeholder="15.99"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Billing Cycle</label>
            <select
              value={billingCycle}
              onChange={(e) => setBillingCycle(e.target.value as 'MONTHLY' | 'YEARLY')}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Next Billing Date</label>
          <input
            type="date"
            value={nextBillingDate}
            onChange={(e) => setNextBillingDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Deducted Account (Optional)</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
          >
            <option value="">Select Payment Account</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={acc.id}>
                {acc.name} ({acc.type})
              </option>
            ))}
          </select>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-finance-emerald/20 text-sm mt-2 disabled:opacity-50"
        >
          {submitting ? 'Adding Subscription...' : 'Add Subscription'}
        </button>
      </form>
    </Modal>
  );
};
