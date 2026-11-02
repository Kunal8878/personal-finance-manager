import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { ThemeProvider } from './context/ThemeContext';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Navbar } from './components/Navbar';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Onboarding } from './pages/Onboarding';
import { Dashboard } from './pages/Dashboard';
import { AIAdvisorPage } from './pages/AIAdvisorPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { AccountsPage } from './pages/AccountsPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { GoalsPage } from './pages/GoalsPage';
import { InvestmentsPage } from './pages/InvestmentsPage';
import { LoansPage } from './pages/LoansPage';
import { SubscriptionsPage } from './pages/SubscriptionsPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5000,
      refetchOnWindowFocus: true
    }
  }
});

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-finance-bg flex items-center justify-center text-finance-primary text-sm font-serif italic animate-pulse">
        Unlocking private wealth vault...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const getPageTitle = (path: string) => {
    switch (path) {
      case '/dashboard': return 'Private Wealth Overview';
      case '/ai-advisor': return 'Aura Capital Intelligence';
      case '/transactions': return 'Multi-Currency Ledger';
      case '/accounts': return 'Asset & Depository Accounts';
      case '/budgets': return 'Discretionary Budgets';
      case '/goals': return 'Wealth Accumulation Goals';
      case '/investments': return 'Capital Investment Portfolio';
      case '/loans': return 'Debt & Credit Obligations';
      case '/subscriptions': return 'Recurring Retainers';
      case '/reports': return 'Consolidated Financial Statements';
      case '/settings': return 'Vault & Currency Settings';
      default: return 'Aura Finance';
    }
  };

  return (
    <FinanceProvider>
      <div className="flex min-h-screen bg-finance-bg text-finance-text font-sans">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Navbar title={getPageTitle(location.pathname)} />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
        <MobileNav />
      </div>
    </FinanceProvider>
  );
};

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/onboarding" element={<Onboarding />} />

            <Route path="/" element={<ProtectedLayout><Navigate to="/dashboard" replace /></ProtectedLayout>} />
            <Route path="/dashboard" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
            <Route path="/ai-advisor" element={<ProtectedLayout><AIAdvisorPage /></ProtectedLayout>} />
            <Route path="/transactions" element={<ProtectedLayout><TransactionsPage /></ProtectedLayout>} />
            <Route path="/accounts" element={<ProtectedLayout><AccountsPage /></ProtectedLayout>} />
            <Route path="/budgets" element={<ProtectedLayout><BudgetsPage /></ProtectedLayout>} />
            <Route path="/goals" element={<ProtectedLayout><GoalsPage /></ProtectedLayout>} />
            <Route path="/investments" element={<ProtectedLayout><InvestmentsPage /></ProtectedLayout>} />
            <Route path="/loans" element={<ProtectedLayout><LoansPage /></ProtectedLayout>} />
            <Route path="/subscriptions" element={<ProtectedLayout><SubscriptionsPage /></ProtectedLayout>} />
            <Route path="/reports" element={<ProtectedLayout><ReportsPage /></ProtectedLayout>} />
            <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
