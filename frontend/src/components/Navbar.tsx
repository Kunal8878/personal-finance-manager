import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  Search,
  Eye,
  EyeOff,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Link, useNavigate } from 'react-router-dom';

interface NavbarProps {
  title: string;
}

export const Navbar: React.FC<NavbarProps> = ({ title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const {
    reportingCurrency,
    setReportingCurrency,
    hideBalances,
    toggleHideBalances,
    openAIChat,
    refreshFinanceData,
    loading
  } = useFinance();

  const [profileOpen, setProfileOpen] = useState(false);
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const profileRef = useRef<HTMLDivElement>(null);
  const currencyRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) {
        setCurrencyDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Time-based personalized greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const formattedDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  const CURRENCIES = [
    { code: 'INR', symbol: '₹', label: 'INR (₹) — Indian Rupee' },
    { code: 'USD', symbol: '$', label: 'USD ($) — US Dollar' },
    { code: 'EUR', symbol: '€', label: 'EUR (€) — Euro' },
    { code: 'GBP', symbol: '£', label: 'GBP (£) — British Pound' }
  ];

  return (
    <header className="h-20 border-b border-finance-border bg-finance-card/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Left Column: Greeting & Date */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-2">
          <h2 className="font-serif text-lg sm:text-xl font-bold tracking-tight text-finance-text">
            {getGreeting()}, <span className="italic font-normal">{user?.name ? user.name.split(' ')[0] : 'Client'}</span>
          </h2>
          <span className="hidden xl:inline-block text-finance-border font-serif">/</span>
          <span className="hidden xl:inline-block text-xs font-sans text-finance-muted font-normal">
            {title}
          </span>
        </div>
        <p className="text-[11px] font-sans text-finance-muted tracking-tight">
          {formattedDate} • <span className="text-finance-accent font-medium">Private Wealth Reserve</span>
        </p>
      </div>

      {/* Right Column: Controls, Currency, Theme, Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Refresh / Sync Indicator */}
        <button
          onClick={() => refreshFinanceData()}
          disabled={loading}
          className="p-2 rounded-xl text-finance-muted hover:text-finance-text hover:bg-finance-bg border border-transparent hover:border-finance-border transition-all"
          title="Refresh vault data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-finance-accent' : ''}`} />
        </button>

        {/* Show/Hide Sensitive Balances Toggle */}
        <button
          onClick={toggleHideBalances}
          className={`p-2 rounded-xl border transition-all ${
            hideBalances
              ? 'bg-finance-accent/15 border-finance-accent text-finance-accent'
              : 'text-finance-muted hover:text-finance-text hover:bg-finance-bg border-finance-border'
          }`}
          title={hideBalances ? 'Show sensitive balances' : 'Hide sensitive balances'}
          aria-label="Toggle balance privacy"
        >
          {hideBalances ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>

        {/* Currency Display Preference Dropdown */}
        <div ref={currencyRef} className="relative">
          <button
            onClick={() => setCurrencyDropdownOpen((prev) => !prev)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-finance-border bg-finance-bg hover:bg-finance-surface text-finance-text text-xs font-medium transition-all"
            title="Consolidated reporting currency preference"
          >
            <span className="font-serif text-finance-accent font-bold">
              {reportingCurrency === 'INR' ? '₹' : reportingCurrency === 'USD' ? '$' : reportingCurrency === 'EUR' ? '€' : '£'}
            </span>
            <span className="num-font text-[11px] font-semibold tracking-wider">{reportingCurrency}</span>
            <ChevronDown className="w-3 h-3 text-finance-muted opacity-70" />
          </button>

          {currencyDropdownOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-finance-border bg-finance-card shadow-2xl p-1.5 z-50 animate-fadeIn">
              <div className="px-3 py-2 border-b border-finance-border/60">
                <p className="text-[10px] font-bold uppercase tracking-wider text-finance-muted">Reporting Currency</p>
                <p className="text-[10px] text-finance-muted">Consolidated dashboard values</p>
              </div>
              <div className="py-1">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => {
                      setReportingCurrency(c.code);
                      setCurrencyDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl transition-all ${
                      reportingCurrency === c.code
                        ? 'bg-finance-primary/10 text-finance-primary font-bold'
                        : 'text-finance-text hover:bg-finance-bg'
                    }`}
                  >
                    <span>{c.label}</span>
                    {reportingCurrency === c.code && <span className="text-finance-accent font-bold">✓</span>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications Popover */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotificationsOpen((prev) => !prev)}
            className="p-2 rounded-xl border border-finance-border bg-finance-bg hover:bg-finance-surface text-finance-muted hover:text-finance-text transition-all relative"
            title="Portfolio alerts & notifications"
          >
            <Bell className="w-3.5 h-3.5" />
            <span className="w-1.5 h-1.5 rounded-full bg-finance-accent absolute top-1.5 right-1.5 animate-pulse"></span>
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-finance-border bg-finance-card shadow-2xl p-3 z-50 animate-fadeIn">
              <div className="flex items-center justify-between pb-2 border-b border-finance-border/60">
                <p className="text-xs font-bold text-finance-text">Vault Notifications</p>
                <span className="text-[10px] text-finance-accent font-semibold uppercase tracking-wider">Live</span>
              </div>
              <div className="py-2 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-finance-bg border border-finance-border/50">
                  <p className="font-semibold text-finance-text text-[11px]">Multi-Currency Sync Complete</p>
                  <p className="text-[10px] text-finance-muted">USD and INR exchange rates locked with real-time audit trail.</p>
                </div>
                <div className="p-2.5 rounded-xl bg-finance-bg border border-finance-border/50">
                  <p className="font-semibold text-finance-text text-[11px]">Real-Time SSE Stream Active</p>
                  <p className="text-[10px] text-finance-muted">Continuous transaction synchronization across sessions.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme Selector (Light & Dark) */}
        <ThemeSwitcher variant="compact" />

        {/* Profile Avatar & Dropdown */}
        <div ref={profileRef} className="relative">
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-2 p-1 pl-2 pr-1.5 rounded-xl border border-finance-border bg-finance-bg hover:bg-finance-surface transition-all"
          >
            <div className="w-6 h-6 rounded-full bg-finance-card border border-finance-border flex items-center justify-center font-serif font-bold text-finance-accent text-xs">
              {user?.name ? user.name[0].toUpperCase() : 'A'}
            </div>
            <span className="hidden md:inline-block text-xs font-medium text-finance-text max-w-[90px] truncate">
              {user?.name ? user.name.split(' ')[0] : 'Profile'}
            </span>
            <ChevronDown className="w-3 h-3 text-finance-muted" />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-finance-border bg-finance-card shadow-2xl p-2 z-50 animate-fadeIn">
              <div className="px-3 py-2 border-b border-finance-border/60">
                <p className="text-xs font-bold text-finance-text truncate">{user?.name}</p>
                <p className="text-[10px] text-finance-muted truncate">{user?.email}</p>
              </div>
              <div className="py-1">
                <button
                  onClick={() => {
                    navigate('/settings');
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-finance-text hover:bg-finance-bg rounded-xl transition-all"
                >
                  <Settings className="w-3.5 h-3.5 text-finance-muted" />
                  <span>Vault & Currency Settings</span>
                </button>
                <button
                  onClick={() => {
                    openAIChat();
                    setProfileOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-finance-text hover:bg-finance-bg rounded-xl transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 text-finance-accent" />
                  <span>Aura Capital Intelligence</span>
                </button>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-500/10 rounded-xl transition-all mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Lock & Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
