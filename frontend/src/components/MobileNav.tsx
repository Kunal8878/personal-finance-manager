import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Wallet,
  PieChart,
  Settings
} from 'lucide-react';

const MOBILE_NAV_ITEMS = [
  { path: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { path: '/transactions', label: 'Ledger', icon: ArrowRightLeft },
  { path: '/accounts', label: 'Accounts', icon: Wallet },
  { path: '/budgets', label: 'Budgets', icon: PieChart },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export const MobileNav: React.FC = () => {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-finance-card/95 backdrop-blur-md border-t border-finance-border px-4 py-2 flex justify-around items-center shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
      {MOBILE_NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-1 px-3 rounded-lg text-[10px] tracking-wide transition-colors ${
                isActive
                  ? 'text-finance-accent font-semibold'
                  : 'text-finance-muted hover:text-finance-text'
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </div>
  );
};
