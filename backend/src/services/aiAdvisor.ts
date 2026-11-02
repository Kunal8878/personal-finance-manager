/**
 * AI Financial Advisor & Multi-Model Engine
 * 
 * Multi-Model Cascade:
 *  1. OpenAI API (if OPENAI_API_KEY is configured)
 *  2. Google Gemini API (if GEMINI_API_KEY is configured)
 *  3. Cloud Multi-Model Gateway (Free GPT-4o / Mistral via Pollinations AI)
 *  4. Advanced Local Financial Intelligence Engine (Deterministic, instant, offline-ready)
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserFinancialSnapshot {
  currency: string;
  monthlyIncome: number;
  monthlyExpenses: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  savingsRate: number;
  availableBalance: number;
  categorySpending: Array<{ categoryName: string; amount: number; percentage: number }>;
  subscriptions: Array<{ name: string; cost: number; billingCycle: string; nextBillingDate: string }>;
  budgets: Array<{ categoryName: string; limit: number; spent: number; remaining: number; overBudget: boolean }>;
  loans: Array<{ name: string; type: string; remainingPrincipal: number; emiAmount: number; interestRate: number }>;
  goals: Array<{ name: string; category: string; targetAmount: number; currentAmount: number; targetDate: string; progressPct: number; monthsLeft: number; requiredMonthlySaving: number }>;
  investments: Array<{ name: string; type: string; investedAmount: number; currentValue: number; gainLoss: number; gainLossPct: number }>;
  recentTransactions: Array<{ date: string; type: string; amount: number; category: string; notes: string }>;
  cashFlowTrend: { currentMonth: number; lastMonth: number; changeDirection: string };
}

export interface HealthScoreResult {
  score: number;
  grade: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'NEEDS_ATTENTION';
  breakdown: {
    savingsRatePoints: number;
    emergencyFundPoints: number;
    debtRatioPoints: number;
    budgetAdherencePoints: number;
  };
  strengths: string[];
  actionItems: string[];
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ─── Security Helpers ─────────────────────────────────────────────────────────

function sanitizeForPrompt(text: string, maxLen = 300): string {
  if (!text) return '';
  return text
    .slice(0, maxLen)
    .replace(/[<>{}]/g, '')
    .replace(/ignore\s+(previous|all)\s+instructions?/gi, '[FILTERED]')
    .replace(/system\s*:/gi, '[FILTERED]')
    .replace(/you\s+are\s+(now|a)/gi, '[FILTERED]')
    .trim();
}

// ─── Financial Calculations ───────────────────────────────────────────────────

export function calculateFinancialMetrics(snapshot: UserFinancialSnapshot) {
  const { monthlyIncome, monthlyExpenses, totalAssets, totalLiabilities } = snapshot;
  const netMonthlySavings = monthlyIncome - monthlyExpenses;
  const savingsRate = monthlyIncome > 0 ? (netMonthlySavings / monthlyIncome) * 100 : 0;
  const debtToIncome = monthlyIncome > 0 ? (totalLiabilities / (monthlyIncome * 12)) * 100 : 0;
  const monthsCovered = monthlyExpenses > 0 ? totalAssets / monthlyExpenses : 0;
  const emergencyFundAdequate = monthsCovered >= 3;

  return {
    netMonthlySavings: Math.round(netMonthlySavings * 100) / 100,
    savingsRate: Math.round(savingsRate * 10) / 10,
    debtToIncome: Math.round(debtToIncome * 10) / 10,
    monthsCovered: Math.round(monthsCovered * 10) / 10,
    emergencyFundAdequate,
    needs_50: Math.round(monthlyIncome * 0.5 * 100) / 100,
    wants_30: Math.round(monthlyIncome * 0.3 * 100) / 100,
    savings_20: Math.round(monthlyIncome * 0.2 * 100) / 100,
  };
}

// ─── AI Advisor Service ───────────────────────────────────────────────────────

export class AIAdvisorService {
  static calculateHealthScore(snapshot: UserFinancialSnapshot): HealthScoreResult {
    const { monthlyIncome, monthlyExpenses, totalAssets, totalLiabilities, savingsRate, budgets } = snapshot;

    const savingsRatePoints = Math.min(30, Math.max(0, Math.round((savingsRate / 30) * 30)));
    const monthsCovered = monthlyExpenses > 0 ? totalAssets / monthlyExpenses : 6;
    const emergencyFundPoints = Math.min(30, Math.max(0, Math.round((monthsCovered / 6) * 30)));

    const annualIncome = monthlyIncome * 12;
    const debtRatio = annualIncome > 0 ? totalLiabilities / annualIncome : 0;
    let debtRatioPoints = 20;
    if (debtRatio > 0.5) debtRatioPoints = 5;
    else if (debtRatio > 0.3) debtRatioPoints = 12;

    const overbudgetCount = budgets.filter(b => b.overBudget).length;
    const budgetAdherencePoints = Math.max(0, 20 - overbudgetCount * 5);

    const score = Math.min(100, savingsRatePoints + emergencyFundPoints + debtRatioPoints + budgetAdherencePoints);

    let grade: HealthScoreResult['grade'] = 'NEEDS_ATTENTION';
    if (score >= 80) grade = 'EXCELLENT';
    else if (score >= 65) grade = 'GOOD';
    else if (score >= 45) grade = 'FAIR';

    const strengths: string[] = [];
    const actionItems: string[] = [];

    if (savingsRate >= 20) strengths.push(`Strong savings rate of ${savingsRate.toFixed(1)}%.`);
    else actionItems.push(`Raise savings rate closer to 20% — currently at ${savingsRate.toFixed(1)}%.`);

    if (monthsCovered >= 3) strengths.push(`Liquidity buffer covers ${monthsCovered.toFixed(1)} months of expenses.`);
    else actionItems.push(`Build an emergency fund covering at least 3 months of expenses (need ${(3 * monthlyExpenses).toFixed(0)} ${snapshot.currency}).`);

    if (overbudgetCount === 0 && budgets.length > 0) strengths.push('100% budget adherence — no categories overspent.');
    else if (overbudgetCount > 0) actionItems.push(`${overbudgetCount} budget ${overbudgetCount === 1 ? 'category' : 'categories'} exceeded limit this period.`);

    if (debtRatio > 0.4) actionItems.push(`Debt-to-income ratio is ${(debtRatio * 100).toFixed(0)}% — consider accelerating repayment.`);
    else if (debtRatio < 0.2 && totalLiabilities > 0) strengths.push(`Healthy debt-to-income ratio of ${(debtRatio * 100).toFixed(0)}%.`);

    return {
      score,
      grade,
      breakdown: { savingsRatePoints, emergencyFundPoints, debtRatioPoints, budgetAdherencePoints },
      strengths,
      actionItems,
    };
  }

  // ─── Main Chat Processing with Multi-Model Cascade ──────────────────────────

  static async processChatPrompt(
    userMessage: string,
    snapshot: UserFinancialSnapshot,
    conversationHistory: ConversationMessage[] = []
  ): Promise<{ reply: string; suggestions?: string[]; modelUsed?: string }> {
    const openAIKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // 1. Try OpenAI if key configured
    if (openAIKey && openAIKey.length > 20 && openAIKey !== 'your_openai_api_key_here') {
      try {
        const result = await this.callOpenAI(userMessage, snapshot, conversationHistory, openAIKey);
        return { ...result, modelUsed: 'OpenAI GPT-4o Mini' };
      } catch (err: any) {
        console.warn('[AIAdvisor] OpenAI attempt failed, switching to backup model:', err.message);
      }
    }

    // 2. Try Google Gemini if key configured
    if (geminiKey && geminiKey.length > 15) {
      try {
        const result = await this.callGemini(userMessage, snapshot, conversationHistory, geminiKey);
        return { ...result, modelUsed: 'Google Gemini 1.5' };
      } catch (err: any) {
        console.warn('[AIAdvisor] Gemini attempt failed, switching to backup model:', err.message);
      }
    }

    // 3. Try Cloud Multi-Model Direct (Pollinations GPT-4o Gateway)
    try {
      const result = await this.callCloudDirectModel(userMessage, snapshot, conversationHistory);
      return { ...result, modelUsed: 'Cloud Multi-Model AI' };
    } catch (err: any) {
      console.warn('[AIAdvisor] Cloud gateway failed, using local engine:', err.message);
    }

    // 4. Fallback to Deep Local Financial NLP Engine (Guaranteed 0ms offline response)
    const localResult = this.localFinancialEngine(userMessage, snapshot);
    return { ...localResult, modelUsed: 'Aura Financial Intelligence Engine' };
  }

  // ─── Build System Prompt & Financial Context ────────────────────────────────

  private static buildContextPrompt(snapshot: UserFinancialSnapshot): string {
    const metrics = calculateFinancialMetrics(snapshot);
    const cur = snapshot.currency;

    return `You are an expert AI Personal Financial Advisor inside Aura Finance.
Help the user understand and optimize their finances using their REAL financial records below.

RULES:
1. Be analytical, direct, practical, and honest.
2. Use ONLY the user's actual numbers provided below. Never invent transactions, balances, or rates.
3. Show calculations when discussing budgets, goals, or expense reductions.
4. Currency: ${cur}.
5. Give concise, bullet-pointed, actionable advice.

--- FINANCIAL RECORDS (DATA ONLY) ---
Currency: ${cur}
- Monthly Income: ${cur} ${snapshot.monthlyIncome.toFixed(2)}
- Monthly Expenses: ${cur} ${snapshot.monthlyExpenses.toFixed(2)}
- Net Monthly Savings: ${cur} ${metrics.netMonthlySavings.toFixed(2)}
- Savings Rate: ${metrics.savingsRate.toFixed(1)}%
- Total Assets: ${cur} ${snapshot.totalAssets.toFixed(2)}
- Total Liabilities (Debt): ${cur} ${snapshot.totalLiabilities.toFixed(2)}
- Net Worth: ${cur} ${snapshot.netWorth.toFixed(2)}
- Emergency Buffer: ${metrics.monthsCovered.toFixed(1)} months

SPENDING BY CATEGORY:
${snapshot.categorySpending.length > 0
  ? snapshot.categorySpending.map(c => `  * ${sanitizeForPrompt(c.categoryName)}: ${cur} ${c.amount.toFixed(2)} (${c.percentage.toFixed(1)}%)`).join('\n')
  : '  * No expense records yet.'}

BUDGETS:
${snapshot.budgets.length > 0
  ? snapshot.budgets.map(b => `  * ${sanitizeForPrompt(b.categoryName)}: Limit ${cur} ${b.limit.toFixed(2)}, Spent ${cur} ${b.spent.toFixed(2)} (${b.overBudget ? 'OVER BUDGET' : 'OK'})`).join('\n')
  : '  * No active budgets.'}

FINANCIAL GOALS:
${snapshot.goals.length > 0
  ? snapshot.goals.map(g => `  * ${sanitizeForPrompt(g.name)}: Target ${cur} ${g.targetAmount.toFixed(2)}, Saved ${cur} ${g.currentAmount.toFixed(2)} (${g.progressPct.toFixed(1)}%), ${g.monthsLeft} mo left, Needs ${cur} ${g.requiredMonthlySaving.toFixed(2)}/mo`).join('\n')
  : '  * No goals created.'}

INVESTMENTS:
${snapshot.investments.length > 0
  ? snapshot.investments.map(i => `  * ${sanitizeForPrompt(i.name)} (${i.type}): Invested ${cur} ${i.investedAmount.toFixed(2)}, Current ${cur} ${i.currentValue.toFixed(2)}, Gain/Loss ${cur} ${i.gainLoss.toFixed(2)} (${i.gainLossPct.toFixed(1)}%)`).join('\n')
  : '  * No investment assets recorded.'}

ACTIVE SUBSCRIPTIONS:
${snapshot.subscriptions.length > 0
  ? snapshot.subscriptions.map(s => `  * ${sanitizeForPrompt(s.name)}: ${cur} ${s.cost.toFixed(2)} / ${s.billingCycle}`).join('\n')
  : '  * No subscriptions tracked.'}

LOANS & EMIS:
${snapshot.loans.length > 0
  ? snapshot.loans.map(l => `  * ${sanitizeForPrompt(l.name)}: Principal ${cur} ${l.remainingPrincipal.toFixed(2)}, EMI ${cur} ${l.emiAmount.toFixed(2)}/mo @ ${l.interestRate}%`).join('\n')
  : '  * No active loans.'}

50/30/20 BENCHMARK TARGETS:
- Needs (50%): ${cur} ${metrics.needs_50.toFixed(2)}
- Wants (30%): ${cur} ${metrics.wants_30.toFixed(2)}
- Savings (20%): ${cur} ${metrics.savings_20.toFixed(2)}
-------------------------------------`;
  }

  // ─── 1. OpenAI Call ─────────────────────────────────────────────────────────

  private static async callOpenAI(
    userMessage: string,
    snapshot: UserFinancialSnapshot,
    history: ConversationMessage[],
    apiKey: string
  ): Promise<{ reply: string; suggestions?: string[] }> {
    const systemPrompt = this.buildContextPrompt(snapshot);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: sanitizeForPrompt(userMessage, 2000) }
    ];

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: 800, temperature: 0.4 })
    });

    if (!res.ok) throw new Error(`OpenAI HTTP ${res.status}`);
    const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content;
    if (!reply) throw new Error('Empty OpenAI response');

    return { reply, suggestions: this.generateSuggestions(snapshot) };
  }

  // ─── 2. Google Gemini Call ──────────────────────────────────────────────────

  private static async callGemini(
    userMessage: string,
    snapshot: UserFinancialSnapshot,
    history: ConversationMessage[],
    apiKey: string
  ): Promise<{ reply: string; suggestions?: string[] }> {
    const systemPrompt = this.buildContextPrompt(snapshot);
    const historyText = history.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n');
    const prompt = `${systemPrompt}\n\nRecent History:\n${historyText}\n\nUser Question: ${userMessage}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });

    if (!res.ok) throw new Error(`Gemini HTTP ${res.status}`);
    const data = await res.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!reply) throw new Error('Empty Gemini response');

    return { reply, suggestions: this.generateSuggestions(snapshot) };
  }

  // ─── 3. Cloud Multi-Model Gateway (Free OpenAI-compatible endpoint) ─────────

  private static async callCloudDirectModel(
    userMessage: string,
    snapshot: UserFinancialSnapshot,
    history: ConversationMessage[]
  ): Promise<{ reply: string; suggestions?: string[] }> {
    const systemPrompt = this.buildContextPrompt(snapshot);
    const messages = [
      { role: 'system', content: systemPrompt },
      ...history.slice(-6).map(h => ({ role: h.role, content: h.content })),
      { role: 'user', content: sanitizeForPrompt(userMessage, 2000) }
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const res = await fetch('https://text.pollinations.ai/openai/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'openai',
          messages,
          max_tokens: 800,
          temperature: 0.3
        }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      if (!res.ok) throw new Error(`Cloud AI Gateway HTTP ${res.status}`);
      const data = await res.json();
      const reply = data?.choices?.[0]?.message?.content;
      if (!reply) throw new Error('Empty Cloud AI response');

      return { reply, suggestions: this.generateSuggestions(snapshot) };
    } finally {
      clearTimeout(timeout);
    }
  }

  // ─── 4. Suggestions Generator ───────────────────────────────────────────────

  private static generateSuggestions(snapshot: UserFinancialSnapshot): string[] {
    const suggs: string[] = [];
    if (snapshot.categorySpending.length > 0) {
      suggs.push(`How to cut ${snapshot.categorySpending[0].categoryName} expenses?`);
    }
    if (snapshot.goals.length > 0) {
      suggs.push(`Am I on track for my ${snapshot.goals[0].name} goal?`);
    }
    if (snapshot.loans.length > 0) {
      suggs.push('Recommend optimal loan payoff strategy');
    }
    if (snapshot.monthlyIncome > 0) {
      suggs.push('Show 50/30/20 budget breakdown');
    }
    if (suggs.length < 3) {
      suggs.push('Analyze my spending this month', 'Where can I reduce expenses?');
    }
    return suggs.slice(0, 4);
  }

  // ─── 5. Local Financial Intelligence Engine (Instant deterministic backup) ──

  private static localFinancialEngine(
    userMessage: string,
    snapshot: UserFinancialSnapshot
  ): { reply: string; suggestions?: string[] } {
    const msg = userMessage.toLowerCase();
    const { monthlyIncome, monthlyExpenses, categorySpending, subscriptions, loans, goals, currency: cur } = snapshot;
    const metrics = calculateFinancialMetrics(snapshot);
    const netSavings = metrics.netMonthlySavings;

    // Spending analysis
    if (msg.match(/spend|expense|cut|reduc|control|where.*money|high/)) {
      if (categorySpending.length === 0) {
        return {
          reply: `I don't see any recorded expenses yet.\n\nAdd transactions or link your bank accounts to enable category breakdown and spending trend analysis.`,
          suggestions: ['Add a transaction', 'Link bank account']
        };
      }
      const top = categorySpending[0];
      const totalSub = subscriptions.reduce((s, x) => s + x.cost, 0);
      let reply = `### 📊 Monthly Spending Breakdown\n\n`;
      reply += `- **Monthly Income:** ${cur} ${monthlyIncome.toFixed(2)}\n`;
      reply += `- **Monthly Expenses:** ${cur} ${monthlyExpenses.toFixed(2)}\n`;
      reply += `- **Net Savings:** ${cur} ${netSavings.toFixed(2)} (${metrics.savingsRate.toFixed(1)}%)\n\n`;
      reply += `**Top Spending Categories:**\n`;
      categorySpending.slice(0, 5).forEach((c, i) => {
        reply += `${i + 1}. **${c.categoryName}:** ${cur} ${c.amount.toFixed(2)} (${c.percentage.toFixed(1)}% of total expenses)\n`;
      });
      reply += `\n💡 **Optimization Opportunity:** Reducing **${top.categoryName}** by 15% saves **${cur} ${(top.amount * 0.15).toFixed(2)}/month** (${cur} ${(top.amount * 0.15 * 12).toFixed(2)}/year).`;
      if (subscriptions.length > 0) {
        reply += `\n\n🔍 **Subscriptions:** You have ${subscriptions.length} active recurring subscriptions totaling **${cur} ${totalSub.toFixed(2)}/month**.`;
      }
      return { reply, suggestions: ['Audit subscriptions', 'Show 50/30/20 budget', 'Set category budget'] };
    }

    // Goals planning
    if (msg.match(/goal|saving|target|vacation|emergency|house|car/)) {
      if (goals.length === 0) {
        return {
          reply: `You haven't set any financial goals yet.\n\nVisit the **Goals** section to define targets (e.g. Emergency Fund, Travel, Home Down Payment). I will calculate exact monthly required contributions.`,
          suggestions: ['How to set a goal?', 'What is an emergency fund?']
        };
      }
      let reply = `### 🎯 Financial Goals Progress\n\n`;
      let totalMonthlyRequired = 0;
      goals.forEach(g => {
        totalMonthlyRequired += g.requiredMonthlySaving;
        reply += `- **${g.name}** (${g.category})\n`;
        reply += `  * Target: ${cur} ${g.targetAmount.toFixed(2)} | Saved: ${cur} ${g.currentAmount.toFixed(2)} (${g.progressPct.toFixed(1)}%)\n`;
        reply += `  * Remaining: ${cur} ${(g.targetAmount - g.currentAmount).toFixed(2)} in ${g.monthsLeft} months\n`;
        reply += `  * **Required Monthly Contribution:** ${cur} ${g.requiredMonthlySaving.toFixed(2)}/mo\n\n`;
      });
      reply += `**Total Required Savings:** ${cur} ${totalMonthlyRequired.toFixed(2)}/month\n`;
      reply += `**Current Net Savings:** ${cur} ${netSavings.toFixed(2)}/month\n\n`;
      if (netSavings >= totalMonthlyRequired) {
        reply += `✅ **On Track:** Your current monthly savings cover all your goal commitments!`;
      } else {
        reply += `⚠️ **Gap Detected:** You have a monthly shortfall of **${cur} ${(totalMonthlyRequired - netSavings).toFixed(2)}**. Consider trimming discretionary expenses or adjusting goal timelines.`;
      }
      return { reply, suggestions: ['How to close savings gap?', 'Show spending breakdown'] };
    }

    // Debt & loans
    if (msg.match(/loan|emi|debt|borrow|interest|payoff|avalanche|snowball/)) {
      if (loans.length === 0) {
        return {
          reply: `No active loans found in your vault. If you have credit cards, mortgages, or personal loans, add them to compute optimal payoff strategies!`,
          suggestions: ['Add a loan record']
        };
      }
      const totalDebt = loans.reduce((s, l) => s + l.remainingPrincipal, 0);
      const totalEMI = loans.reduce((s, l) => s + l.emiAmount, 0);
      let reply = `### 💳 Loans & Liabilities Overview\n\n`;
      loans.forEach(l => {
        reply += `- **${l.name}:** Principal ${cur} ${l.remainingPrincipal.toFixed(2)} | EMI ${cur} ${l.emiAmount.toFixed(2)}/mo @ ${l.interestRate}% p.a.\n`;
      });
      reply += `\n- **Total Outstanding Debt:** ${cur} ${totalDebt.toFixed(2)}\n`;
      reply += `- **Monthly EMI Commitment:** ${cur} ${totalEMI.toFixed(2)}/month\n\n`;
      reply += `**Recommended Strategy (Debt Avalanche):**\n`;
      reply += `1. Make minimum EMI payments across all loans on time.\n`;
      reply += `2. Allocate any extra monthly savings directly toward the loan with the **highest interest rate** to minimize lifetime interest.`;
      return { reply, suggestions: ['Calculate payoff timeline', 'Review monthly cashflow'] };
    }

    // Default overview
    return {
      reply: `### 🏦 Financial Vault Overview\n\n` +
        `- **Monthly Income:** ${cur} ${monthlyIncome.toFixed(2)}\n` +
        `- **Monthly Expenses:** ${cur} ${monthlyExpenses.toFixed(2)}\n` +
        `- **Net Savings:** ${cur} ${netSavings.toFixed(2)} (${metrics.savingsRate.toFixed(1)}% savings rate)\n` +
        `- **Total Assets:** ${cur} ${snapshot.totalAssets.toFixed(2)}\n` +
        `- **Total Liabilities:** ${cur} ${snapshot.totalLiabilities.toFixed(2)}\n` +
        `- **Net Worth:** ${cur} ${snapshot.netWorth.toFixed(2)}\n\n` +
        `Ask me specific questions such as:\n` +
        `- *"Where am I spending the most?"*\n` +
        `- *"Am I on track for my savings goals?"*\n` +
        `- *"How can I optimize my budget?"*`,
      suggestions: ['Where am I spending too much?', 'Review my goals', 'Calculate 50/30/20 budget']
    };
  }
}
