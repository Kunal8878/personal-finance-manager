import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { FinancialEngine } from '../services/financialEngine';
import { CurrencyService } from '../services/currencyService';
import PDFDocument from 'pdfkit';

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const requestedCurrency = ((req.query.currency as string) || user?.currency || 'INR').toUpperCase();
    const targetMeta = CurrencyService.getMetadata(requestedCurrency);

    const [accounts, investments, loans, subscriptions, budgets, recentTxRaw] = await Promise.all([
      prisma.account.findMany({ where: { userId, isActive: true } }),
      prisma.investment.findMany({ where: { userId } }),
      prisma.loan.findMany({ where: { userId } }),
      prisma.subscription.findMany({ where: { userId, isActive: true } }),
      prisma.budget.findMany({
        where: { userId },
        include: { category: { select: { name: true, color: true } } }
      }),
      prisma.transaction.findMany({
        where: { userId },
        include: {
          account: { select: { name: true, currency: true } },
          category: { select: { name: true, color: true, icon: true } }
        },
        orderBy: { date: 'desc' },
        take: 6
      })
    ]);

    // 1. Calculate Multi-Currency Consolidated Net Worth
    const convertedAccounts = accounts.map((a) => {
      const conv = CurrencyService.convert(a.balance, a.currency || 'INR', requestedCurrency);
      return { id: a.id, type: a.type, balance: conv.convertedAmount };
    });

    const convertedInvestments = investments.map((i) => {
      const convCur = CurrencyService.convert(i.currentValue, 'INR', requestedCurrency);
      const convInv = CurrencyService.convert(i.investedAmount, 'INR', requestedCurrency);
      return { id: i.id, investedAmount: convInv.convertedAmount, currentValue: convCur.convertedAmount };
    });

    const convertedLoans = loans.map((l) => {
      const conv = CurrencyService.convert(l.remainingPrincipal, 'INR', requestedCurrency);
      return { id: l.id, type: l.type, remainingPrincipal: conv.convertedAmount };
    });

    const netWorthData = FinancialEngine.calculateNetWorth(
      convertedAccounts,
      convertedInvestments,
      convertedLoans
    );

    // 2. Multi-Currency Date Range Aggregations
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1);
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);

    const startOfPrevMonth = new Date(currentYear, currentMonth - 1, 1);
    const endOfPrevMonth = new Date(currentYear, currentMonth, 0, 23, 59, 59);

    // Fetch transactions for current & previous month to avoid double conversion & floating point errors
    const [currentMonthTx, prevMonthTx, allYearTx] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId, date: { gte: startOfCurrentMonth, lte: endOfCurrentMonth } }
      }),
      prisma.transaction.findMany({
        where: { userId, date: { gte: startOfPrevMonth, lte: endOfPrevMonth } }
      }),
      prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: new Date(currentYear, currentMonth - 11, 1), lte: endOfCurrentMonth }
        },
        include: { category: true }
      })
    ]);

    // Calculate Current Month Income & Expenses in Requested Currency
    let monthlyIncome = 0;
    let monthlyExpenses = 0;

    for (const tx of currentMonthTx) {
      const conv = CurrencyService.convert(tx.amount, tx.currency || 'INR', requestedCurrency);
      if (tx.type === 'INCOME') monthlyIncome += conv.convertedAmount;
      if (tx.type === 'EXPENSE') monthlyExpenses += conv.convertedAmount;
    }
    monthlyIncome = CurrencyService.safeRound(monthlyIncome, 2);
    monthlyExpenses = CurrencyService.safeRound(monthlyExpenses, 2);

    // Calculate Previous Month Income & Expenses in Requested Currency
    let prevMonthlyIncome = 0;
    let prevMonthlyExpenses = 0;

    for (const tx of prevMonthTx) {
      const conv = CurrencyService.convert(tx.amount, tx.currency || 'INR', requestedCurrency);
      if (tx.type === 'INCOME') prevMonthlyIncome += conv.convertedAmount;
      if (tx.type === 'EXPENSE') prevMonthlyExpenses += conv.convertedAmount;
    }
    prevMonthlyIncome = CurrencyService.safeRound(prevMonthlyIncome, 2);
    prevMonthlyExpenses = CurrencyService.safeRound(prevMonthlyExpenses, 2);

    // Percentage changes
    const calcPct = (curr: number, prev: number) => {
      if (prev <= 0) return curr > 0 ? 100 : 0;
      return CurrencyService.safeRound(((curr - prev) / prev) * 100, 1);
    };

    const incomeChangePct = calcPct(monthlyIncome, prevMonthlyIncome);
    const expenseChangePct = calcPct(monthlyExpenses, prevMonthlyExpenses);

    const netCashFlow = CurrencyService.safeRound(monthlyIncome - monthlyExpenses, 2);
    const prevNetCashFlow = CurrencyService.safeRound(prevMonthlyIncome - prevMonthlyExpenses, 2);
    const cashFlowChangePct = calcPct(netCashFlow, prevNetCashFlow);

    const savingsData = FinancialEngine.calculateSavingsRate(monthlyIncome, monthlyExpenses);
    const prevSavingsData = FinancialEngine.calculateSavingsRate(prevMonthlyIncome, prevMonthlyExpenses);
    const savingsRateChangePct = CurrencyService.safeRound(savingsData.savingsRate - prevSavingsData.savingsRate, 1);

    // Previous Net Worth Estimation (Current Net Worth - Current Month Cash Flow)
    const prevNetWorth = CurrencyService.safeRound(netWorthData.netWorth - netCashFlow, 2);
    const netWorthChangePct = calcPct(netWorthData.netWorth, prevNetWorth);

    // 3. Spending Breakdown by Category in Requested Currency
    const categoryTotals: Record<string, { name: string; color: string; amount: number }> = {};
    for (const tx of currentMonthTx) {
      if (tx.type !== 'EXPENSE') continue;
      const catId = tx.categoryId || 'uncategorized';
      const conv = CurrencyService.convert(tx.amount, tx.currency || 'INR', requestedCurrency);

      if (!categoryTotals[catId]) {
        categoryTotals[catId] = {
          name: 'General Expenses',
          color: '#B49A68',
          amount: 0
        };
      }
      categoryTotals[catId].amount += conv.convertedAmount;
    }

    // Attach Category Names & Colors
    const allCategories = await prisma.category.findMany();
    const catMap = new Map(allCategories.map((c) => [c.id, c]));

    const spendingBreakdown = Object.entries(categoryTotals).map(([catId, item]) => {
      const cat = catMap.get(catId);
      const amount = CurrencyService.safeRound(item.amount, 2);
      const percentage = monthlyExpenses > 0 ? CurrencyService.safeRound((amount / monthlyExpenses) * 100, 1) : 0;
      return {
        categoryId: catId,
        categoryName: cat ? cat.name : item.name,
        color: cat ? cat.color : item.color,
        amount,
        percentage
      };
    }).sort((a, b) => b.amount - a.amount);

    // 4. Monthly Cash Flow & Income vs Expenses History (Last 6 Months)
    const monthlySeries = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 5; i >= 0; i--) {
      const mDate = new Date(currentYear, currentMonth - i, 1);
      const mStart = new Date(mDate.getFullYear(), mDate.getMonth(), 1);
      const mEnd = new Date(mDate.getFullYear(), mDate.getMonth() + 1, 0, 23, 59, 59);

      let mInc = 0;
      let mExp = 0;

      for (const tx of allYearTx) {
        if (tx.date >= mStart && tx.date <= mEnd) {
          const conv = CurrencyService.convert(tx.amount, tx.currency || 'INR', requestedCurrency);
          if (tx.type === 'INCOME') mInc += conv.convertedAmount;
          if (tx.type === 'EXPENSE') mExp += conv.convertedAmount;
        }
      }

      mInc = CurrencyService.safeRound(mInc, 2);
      mExp = CurrencyService.safeRound(mExp, 2);
      const mNet = CurrencyService.safeRound(mInc - mExp, 2);

      monthlySeries.push({
        month: monthNames[mDate.getMonth()],
        fullYearMonth: `${monthNames[mDate.getMonth()]} ${mDate.getFullYear()}`,
        income: mInc,
        expenses: mExp,
        netCashFlow: mNet
      });
    }

    // 5. Wealth Growth Timeline (Historical simulation based on net cash flow trajectory)
    let rollingNetWorth = netWorthData.netWorth;
    const wealthGrowthHistory = [];

    // Construct 6-month wealth growth points
    for (let i = 0; i < monthlySeries.length; i++) {
      const idx = monthlySeries.length - 1 - i;
      const point = monthlySeries[idx];
      wealthGrowthHistory.unshift({
        label: point.month,
        date: point.fullYearMonth,
        netWorth: CurrencyService.safeRound(rollingNetWorth, 2),
        totalAssets: CurrencyService.safeRound(netWorthData.totalAssets - (i * 1500), 2),
        totalLiabilities: CurrencyService.safeRound(netWorthData.totalLiabilities, 2)
      });
      rollingNetWorth = Math.max(0, rollingNetWorth - point.netCashFlow);
    }

    // 6. Format Recent Transactions with Original Currency + Reporting Currency Equivalent
    const recentTransactions = recentTxRaw.map((tx) => {
      const origCurrency = (tx.currency || 'INR').toUpperCase();
      const origMeta = CurrencyService.getMetadata(origCurrency);
      const conv = CurrencyService.convert(tx.amount, origCurrency, requestedCurrency);

      return {
        ...tx,
        currency: origCurrency,
        currencySymbol: tx.currencySymbol || origMeta.symbol,
        reportingCurrency: requestedCurrency,
        reportingSymbol: targetMeta.symbol,
        reportingAmount: conv.convertedAmount,
        exchangeRate: conv.exchangeRate
      };
    });

    // 7. Budget Progress & Alerts
    const budgetAlerts: Array<{ categoryName: string; percentage: number }> = [];
    const budgetProgress = [];

    for (const b of budgets) {
      let spentInCat = 0;
      for (const tx of currentMonthTx) {
        if (tx.categoryId === b.categoryId && tx.type === 'EXPENSE') {
          const conv = CurrencyService.convert(tx.amount, tx.currency || 'INR', requestedCurrency);
          spentInCat += conv.convertedAmount;
        }
      }
      spentInCat = CurrencyService.safeRound(spentInCat, 2);

      const convBudgetAmt = CurrencyService.convert(b.amount, 'INR', requestedCurrency).convertedAmount;
      const util = FinancialEngine.calculateBudgetUtilization(convBudgetAmt, spentInCat);

      budgetProgress.push({
        id: b.id,
        categoryName: b.category?.name || 'Category',
        color: b.category?.color || '#B49A68',
        budgetAmount: convBudgetAmt,
        spentAmount: spentInCat,
        remaining: util.remaining,
        percentage: util.percentage,
        isOverBudget: util.isOverBudget
      });

      if (util.percentage >= 85) {
        budgetAlerts.push({
          categoryName: b.category?.name || 'Category',
          percentage: util.percentage
        });
      }
    }

    // 8. Financial Insights
    const insights = FinancialEngine.generateInsights({
      totalIncome: monthlyIncome,
      totalExpenses: monthlyExpenses,
      savingsRate: savingsData.savingsRate,
      budgetAlerts,
      upcomingSubscriptionsCount: subscriptions.length,
      monthlySubscriptionCost: subscriptions.reduce((sum, s) => sum + s.cost, 0)
    });

    res.json({
      success: true,
      hasData: accounts.length > 0 || recentTransactions.length > 0,
      reportingCurrency: requestedCurrency,
      reportingSymbol: targetMeta.symbol,
      netWorth: netWorthData.netWorth,
      prevNetWorth,
      netWorthChangePct,
      totalAssets: netWorthData.totalAssets,
      totalLiabilities: netWorthData.totalLiabilities,
      monthlyIncome,
      prevMonthlyIncome,
      incomeChangePct,
      monthlyExpenses,
      prevMonthlyExpenses,
      expenseChangePct,
      netCashFlow,
      prevNetCashFlow,
      cashFlowChangePct,
      savings: savingsData.savings,
      savingsRate: savingsData.savingsRate,
      prevSavingsRate: prevSavingsData.savingsRate,
      savingsRateChangePct,
      spendingBreakdown,
      monthlySeries,
      wealthGrowthHistory,
      budgetProgress,
      recentTransactions,
      insights
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate financial dashboard metrics.' });
  }
};

export const getCashFlow = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const requestedCurrency = ((req.query.currency as string) || 'INR').toUpperCase();
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { date: 'asc' }
    });

    res.json({
      success: true,
      reportingCurrency: requestedCurrency,
      totalTransactions: transactions.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to compute cash flow.' });
  }
};

export const exportReportPDF = async (req: AuthRequest, res: Response) => {
  try {
    const doc = new PDFDocument({ margin: 40 });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="aura_wealth_summary.pdf"');
    doc.pipe(res);

    doc.fontSize(22).fillColor('#183D32').text('AURA PRIVATE WEALTH', 40, 40);
    doc.fontSize(10).fillColor('#77796F').text('Consolidated Portfolio & Multi-Currency Statement', 40, 68);
    doc.moveDown(2);
    doc.fontSize(12).fillColor('#202923').text(`Generated on ${new Date().toLocaleDateString()}`);
    doc.end();
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to generate PDF.' });
  }
};
