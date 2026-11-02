import { useState } from 'react';
import { Modal } from '../Modal';
import { apiFetch } from '../../services/api';

interface InvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const InvestmentModal: React.FC<InvestmentModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('STOCKS');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const invested = parseFloat(investedAmount);
    const val = parseFloat(currentValue);

    if (!name.trim()) {
      setError('Asset name is required.');
      return;
    }
    if (isNaN(invested) || invested <= 0) {
      setError('Invested amount must be greater than 0.');
      return;
    }
    if (isNaN(val) || val < 0) {
      setError('Current valuation must be a valid number.');
      return;
    }

    setSubmitting(true);

    const res = await apiFetch('/investments', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        type,
        investedAmount: invested,
        currentValue: val
      })
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
      setName('');
      setInvestedAmount('');
      setCurrentValue('');
    } else {
      setError(res.error || 'Failed to add investment asset.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Investment Asset">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Asset Name</label>
          <input
            type="text"
            placeholder="e.g., Apple (AAPL), Vanguard S&P 500 ETF, Gold Bond"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Asset Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
          >
            <option value="STOCKS">Individual Stocks</option>
            <option value="MUTUAL_FUNDS">Mutual Funds</option>
            <option value="ETFS">ETFs</option>
            <option value="FIXED_DEPOSIT">Fixed Deposits</option>
            <option value="GOLD">Gold & Precious Metals</option>
            <option value="BONDS">Bonds & Government Securities</option>
            <option value="OTHER">Other Investments</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Invested Amount</label>
            <input
              type="number"
              step="0.01"
              placeholder="1000.00"
              value={investedAmount}
              onChange={(e) => setInvestedAmount(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Current Valuation</label>
            <input
              type="number"
              step="0.01"
              placeholder="1250.00"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-finance-emerald/20 text-sm mt-2 disabled:opacity-50"
        >
          {submitting ? 'Adding Investment...' : 'Add Investment'}
        </button>
      </form>
    </Modal>
  );
};
