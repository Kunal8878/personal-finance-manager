import { useState, useEffect } from 'react';
import { Modal } from '../Modal';
import { apiFetch } from '../../services/api';

interface LoanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LoanModal: React.FC<LoanModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<'BORROWED' | 'LENT'>('BORROWED');
  const [principal, setPrincipal] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [tenureMonths, setTenureMonths] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [estimatedEMI, setEstimatedEMI] = useState(0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Dynamic EMI preview calculation
  useEffect(() => {
    const p = parseFloat(principal);
    const r = parseFloat(interestRate);
    const n = parseInt(tenureMonths, 10);

    if (!isNaN(p) && p > 0 && !isNaN(n) && n > 0) {
      if (isNaN(r) || r === 0) {
        setEstimatedEMI(Number((p / n).toFixed(2)));
      } else {
        const monthlyRate = r / 12 / 100;
        const factor = Math.pow(1 + monthlyRate, n);
        const emi = (p * monthlyRate * factor) / (factor - 1);
        setEstimatedEMI(Number(emi.toFixed(2)));
      }
    } else {
      setEstimatedEMI(0);
    }
  }, [principal, interestRate, tenureMonths]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const p = parseFloat(principal);
    const r = parseFloat(interestRate || '0');
    const n = parseInt(tenureMonths, 10);

    if (!name.trim()) {
      setError('Loan title is required.');
      return;
    }
    if (isNaN(p) || p <= 0) {
      setError('Principal amount must be greater than 0.');
      return;
    }
    if (isNaN(n) || n <= 0) {
      setError('Tenure in months must be at least 1.');
      return;
    }

    setSubmitting(true);

    const res = await apiFetch('/loans', {
      method: 'POST',
      body: JSON.stringify({
        name: name.trim(),
        type,
        principal: p,
        interestRate: r,
        tenureMonths: n,
        startDate
      })
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
      setName('');
      setPrincipal('');
      setInterestRate('');
      setTenureMonths('');
    } else {
      setError(res.error || 'Failed to record loan.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Loan / Debt Record">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Loan Direction</label>
          <div className="flex bg-finance-bg p-1 rounded-xl border border-finance-border">
            <button
              type="button"
              onClick={() => setType('BORROWED')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'BORROWED' ? 'bg-finance-rose text-white shadow-md' : 'text-finance-muted hover:text-finance-text'
              }`}
            >
              Borrowed (My Debt)
            </button>
            <button
              type="button"
              onClick={() => setType('LENT')}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'LENT' ? 'bg-finance-emerald text-slate-950 shadow-md' : 'text-finance-muted hover:text-finance-text'
              }`}
            >
              Lent (Asset Owed to Me)
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Loan Title</label>
          <input
            type="text"
            placeholder="e.g., Home Mortgage, Car Loan, Personal Loan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            required
          />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Principal</label>
            <input
              type="number"
              step="0.01"
              placeholder="50000"
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Interest % (APR)</label>
            <input
              type="number"
              step="0.1"
              placeholder="8.5"
              value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1">Tenure (Months)</label>
            <input
              type="number"
              placeholder="36"
              value={tenureMonths}
              onChange={(e) => setTenureMonths(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
              required
            />
          </div>
        </div>

        {estimatedEMI > 0 && (
          <div className="p-3 bg-finance-emerald/10 border border-finance-emerald/30 rounded-xl flex items-center justify-between text-xs">
            <span className="text-finance-muted font-medium">Calculated Monthly EMI:</span>
            <span className="num-font font-bold text-finance-emerald text-base">${estimatedEMI.toFixed(2)}/mo</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-finance-muted mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-emerald"
            required
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-finance-emerald/20 text-sm mt-2 disabled:opacity-50"
        >
          {submitting ? 'Saving Loan...' : 'Save Loan Record'}
        </button>
      </form>
    </Modal>
  );
};
