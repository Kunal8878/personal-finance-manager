import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiFetch } from '../services/api';
import { ShieldCheck, Lock, Mail, User as UserIcon, Globe, ArrowRight } from 'lucide-react';

export const Register: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [currency, setCurrency] = useState('INR'); // Default to INR per requirements
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const res = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, currency })
    });

    setSubmitting(false);

    if (res.success && res.data) {
      login(res.data.token, res.data.user);
      navigate('/onboarding');
    } else {
      setError(res.error || 'Registration failed. Please check information.');
    }
  };

  return (
    <div className="min-h-screen bg-finance-bg flex items-center justify-center p-6 selection:bg-finance-accent/20">
      <div className="w-full max-w-md bg-finance-card rounded-2xl p-8 md:p-10 border border-finance-border shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-finance-elevated border border-finance-border text-finance-accent mb-4">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="flex items-center justify-center gap-1.5">
            <h1 className="text-3xl font-serif text-finance-text tracking-tight">aura</h1>
            <span className="w-1.5 h-1.5 rounded-full bg-finance-accent self-end mb-1.5"></span>
          </div>
          <p className="text-xs uppercase tracking-widest text-finance-muted mt-2 font-medium">
            Establish Private Wealth Vault
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
              Principal Name
            </label>
            <div className="relative">
              <UserIcon className="w-4 h-4 text-finance-muted absolute left-3.5 top-3.5" />
              <input
                type="text"
                placeholder="Eleanor Vance"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-primary transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-finance-muted absolute left-3.5 top-3.5" />
              <input
                type="email"
                placeholder="name@institution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-primary transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
              Passphrase
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-finance-muted absolute left-3.5 top-3.5" />
              <input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-primary transition-colors"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-finance-muted uppercase tracking-wider mb-2">
              Reporting Currency
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 text-finance-muted absolute left-3.5 top-3.5" />
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-sm focus:outline-none focus:border-finance-primary transition-colors cursor-pointer"
              >
                <option value="INR">INR (₹) — Indian Rupee [Default]</option>
                <option value="USD">USD ($) — US Dollar</option>
                <option value="EUR">EUR (€) — Euro</option>
                <option value="GBP">GBP (£) — British Pound</option>
                <option value="AED">AED (د.إ) — UAE Dirham</option>
                <option value="SGD">SGD (S$) — Singapore Dollar</option>
                <option value="CAD">CAD (C$) — Canadian Dollar</option>
                <option value="AUD">AUD (A$) — Australian Dollar</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-finance-primary text-finance-bg hover:opacity-95 font-medium rounded-xl transition-all shadow-sm text-sm mt-4 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? 'Creating Vault...' : 'Establish Vault & Continue'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-finance-border/60 text-center">
          <p className="text-xs text-finance-muted">
            Existing portfolio vault?{' '}
            <Link to="/login" className="text-finance-accent font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
