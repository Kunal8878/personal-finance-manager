import React from 'react';
import { useAuth } from '../context/AuthContext';

export interface CurrencyDisplayProps {
  amount: number;
  currency?: string;
  reportingAmount?: number;
  reportingCurrency?: string;
  showConversion?: boolean;
  className?: string;
  type?: 'INCOME' | 'EXPENSE' | 'NET_WORTH' | 'NEUTRAL' | 'DEBT';
  showSign?: boolean;
  hideValue?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const getCurrencySymbol = (code?: string): string => {
  switch ((code || 'INR').toUpperCase()) {
    case 'INR': return '₹';
    case 'USD': return '$';
    case 'EUR': return '€';
    case 'GBP': return '£';
    case 'AED': return 'AED ';
    case 'CAD': return 'C$';
    case 'AUD': return 'A$';
    case 'SGD': return 'S$';
    case 'JPY': return '¥';
    default: return `${code} `;
  }
};

export const formatCurrency = (amount: number, currencyCode: string = 'INR'): string => {
  const isINR = currencyCode.toUpperCase() === 'INR';
  return Math.abs(amount).toLocaleString(isINR ? 'en-IN' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const CurrencyDisplay: React.FC<CurrencyDisplayProps> = ({
  amount,
  currency,
  reportingAmount,
  reportingCurrency,
  showConversion = true,
  className = '',
  type = 'NEUTRAL',
  showSign = false,
  hideValue = false,
  size = 'md'
}) => {
  const { user } = useAuth();

  if (hideValue) {
    return <span className={`num-font tracking-widest text-finance-muted ${className}`}>••••••</span>;
  }

  // Active transaction currency or fall back to user's currency or INR
  const activeCurrency = (currency || user?.currency || 'INR').toUpperCase();
  const symbol = getCurrencySymbol(activeCurrency);

  const formattedAmount = Math.abs(amount).toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  let colorClass = 'text-finance-text';
  if (type === 'INCOME') colorClass = 'text-emerald-700 dark:text-emerald-400';
  if (type === 'EXPENSE' || type === 'DEBT') colorClass = 'text-rose-700 dark:text-rose-400';
  if (type === 'NET_WORTH') colorClass = amount >= 0 ? 'text-finance-text' : 'text-rose-700 dark:text-rose-400';

  const sign = showSign ? (amount > 0 ? '+' : amount < 0 ? '-' : '') : (amount < 0 ? '-' : '');

  // Secondary Conversion Display (e.g. when transaction is USD and user is in INR, or vice versa)
  const needsConversion =
    showConversion &&
    reportingCurrency &&
    reportingAmount !== undefined &&
    reportingCurrency.toUpperCase() !== activeCurrency;

  const repSymbol = reportingCurrency ? getCurrencySymbol(reportingCurrency) : '';
  const formattedReporting = reportingAmount !== undefined
    ? Math.abs(reportingAmount).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    : '';

  return (
    <span className={`inline-flex items-baseline gap-1.5 ${className}`}>
      <span className={`num-font font-medium ${colorClass}`}>
        {sign}{symbol}{formattedAmount}
        <span className="text-[10px] uppercase font-bold text-finance-muted ml-1 opacity-80">
          {activeCurrency}
        </span>
      </span>

      {needsConversion && (
        <span className="text-[11px] font-normal text-finance-muted tracking-tight">
          ≈ {repSymbol}{formattedReporting} {reportingCurrency}
        </span>
      )}
    </span>
  );
};
