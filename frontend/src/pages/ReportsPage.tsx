import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import { FileBarChart, Download, TrendingUp, TrendingDown, Calendar, Layers, ShieldCheck } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useFinance } from '../context/FinanceContext';
import { getCurrencySymbol, formatCurrency } from '../components/CurrencyDisplay';

export const ReportsPage: React.FC = () => {
  const { reportingCurrency, summary } = useFinance();
  const [cashFlow, setCashFlow] = useState<Array<{ month: string; income: number; expense: number; net?: number }>>([]);
  const [loading, setLoading] = useState(false);
  const symbol = getCurrencySymbol(reportingCurrency);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const res = await apiFetch<{ cashFlow: any[] }>(`/reports/cashflow?currency=${reportingCurrency}`);
      setLoading(false);
      if (res.success && res.data && res.data.cashFlow) {
        const enriched = res.data.cashFlow.map(item => ({
          ...item,
          net: (item.income || 0) - (item.expense || 0)
        }));
        setCashFlow(enriched);
      }
    }
    loadData();
  }, [reportingCurrency]);

  const handleExportPDF = () => {
    window.open(`/api/reports/export/pdf?currency=${reportingCurrency}`, '_blank');
  };

  const totalPeriodIncome = cashFlow.reduce((acc, curr) => acc + (curr.income || 0), 0);
  const totalPeriodExpense = cashFlow.reduce((acc, curr) => acc + (curr.expense || 0), 0);
  const netSurplus = totalPeriodIncome - totalPeriodExpense;

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto pb-24 lg:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-finance-border/60 pb-6">
        <div>
          <span className="text-[11px] font-medium tracking-widest text-finance-accent uppercase">
            Audited Analytics
          </span>
          <h2 className="text-2xl md:text-3xl font-serif text-finance-text mt-1">
            Financial Performance & Reports
          </h2>
          <p className="text-xs text-finance-muted mt-1">
            Multi-currency cash flow consolidation, surplus analysis, and downloadable statements
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2.5 bg-finance-primary text-finance-bg hover:opacity-95 font-medium text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Download className="w-4 h-4" /> Export Statement (PDF)
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-finance-card rounded-2xl p-6 border border-finance-border shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-finance-muted text-xs font-medium">
            <span>Period Consolidated Inflow</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="text-2xl font-serif text-finance-text num-font mt-2">
            {symbol}{formatCurrency(totalPeriodIncome, reportingCurrency)}
          </div>
          <span className="text-[11px] text-finance-muted">In {reportingCurrency}</span>
        </div>

        <div className="bg-finance-card rounded-2xl p-6 border border-finance-border shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-finance-muted text-xs font-medium">
            <span>Period Consolidated Outflow</span>
            <TrendingDown className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-serif text-finance-text num-font mt-2">
            {symbol}{formatCurrency(totalPeriodExpense, reportingCurrency)}
          </div>
          <span className="text-[11px] text-finance-muted">In {reportingCurrency}</span>
        </div>

        <div className="bg-finance-card rounded-2xl p-6 border border-finance-border shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between text-finance-muted text-xs font-medium">
            <span>Net Operating Cash Flow</span>
            <ShieldCheck className="w-4 h-4 text-finance-accent" />
          </div>
          <div className={`text-2xl font-serif num-font mt-2 ${netSurplus >= 0 ? 'text-finance-primary' : 'text-rose-500'}`}>
            {netSurplus >= 0 ? '+' : ''}{symbol}{formatCurrency(netSurplus, reportingCurrency)}
          </div>
          <span className="text-[11px] text-finance-muted">
            {netSurplus >= 0 ? 'Capital Accumulation' : 'Capital Drawdown'}
          </span>
        </div>
      </div>

      {/* Cash Flow Bar Chart */}
      <div className="bg-finance-card rounded-2xl p-6 border border-finance-border shadow-[0_1px_3px_rgba(0,0,0,0.05)] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-finance-border/60">
          <div>
            <span className="text-[11px] font-medium tracking-wider text-finance-accent uppercase">Comparative Volume</span>
            <h3 className="text-base font-serif text-finance-text flex items-center gap-2 mt-0.5">
              <FileBarChart className="w-4 h-4 text-finance-accent" /> Monthly Inflow vs Outflow ({reportingCurrency})
            </h3>
          </div>
        </div>

        {loading ? (
          <div className="h-72 flex items-center justify-center text-xs text-finance-muted animate-pulse">
            Consolidating multi-currency records...
          </div>
        ) : (
          <div className="h-80 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cashFlow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-finance-border opacity-40" vertical={false} />
                <XAxis dataKey="month" stroke="currentColor" className="text-finance-muted" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="currentColor"
                  className="text-finance-muted"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => `${symbol}${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--color-finance-card)',
                    borderColor: 'var(--color-finance-border)',
                    borderRadius: '12px',
                    color: 'var(--color-finance-text)',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                  formatter={(val: any) => [`${symbol}${formatCurrency(Number(val), reportingCurrency)}`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="income" name="Inflow (Revenue)" fill="#183D32" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Outflow (Expenditure)" fill="#C5AD7B" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Cash Flow Table */}
      <div className="bg-finance-card rounded-2xl p-6 border border-finance-border shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <h3 className="text-base font-serif text-finance-text mb-4">Detailed Monthly Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-finance-border/70 text-finance-muted">
                <th className="pb-3 font-medium uppercase tracking-wider">Statement Period</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-right">Inflow ({reportingCurrency})</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-right">Outflow ({reportingCurrency})</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-right">Net Flow</th>
                <th className="pb-3 font-medium uppercase tracking-wider text-right">Savings Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-finance-border/40">
              {cashFlow.map((cf, idx) => {
                const sRate = cf.income > 0 ? Math.max(0, ((cf.income - cf.expense) / cf.income) * 100) : 0;
                return (
                  <tr key={idx} className="hover:bg-finance-elevated/40 transition-colors">
                    <td className="py-3 font-medium text-finance-text">{cf.month}</td>
                    <td className="py-3 text-right font-medium num-font text-emerald-600 dark:text-emerald-400">
                      +{symbol}{formatCurrency(cf.income, reportingCurrency)}
                    </td>
                    <td className="py-3 text-right font-medium num-font text-finance-text">
                      -{symbol}{formatCurrency(cf.expense, reportingCurrency)}
                    </td>
                    <td className={`py-3 text-right font-medium num-font ${(cf.net || 0) >= 0 ? 'text-finance-primary' : 'text-rose-500'}`}>
                      {(cf.net || 0) >= 0 ? '+' : ''}{symbol}{formatCurrency(cf.net || 0, reportingCurrency)}
                    </td>
                    <td className="py-3 text-right font-medium num-font text-finance-accent">
                      {sRate.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
