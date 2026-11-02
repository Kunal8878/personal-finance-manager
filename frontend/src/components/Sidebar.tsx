import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  PieChart,
  Target,
  TrendingUp,
  CreditCard,
  Repeat,
  FileBarChart,
  Settings,
  LogOut,
  Sparkles,
  Building2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useFinance } from '../context/FinanceContext';
import { BankSyncModal } from './modals/BankSyncModal';
import { AIChatDrawer } from './AIChatDrawer';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/transactions', label: 'Ledger & Currencies', icon: ArrowRightLeft },
  { path: '/accounts', label: 'Capital Accounts', icon: Wallet },
  { path: '/budgets', label: 'Budgets & Limits', icon: PieChart },
  { path: '/goals', label: 'Wealth Goals', icon: Target },
  { path: '/investments', label: 'Portfolio Assets', icon: TrendingUp },
  { path: '/loans', label: 'Credit & Liabilities', icon: CreditCard },
  { path: '/subscriptions', label: 'Retainers & Subs', icon: Repeat },
  { path: '/ai-advisor', label: 'Private AI Advisor', icon: Sparkles },
  { path: '/reports', label: 'Reports & Audits', icon: FileBarChart },
  { path: '/settings', label: 'Vault Settings', icon: Settings },
];

export const Sidebar: React.FC = () => {
  const { user, logout } = useAuth();
  const { isAIChatOpen, openAIChat, closeAIChat } = useFinance();
  const [bankSyncOpen, setBankSyncOpen] = useState(false);

  return (
    <>
      <aside className="hidden lg:flex flex-col w-64 border-r border-finance-border bg-finance-card h-screen sticky top-0 z-30 select-none">
        {/* Brand Header */}
        <div className="flex items-center justify-between px-6 h-20 border-b border-finance-border">
          <div>
            <div className="flex items-baseline gap-1">
              <span className="font-serif text-2xl font-bold tracking-tight text-finance-text lowercase">aura</span>
              <span className="w-1.5 h-1.5 rounded-full bg-finance-accent"></span>
            </div>
            <p className="text-[10px] tracking-widest text-finance-muted uppercase font-sans font-medium">Private Wealth</p>
          </div>
          <span className="px-2 py-0.5 rounded text-[9px] uppercase tracking-wider font-semibold border border-finance-border text-finance-accent bg-finance-bg">
            Vault
          </span>
        </div>

        {/* Bank Consent / Open Banking */}
        <div className="px-4 pt-4">
          <button
            onClick={() => setBankSyncOpen(true)}
            className="w-full p-2.5 rounded-xl bg-finance-bg hover:bg-finance-surface border border-finance-border text-finance-text text-xs font-medium flex items-center justify-center gap-2 transition-all shadow-sm"
          >
            <Building2 className="w-3.5 h-3.5 text-finance-accent" />
            <span>Open Banking (AA)</span>
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-finance-primary/10 text-finance-primary border border-finance-primary/20 font-semibold'
                      : 'text-finance-muted hover:text-finance-text hover:bg-finance-surface/50'
                  }`
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0 opacity-80" />
                <span className="tracking-tight">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* AI Advisor Trigger */}
        <div className="px-4 pb-3">
          <button
            onClick={openAIChat}
            className="w-full p-2.5 bg-finance-bg hover:bg-finance-surface text-finance-text text-xs font-medium rounded-xl border border-finance-border flex items-center justify-center gap-2 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-finance-accent" />
            <span>Aura Capital Intelligence</span>
          </button>
        </div>

        {/* User Footer */}
        <div className="p-4 border-t border-finance-border bg-finance-bg/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-finance-card border border-finance-border flex items-center justify-center font-serif font-bold text-finance-accent text-sm flex-shrink-0">
                {user?.name ? user.name[0].toUpperCase() : 'A'}
              </div>
              <div className="truncate">
                <p className="text-xs font-semibold text-finance-text truncate">{user?.name}</p>
                <p className="text-[10px] text-finance-muted truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-finance-muted hover:text-finance-rose hover:bg-finance-rose/10 transition-colors"
              title="Sign out of vault"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <BankSyncModal isOpen={bankSyncOpen} onClose={() => setBankSyncOpen(false)} />
      <AIChatDrawer isOpen={isAIChatOpen} onClose={closeAIChat} />
    </>
  );
};
