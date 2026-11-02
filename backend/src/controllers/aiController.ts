/**
 * AI Controller
 * 
 * Security guarantees:
 * - userId is ALWAYS derived from the server-side JWT, never from request body/query
 * - Users can only access their own financial data
 * - Conversation history is scoped to the authenticated user
 * - Input size limits enforced
 * - Rate limiting applied via express-rate-limit at router level
 */

import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { AIAdvisorService, UserFinancialSnapshot, ConversationMessage, calculateFinancialMetrics } from '../services/aiAdvisor';
import { FinancialEngine } from '../services/financialEngine';

const MAX_MESSAGE_LENGTH = 2000;
const HISTORY_CONTEXT_LIMIT = 10;

// ─── Build full financial snapshot for authenticated user ─────────────────────

async function buildUserSnapshot(userId: string, currency: string): Promise<UserFinancialSnapshot> {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

  try {
    const [
      accounts,
      investments,
      loans,
      subscriptions,
      budgets,
      incResult,
      expResult,
      lastMonthInc,
      lastMonthExp,
      categoryAggs,
      goals,
      recentTxs
    ] = await Promise.all([
      prisma.account.findMany({ where: { userId, isActive: true } }),
      prisma.investment.findMany({ where: { userId } }),
      prisma.loan.findMany({ where: { userId } }),
      prisma.subscription.findMany({ where: { userId, isActive: true } }),
      prisma.budget.findMany({ where: { userId }, include: { category: { select: { name: true } } } }),
      prisma.transaction.aggregate({ where: { userId, type: 'INCOME', date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId, type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId, type: 'INCOME', date: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { amount: true } }),
      prisma.transaction.aggregate({ where: { userId, type: 'EXPENSE', date: { gte: startOfLastMonth, lte: endOfLastMonth } }, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ['categoryId'], where: { userId, type: 'EXPENSE', date: { gte: startOfMonth, lte: endOfMonth } }, _sum: { amount: true }, orderBy: { _sum: { amount: 'desc' } } }),
      prisma.goal.findMany({ where: { userId }, orderBy: { targetDate: 'asc' } }),
      prisma.transaction.findMany({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 10,
        include: { category: { select: { name: true } } }
      })
    ]);

    const netWorthData = FinancialEngine.calculateNetWorth(
      accounts.map(a => ({ id: a.id, type: a.type, balance: a.balance })),
      investments.map(i => ({ id: i.id, investedAmount: i.investedAmount, currentValue: i.currentValue })),
      loans.map(l => ({ id: l.id, type: l.type, remainingPrincipal: l.remainingPrincipal }))
    );

    const monthlyIncome = incResult._sum.amount || 0;
    const monthlyExpenses = expResult._sum.amount || 0;
    const savingsData = FinancialEngine.calculateSavingsRate(monthlyIncome, monthlyExpenses);

    const catIds = categoryAggs.map(c => c.categoryId).filter(Boolean) as string[];
    const categories = catIds.length > 0
      ? await prisma.category.findMany({ where: { id: { in: catIds } } })
      : [];
    const catMap = new Map(categories.map(c => [c.id, c.name]));

    const categorySpending = categoryAggs.map(ca => ({
      categoryName: ca.categoryId ? catMap.get(ca.categoryId) || 'General' : 'General',
      amount: ca._sum.amount || 0,
      percentage: monthlyExpenses > 0 ? ((ca._sum.amount || 0) / monthlyExpenses) * 100 : 0
    }));

    const budgetList = await Promise.all(
      budgets.map(async b => {
        const spentAgg = await prisma.transaction.aggregate({
          where: { userId, categoryId: b.categoryId, type: 'EXPENSE', date: { gte: b.startDate, lte: b.endDate } },
          _sum: { amount: true }
        });
        const spent = spentAgg._sum.amount || 0;
        const remaining = Math.max(0, b.amount - spent);
        return {
          categoryName: b.category?.name || 'Category',
          limit: b.amount,
          spent,
          remaining,
          overBudget: spent > b.amount
        };
      })
    );

    const goalList = goals.map(g => {
      const now = new Date();
      const target = new Date(g.targetDate);
      const monthsLeft = Math.max(1, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      const remaining = Math.max(0, g.targetAmount - g.currentAmount);
      const requiredMonthlySaving = remaining / monthsLeft;
      const progressPct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
      return {
        name: g.name,
        category: g.category,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        targetDate: g.targetDate.toISOString().split('T')[0],
        progressPct: Math.min(100, progressPct),
        monthsLeft,
        requiredMonthlySaving
      };
    });

    const investmentList = investments.map(i => {
      const gainLoss = i.currentValue - i.investedAmount;
      const gainLossPct = i.investedAmount > 0 ? (gainLoss / i.investedAmount) * 100 : 0;
      return {
        name: i.name,
        type: i.type,
        investedAmount: i.investedAmount,
        currentValue: i.currentValue,
        gainLoss,
        gainLossPct
      };
    });

    const currentMonthCashFlow = monthlyIncome - monthlyExpenses;
    const lastMonthCashFlow = (lastMonthInc._sum.amount || 0) - (lastMonthExp._sum.amount || 0);
    const cashFlowTrend = {
      currentMonth: currentMonthCashFlow,
      lastMonth: lastMonthCashFlow,
      changeDirection: currentMonthCashFlow >= lastMonthCashFlow ? 'improving' : 'declining'
    };

    const availableBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

    return {
      currency,
      monthlyIncome,
      monthlyExpenses,
      totalAssets: netWorthData.totalAssets,
      totalLiabilities: netWorthData.totalLiabilities,
      netWorth: netWorthData.netWorth,
      savingsRate: savingsData.savingsRate,
      availableBalance,
      categorySpending,
      subscriptions: subscriptions.map(s => ({
        name: s.name,
        cost: s.cost,
        billingCycle: s.billingCycle,
        nextBillingDate: s.nextBillingDate.toISOString().split('T')[0]
      })),
      budgets: budgetList,
      loans: loans.map(l => ({
        name: l.name,
        type: l.type,
        remainingPrincipal: l.remainingPrincipal,
        emiAmount: l.emiAmount,
        interestRate: l.interestRate
      })),
      goals: goalList,
      investments: investmentList,
      recentTransactions: recentTxs.map(t => ({
        date: t.date.toISOString().split('T')[0],
        type: t.type,
        amount: t.amount,
        category: t.category?.name || 'General',
        notes: t.notes || ''
      })),
      cashFlowTrend
    };
  } catch (err) {
    console.error('[buildUserSnapshot Error]', err);
    return {
      currency,
      monthlyIncome: 0, monthlyExpenses: 0, totalAssets: 0, totalLiabilities: 0,
      netWorth: 0, savingsRate: 0, availableBalance: 0,
      categorySpending: [], subscriptions: [], budgets: [],
      loans: [], goals: [], investments: [], recentTransactions: [],
      cashFlowTrend: { currentMonth: 0, lastMonth: 0, changeDirection: 'stable' }
    };
  }
}

// ─── Controllers ──────────────────────────────────────────────────────────────

export const chatWithAI = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { message } = req.body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ success: false, error: 'Message content is required.' });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, error: `Message too long. Max ${MAX_MESSAGE_LENGTH} characters.` });
    }

    // Retrieve conversation history — scoped to authenticated user
    let conversationHistory: ConversationMessage[] = [];
    try {
      const historyEntries = await prisma.aIChatHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: HISTORY_CONTEXT_LIMIT * 2
      });

      conversationHistory = historyEntries
        .reverse()
        .map(h => ({
          role: h.sender === 'USER' ? 'user' : 'assistant' as 'user' | 'assistant',
          content: h.message
        }));
    } catch (err) {
      console.warn('[aiController] Chat history lookup skipped:', err);
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
    const snapshot = await buildUserSnapshot(userId, user?.currency || 'USD');

    const aiResponse = await AIAdvisorService.processChatPrompt(message, snapshot, conversationHistory);

    // Persist conversation if user exists in DB
    try {
      await prisma.$transaction([
        prisma.aIChatHistory.create({
          data: { userId, sender: 'USER', message: message.trim() }
        }),
        prisma.aIChatHistory.create({
          data: {
            userId,
            sender: 'AI',
            message: aiResponse.reply,
            suggestions: aiResponse.suggestions ? JSON.stringify(aiResponse.suggestions) : null
          }
        })
      ]);
    } catch (saveErr) {
      console.warn('[aiController] Chat history save skipped:', saveErr);
    }

    return res.json({
      success: true,
      reply: aiResponse.reply,
      suggestions: aiResponse.suggestions || [],
      modelUsed: aiResponse.modelUsed
    });
  } catch (err: any) {
    console.error('[aiController Chat Error]', err.message || err);
    return res.status(500).json({
      success: false,
      error: 'The AI advisor encountered an error. Please try again in a moment.'
    });
  }
};

