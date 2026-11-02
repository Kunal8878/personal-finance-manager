import React, { useState } from 'react';
import { Modal } from '../Modal';
import { useFinance } from '../../context/FinanceContext';
import { apiFetch } from '../../services/api';
import { Building2, ShieldCheck, CheckCircle2, ArrowRight } from 'lucide-react';

interface BankSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BankSyncModal: React.FC<BankSyncModalProps> = ({ isOpen, onClose }) => {
  const { refreshFinanceData } = useFinance();

  const [pan, setPan] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [step, setStep] = useState<'ENTER_IDS' | 'DISCOVERED'>('ENTER_IDS');
  const [discovered, setDiscovered] = useState<any[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleDiscover = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!pan.trim()) {
      setError('PAN number is required for bank account auto-discovery.');
      return;
    }

    setLoading(true);

    const res = await apiFetch<{ discoveredAccounts: any[] }>('/bank-sync/discover', {
      method: 'POST',
      body: JSON.stringify({ pan: pan.trim(), aadhaar: aadhaar.trim() || undefined })
    });

    setLoading(false);

    if (res.success && res.data) {
      setDiscovered(res.data.discoveredAccounts || []);
      setSelectedIndices(res.data.discoveredAccounts.map((_, i) => i));
      setStep('DISCOVERED');
    } else {
      setError(res.error || 'Failed to discover linked bank accounts.');
    }
  };

  const handleConfirmLink = async () => {
    setError('');
    const accountsToLink = selectedIndices.map((i) => discovered[i]);

    if (accountsToLink.length === 0) {
      setError('Please select at least one account to link.');
      return;
    }

    setLoading(true);

    const res = await apiFetch('/bank-sync/confirm', {
      method: 'POST',
      body: JSON.stringify({
        pan,
        aadhaar,
        accountsToLink
      })
    });

    setLoading(false);

    if (res.success) {
      await refreshFinanceData();
      onClose();
      setStep('ENTER_IDS');
      setPan('');
      setAadhaar('');
    } else {
      setError(res.error || 'Failed to import selected bank accounts.');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Account Aggregator Bank Auto-Sync">
      <div className="space-y-4">
        {/* Compliance Banner */}
        <div className="p-3.5 bg-finance-emerald/10 border border-finance-emerald/30 rounded-xl flex items-start gap-2.5 text-xs text-finance-text">
          <ShieldCheck className="w-5 h-5 text-finance-emerald flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <p className="font-bold text-finance-emerald">Open Banking & RBI Sahamati Compliant</p>
            <p className="text-finance-muted text-[11px]">
              Discovers accounts linked to your PAN & Aadhaar via Account Aggregator consent. We **never** ask for internet banking passwords, UPI PINs, or ATM PINs.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-finance-rose/10 border border-finance-rose/30 text-finance-rose rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        {step === 'ENTER_IDS' && (
          <form onSubmit={handleDiscover} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-finance-muted mb-1">PAN Number</label>
              <input
                type="text"
                placeholder="ABCDE1234F"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                maxLength={10}
                className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald uppercase"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-finance-muted mb-1">Aadhaar Number (Optional)</label>
              <input
                type="text"
                placeholder="12-digit Aadhaar number"
                value={aadhaar}
                onChange={(e) => setAadhaar(e.target.value)}
                maxLength={14}
                className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text num-font text-base focus:outline-none focus:border-finance-emerald"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold rounded-xl transition-all shadow-lg shadow-finance-emerald/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>{loading ? 'Connecting Account Aggregator...' : 'Discover Linked Accounts'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}

        {step === 'DISCOVERED' && (
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-finance-muted uppercase tracking-wider">
              Discovered Financial Accounts ({discovered.length})
            </h4>

            <div className="space-y-2.5 max-h-60 overflow-y-auto">
              {discovered.map((acc, idx) => {
                const isSelected = selectedIndices.includes(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedIndices(selectedIndices.filter((i) => i !== idx));
                      } else {
                        setSelectedIndices([...selectedIndices, idx]);
                      }
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-finance-emerald/15 border-finance-emerald text-finance-text'
                        : 'bg-finance-bg/60 border-finance-border text-finance-muted'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-finance-card text-finance-emerald border border-finance-border">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-finance-text">{acc.institution}</p>
                        <p className="text-[11px] text-finance-muted">{acc.accountNumberMasked} | {acc.type}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="num-font font-bold text-finance-emerald text-sm">${acc.estimatedBalance.toFixed(2)}</span>
                      <CheckCircle2 className={`w-5 h-5 ${isSelected ? 'text-finance-emerald' : 'text-finance-border'}`} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStep('ENTER_IDS')}
                className="flex-1 py-2.5 bg-finance-card text-finance-text text-xs font-semibold rounded-xl border border-finance-border"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmLink}
                disabled={loading}
                className="flex-2 py-2.5 bg-finance-emerald hover:bg-finance-emeraldDark text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-finance-emerald/20 disabled:opacity-50"
              >
                {loading ? 'Importing Accounts...' : `Import ${selectedIndices.length} Selected Accounts`}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
