import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme, THEMES } from '../context/ThemeContext';
import { useFinance } from '../context/FinanceContext';
import { apiFetch } from '../services/api';
import {
  ShieldCheck,
  Globe,
  LogOut,
  Palette,
  Check,
  Sparkles,
  Key,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Coins
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { user, logout, updateUserCurrency } = useAuth();
  const { theme, setTheme } = useTheme();
  const { reportingCurrency, setReportingCurrency } = useFinance();

  const [selectedCurrency, setSelectedCurrency] = useState(reportingCurrency || 'INR');
  const [savedMsg, setSavedMsg] = useState('');

  // Exchange Rates Information Table
  const [ratesData, setRatesData] = useState<{
    baseCurrency: string;
    baseSymbol: string;
    rates: Record<string, number>;
    lastUpdated: string;
    source: string;
  } | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  // AI Connection State
  const [openAIKeyInput, setOpenAIKeyInput] = useState('');
  const [aiStatus, setAiStatus] = useState<{
    openAIConfigured: boolean;
    geminiConfigured: boolean;
    maskedOpenAIKey: string;
    activeModel: string;
  } | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [testingAi, setTestingAi] = useState(false);

  const fetchRates = async () => {
    setRatesLoading(true);
    const res = await apiFetch<any>(`/currency/rates?base=${selectedCurrency}`);
    setRatesLoading(false);
    if (res.success && res.data) {
      setRatesData(res.data);
    }
  };

  useEffect(() => {
    fetchRates();
  }, [selectedCurrency]);

  useEffect(() => {
    async function loadAIStatus() {
      const res = await apiFetch<any>('/ai/status');
      if (res.success && res.data) {
        setAiStatus(res.data);
      }
    }
    loadAIStatus();
  }, []);

  const handleSaveCurrency = async (e: React.FormEvent) => {
    e.preventDefault();
    await setReportingCurrency(selectedCurrency);
    if (updateUserCurrency) updateUserCurrency(selectedCurrency);
    setSavedMsg('Default reporting currency set to ' + selectedCurrency + ' successfully!');
    setTimeout(() => setSavedMsg(''), 3000);
    fetchRates();
  };

  const handleSaveAIConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openAIKeyInput.trim()) return;

    setAiLoading(true);
    setAiMsg(null);

    const res = await apiFetch<any>('/ai/config', {
      method: 'POST',
      body: JSON.stringify({ openAIKey: openAIKeyInput.trim() })
    });

    setAiLoading(false);

    if (res.success) {
      setAiMsg({ type: 'success', text: 'OpenAI API key saved & linked successfully!' });
      setOpenAIKeyInput('');
      const statusRes = await apiFetch<any>('/ai/status');
      if (statusRes.success && statusRes.data) setAiStatus(statusRes.data);
    } else {
      setAiMsg({ type: 'error', text: res.error || 'Failed to save OpenAI key.' });
    }
  };

  const handleTestConnection = async () => {
    setTestingAi(true);
    setAiMsg(null);

    const res = await apiFetch<any>('/ai/test', {
      method: 'POST',
      body: JSON.stringify({ apiKey: openAIKeyInput.trim() || undefined })
    });

    setTestingAi(false);

    if (res.success) {
      setAiMsg({ type: 'success', text: res.data?.message || 'OpenAI API connection verified successfully!' });
      const statusRes = await apiFetch<any>('/ai/status');
      if (statusRes.success && statusRes.data) setAiStatus(statusRes.data);
    } else {
      setAiMsg({ type: 'error', text: res.error || 'OpenAI test failed. Check key validity.' });
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl mx-auto pb-24 lg:pb-16 select-none font-sans">
      <div className="border-b border-finance-border/60 pb-5">
        <h1 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-finance-text">
          Vault & Currency Settings
        </h1>
        <p className="text-xs text-finance-muted mt-1">
          Manage consolidated multi-currency reporting, live exchange rate benchmarks, and private wealth appearance.
        </p>
      </div>

      {/* User Profile Card */}
      <div className="glass-card rounded-2xl p-6 border border-finance-border flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-finance-card border border-finance-border flex items-center justify-center text-finance-accent font-serif font-bold text-xl shadow-sm">
            {user?.name ? user.name[0].toUpperCase() : 'A'}
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-finance-text">{user?.name}</h3>
            <p className="text-xs text-finance-muted font-sans">{user?.email}</p>
            <span className="inline-block mt-1 px-2.5 py-0.5 bg-finance-accent/15 text-finance-accent border border-finance-accent/30 rounded-full text-[10px] font-bold uppercase tracking-wider">
              Private Wealth Member
            </span>
          </div>
        </div>
      </div>

      {/* ── Multi-Currency Configuration & Exchange Rate Information (Requirement 3) ── */}
      <div className="glass-card rounded-2xl p-6 border border-finance-border space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-finance-accent/15 border border-finance-accent/30 flex items-center justify-center text-finance-accent">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-finance-text">
                Multi-Currency Reporting System
              </h3>
              <p className="text-xs text-finance-muted">
                Original transaction amounts are strictly preserved. Choose your preferred consolidated reporting currency.
              </p>
            </div>
          </div>

          <button
            onClick={fetchRates}
            disabled={ratesLoading}
            className="p-2 rounded-xl border border-finance-border text-finance-muted hover:text-finance-text hover:bg-finance-bg transition-colors"
            title="Refresh exchange rate benchmarks"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${ratesLoading ? 'animate-spin text-finance-accent' : ''}`} />
          </button>
        </div>

        {savedMsg && (
          <div className="p-3 bg-finance-primary/10 border border-finance-primary/30 text-finance-primary rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-finance-accent flex-shrink-0" />
            <span>{savedMsg}</span>
          </div>
        )}

        <form onSubmit={handleSaveCurrency} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-finance-muted mb-1.5">
                Default Consolidated Reporting Currency
              </label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs font-semibold focus:outline-none focus:border-finance-accent"
              >
                <option value="INR">INR (₹) — Indian Rupee (Default Reporting)</option>
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
              <label className="block text-xs font-semibold text-finance-muted mb-1.5">
                Financial Currency Formatting Standard
              </label>
              <input
                type="text"
                disabled
                value="ISO 4217 Decimal-Safe Arithmetic (No Floating-Point Artifacts)"
                className="w-full px-4 py-2.5 bg-finance-bg/60 border border-finance-border rounded-xl text-finance-muted text-xs cursor-not-allowed"
              />
            </div>
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold rounded-xl text-xs shadow-md transition-all"
          >
            Save Reporting Preference
          </button>
        </form>

        {/* Live Exchange Rate Reference Table */}
        <div className="pt-3 border-t border-finance-border/50 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-finance-text">
              Active Exchange Benchmarks (1 {selectedCurrency} Base):
            </span>
            <span className="text-[10px] text-finance-muted">
              Source: {ratesData?.source || 'Reserve Bank Reference'} • Updated {ratesData?.lastUpdated ? new Date(ratesData.lastUpdated).toLocaleTimeString() : 'Live'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            {ratesData && ratesData.rates && Object.entries(ratesData.rates).slice(0, 8).map(([code, rate]) => (
              <div key={code} className="p-2.5 bg-finance-bg rounded-xl border border-finance-border/70 flex justify-between items-center">
                <span className="font-semibold text-finance-muted text-[11px]">{code}</span>
                <span className="num-font font-bold text-finance-text text-xs">
                  {Number(rate).toFixed(code === 'INR' || code === 'USD' ? 4 : 4)}
                </span>
              </div>
            ))}
          </div>

          <p className="text-[11px] text-finance-muted leading-relaxed">
            Note: Every transaction retains its historical exchange rate and timestamp. When consolidated dashboard totals are requested in {selectedCurrency}, conversions are performed without altering the original transaction values.
          </p>
        </div>
      </div>

      {/* ── Theme Appearance (Quiet Luxury & Private Wealth) ── */}
      <div className="glass-card rounded-2xl p-6 border border-finance-border space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-finance-accent" />
          <div>
            <h3 className="font-serif text-base font-bold text-finance-text">Visual Identity & Theme</h3>
            <p className="text-xs text-finance-muted mt-0.5">Private Wealth and Quiet Luxury aesthetic</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {THEMES.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTheme(t.id)}
                className={`flex items-center gap-3.5 p-4 rounded-xl border text-left transition-all ${
                  isActive
                    ? 'border-finance-accent bg-finance-accent/10 shadow-sm'
                    : 'border-finance-border hover:border-finance-accent/50 bg-finance-bg'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center gap-0.5 overflow-hidden border border-black/10"
                  style={{ backgroundColor: t.swatches[2] }}
                >
                  <span className="w-3 h-6 rounded-sm" style={{ backgroundColor: t.swatches[0] }} />
                  <span className="w-3 h-4 rounded-sm" style={{ backgroundColor: t.swatches[1] }} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold truncate ${isActive ? 'text-finance-accent' : 'text-finance-text'}`}>
                    {t.label}
                  </p>
                  <p className="text-[11px] text-finance-muted truncate">{t.description}</p>
                </div>

                {isActive && <Check className="w-4 h-4 text-finance-accent flex-shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── AI Model Configuration ── */}
      <div className="glass-card rounded-2xl p-6 border border-finance-border space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-finance-accent/15 border border-finance-accent/30 flex items-center justify-center text-finance-accent">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-finance-text">
                Aura AI Advisory Engine
              </h3>
              <p className="text-xs text-finance-muted">Connect private OpenAI API key for GPT-4o portfolio reasoning</p>
            </div>
          </div>

          <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase flex items-center gap-1.5 ${
            aiStatus?.openAIConfigured
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${aiStatus?.openAIConfigured ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
            <span>{aiStatus?.openAIConfigured ? 'OpenAI Linked' : 'Deterministic Mode'}</span>
          </div>
        </div>

        {aiMsg && (
          <div className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 ${
            aiMsg.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-400'
          }`}>
            {aiMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
            <span>{aiMsg.text}</span>
          </div>
        )}

        <form onSubmit={handleSaveAIConfig} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-finance-muted mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-finance-accent" />
              <span>OpenAI API Key</span>
            </label>
            <input
              type="password"
              placeholder={aiStatus?.openAIConfigured ? "Key is securely stored (enter new to replace)" : "sk-..."}
              value={openAIKeyInput}
              onChange={(e) => setOpenAIKeyInput(e.target.value)}
              className="w-full px-4 py-2.5 bg-finance-bg border border-finance-border rounded-xl text-finance-text text-xs font-mono focus:outline-none focus:border-finance-accent"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              disabled={aiLoading || !openAIKeyInput.trim()}
              className="px-4 py-2 bg-finance-primary hover:opacity-90 text-finance-bg font-serif font-bold rounded-xl text-xs shadow-sm transition-all disabled:opacity-40"
            >
              {aiLoading ? 'Saving...' : 'Link OpenAI Key'}
            </button>

            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testingAi || (!aiStatus?.openAIConfigured && !openAIKeyInput.trim())}
              className="px-4 py-2 bg-finance-bg hover:bg-finance-surface text-finance-text border border-finance-border rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${testingAi ? 'animate-spin text-finance-accent' : ''}`} />
              <span>{testingAi ? 'Testing...' : 'Test Connection'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Security & Danger Zone */}
      <div className="glass-card rounded-2xl p-6 border border-finance-border space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-rose-500" />
          <h3 className="font-serif text-base font-bold text-finance-text">Vault Session Security</h3>
        </div>

        <button
          onClick={logout}
          className="px-5 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-400 border border-rose-500/30 font-bold rounded-xl text-xs transition-colors flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Lock Vault & Sign Out
        </button>
      </div>
    </div>
  );
};
