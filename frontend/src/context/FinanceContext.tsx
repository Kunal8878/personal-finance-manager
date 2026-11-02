import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { Account, Category, DashboardSummary } from '../types';
import { apiFetch } from '../services/api';
import { useAuth } from './AuthContext';
import { getCurrencySymbol } from '../components/CurrencyDisplay';

interface FinanceContextType {
  accounts: Account[];
  categories: Category[];
  summary: DashboardSummary | null;
  loading: boolean;
  reportingCurrency: string;
  reportingSymbol: string;
  setReportingCurrency: (curr: string) => Promise<void>;
  hideBalances: boolean;
  toggleHideBalances: () => void;
  isAIChatOpen: boolean;
  openAIChat: () => void;
  closeAIChat: () => void;
  toggleAIChat: () => void;
  refreshFinanceData: () => Promise<void>;
  lastRealtimeSync: Date | null;
}

const FinanceContext = createContext<FinanceContextType>({} as FinanceContextType);

const CURRENCY_STORAGE_KEY = 'aura_reporting_currency';
const HIDE_BALANCES_KEY = 'aura_hide_balances';

export const FinanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [isAIChatOpen, setIsAIChatOpen] = useState(false);
  const [lastRealtimeSync, setLastRealtimeSync] = useState<Date | null>(null);

  const [reportingCurrency, setReportingCurrencyState] = useState<string>(() => {
    return localStorage.getItem(CURRENCY_STORAGE_KEY) || user?.currency || 'INR';
  });

  const [hideBalances, setHideBalances] = useState<boolean>(() => {
    return localStorage.getItem(HIDE_BALANCES_KEY) === 'true';
  });

  const sseRef = useRef<EventSource | null>(null);

  const toggleHideBalances = () => {
    setHideBalances((prev) => {
      const next = !prev;
      localStorage.setItem(HIDE_BALANCES_KEY, String(next));
      return next;
    });
  };

  const setReportingCurrency = async (curr: string) => {
    const clean = curr.toUpperCase();
    setReportingCurrencyState(clean);
    localStorage.setItem(CURRENCY_STORAGE_KEY, clean);

    // Update in backend preference
    await apiFetch('/users/currency', {
      method: 'PUT',
      body: JSON.stringify({ currency: clean })
    });

    // Immediately refresh dashboard with newly converted metrics
    await refreshFinanceData(clean);
  };

  const openAIChat = () => setIsAIChatOpen(true);
  const closeAIChat = () => setIsAIChatOpen(false);
  const toggleAIChat = () => setIsAIChatOpen((prev) => !prev);

  const refreshFinanceData = useCallback(async (customCurrency?: string) => {
    if (!user) return;
    const curr = customCurrency || reportingCurrency;
    setLoading(true);

    try {
      const [accRes, catRes, sumRes] = await Promise.all([
        apiFetch<{ accounts: Account[] }>('/accounts'),
        apiFetch<{ categories: Category[] }>('/categories'),
        apiFetch<DashboardSummary>(`/reports/summary?currency=${curr}`)
      ]);

      if (accRes.success && accRes.data) setAccounts(accRes.data.accounts || []);
      if (catRes.success && catRes.data) setCategories(catRes.data.categories || []);
      if (sumRes.success && sumRes.data) setSummary(sumRes.data);
      setLastRealtimeSync(new Date());
    } catch (err) {
      console.error('[FinanceContext Error]', err);
    } finally {
      setLoading(false);
    }
  }, [user, reportingCurrency]);

  // Initial load
  useEffect(() => {
    if (user) {
      refreshFinanceData();
    } else {
      setAccounts([]);
      setCategories([]);
      setSummary(null);
    }
  }, [user, refreshFinanceData]);

  // Real-Time Server-Sent Events (SSE) Listener
  useEffect(() => {
    if (!user) {
      if (sseRef.current) {
        sseRef.current.close();
        sseRef.current = null;
      }
      return;
    }

    const token = localStorage.getItem('finance_token');
    if (!token) return;

    const apiBase = import.meta.env.VITE_API_BASE || 'http://localhost:5001/api';
    const sseUrl = `${apiBase}/stream?token=${encodeURIComponent(token)}`;

    const eventSource = new EventSource(sseUrl);
    sseRef.current = eventSource;

    eventSource.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data);
        if (
          payload.type === 'TRANSACTION_CREATED' ||
          payload.type === 'TRANSACTION_UPDATED' ||
          payload.type === 'TRANSACTION_DELETED' ||
          payload.type === 'ACCOUNT_UPDATED' ||
          payload.type === 'SEED_COMPLETED'
        ) {
          // Immediately trigger recalculation of dashboard and transaction data
          refreshFinanceData();
        }
      } catch {
        // Heartbeat or raw message
      }
    };

    eventSource.onerror = () => {
      // Graceful fallback to background interval if SSE is disrupted
      eventSource.close();
      sseRef.current = null;
    };

    return () => {
      eventSource.close();
      sseRef.current = null;
    };
  }, [user, refreshFinanceData]);

  const reportingSymbol = getCurrencySymbol(reportingCurrency);

  return (
    <FinanceContext.Provider
      value={{
        accounts,
        categories,
        summary,
        loading,
        reportingCurrency,
        reportingSymbol,
        setReportingCurrency,
        hideBalances,
        toggleHideBalances,
        isAIChatOpen,
        openAIChat,
        closeAIChat,
        toggleAIChat,
        refreshFinanceData,
        lastRealtimeSync
      }}
    >
      {children}
    </FinanceContext.Provider>
  );
};

export const useFinance = () => useContext(FinanceContext);