export const getChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const history = await prisma.aIChatHistory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
      take: 60
    });

    const parsedHistory = history.map(item => ({
      id: item.id,
      sender: item.sender,
      message: item.message,
      suggestions: item.suggestions ? (() => { try { return JSON.parse(item.suggestions!); } catch { return []; } })() : [],
      createdAt: item.createdAt
    }));

    return res.json({ success: true, history: parsedHistory });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to fetch chat history.' });
  }
};

export const clearChatHistory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    await prisma.aIChatHistory.deleteMany({ where: { userId } });
    return res.json({ success: true, message: 'Chat history cleared.' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to clear chat history.' });
  }
};

export const getHealthScore = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
    const snapshot = await buildUserSnapshot(userId, user?.currency || 'USD');
    const healthResult = AIAdvisorService.calculateHealthScore(snapshot);
    const metrics = calculateFinancialMetrics(snapshot);

    if (user) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { financialHealthScore: healthResult.score }
        });
      } catch (err) {
        console.warn('[getHealthScore] Could not persist health score to user record:', err);
      }
    }

    return res.json({
      success: true,
      health: healthResult,
      snapshotSummary: {
        monthlyIncome: snapshot.monthlyIncome,
        monthlyExpenses: snapshot.monthlyExpenses,
        savingsRate: metrics.savingsRate,
        totalAssets: snapshot.totalAssets,
        totalLiabilities: snapshot.totalLiabilities,
        netWorth: snapshot.netWorth,
        availableBalance: snapshot.availableBalance
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to compute financial health score.' });
  }
};

// ─── AI Config & Status Endpoints ─────────────────────────────────────────────

export const getAIStatus = async (req: AuthRequest, res: Response) => {
  try {
    const openAIKey = process.env.OPENAI_API_KEY;
    const hasOpenAI = Boolean(openAIKey && openAIKey.length > 20 && openAIKey !== 'your_openai_api_key_here');
    const geminiKey = process.env.GEMINI_API_KEY;
    const hasGemini = Boolean(geminiKey && geminiKey.length > 15);

    let maskedOpenAI = '';
    if (hasOpenAI && openAIKey) {
      maskedOpenAI = `${openAIKey.substring(0, 7)}...${openAIKey.substring(openAIKey.length - 4)}`;
    }

    let activeModel = 'Aura Financial Intelligence Engine';
    if (hasOpenAI) activeModel = 'OpenAI GPT-4o Mini';
    else if (hasGemini) activeModel = 'Google Gemini 1.5 Flash';

    return res.json({
      success: true,
      openAIConfigured: hasOpenAI,
      geminiConfigured: hasGemini,
      maskedOpenAIKey: maskedOpenAI,
      activeModel
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve AI configuration status.' });
  }
};

export const updateAIConfig = async (req: AuthRequest, res: Response) => {
  try {
    const { openAIKey, geminiKey } = req.body;
    const fs = await import('fs');
    const path = await import('path');
    const envPath = path.resolve(process.cwd(), '.env');

    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf8');
    }

    if (typeof openAIKey === 'string') {
      const trimmed = openAIKey.trim();
      process.env.OPENAI_API_KEY = trimmed;
      if (envContent.includes('OPENAI_API_KEY=')) {
        envContent = envContent.replace(/OPENAI_API_KEY=.*/g, `OPENAI_API_KEY=${trimmed}`);
      } else {
        envContent += `\nOPENAI_API_KEY=${trimmed}`;
      }
    }

    if (typeof geminiKey === 'string') {
      const trimmed = geminiKey.trim();
      process.env.GEMINI_API_KEY = trimmed;
      if (envContent.includes('GEMINI_API_KEY=')) {
        envContent = envContent.replace(/GEMINI_API_KEY=.*/g, `GEMINI_API_KEY=${trimmed}`);
      } else {
        envContent += `\nGEMINI_API_KEY=${trimmed}`;
      }
    }

    try {
      fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf8');
    } catch (writeErr) {
      console.warn('[updateAIConfig] Could not write .env to disk:', writeErr);
    }

    return res.json({
      success: true,
      message: 'AI configuration updated successfully!',
      openAIConfigured: Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 20 && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here')
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to update AI configuration.' });
  }
};

export const testAIConnection = async (req: AuthRequest, res: Response) => {
  try {
    const { apiKey } = req.body;
    const keyToTest = (apiKey && typeof apiKey === 'string' && apiKey.trim()) || process.env.OPENAI_API_KEY;

    if (!keyToTest || keyToTest.length < 20 || keyToTest === 'your_openai_api_key_here') {
      return res.status(400).json({
        success: false,
        error: 'Please enter a valid OpenAI API key starting with sk-...'
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const testRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keyToTest.trim()}`
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: 'Reply with OK' }],
          max_tokens: 10
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!testRes.ok) {
        const errText = await testRes.text();
        let errMsg = `OpenAI API returned status ${testRes.status}`;
        try {
          const parsed = JSON.parse(errText);
          if (parsed.error?.message) errMsg += `: ${parsed.error.message}`;
        } catch {
          errMsg += `: ${errText.slice(0, 150)}`;
        }
        return res.status(testRes.status).json({ success: false, error: errMsg });
      }

      const data = await testRes.json();
      const reply = data?.choices?.[0]?.message?.content || 'OK';

      return res.json({
        success: true,
        message: `OpenAI API connection verified successfully! (Model: ${data.model || 'gpt-4o-mini'})`,
        sampleReply: reply
      });
    } catch (fetchErr: any) {
      clearTimeout(timeout);
      const isNetworkIssue = fetchErr.message?.includes('fetch failed') || fetchErr.name === 'AbortError';
      const detail = isNetworkIssue
        ? 'Could not connect to api.openai.com. If the server is running inside a background sandbox, please run "npm run dev" directly in your Mac Terminal.'
        : fetchErr.message;
      return res.status(502).json({
        success: false,
        error: `OpenAI connection failed: ${detail}`
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Connection test error: ${err.message || err}`
    });
  }
};

