import { Router } from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth';
import { logAuditEvent } from '../middleware/auditLogger';

import * as authCtrl from '../controllers/authController';
import * as accountCtrl from '../controllers/accountController';
import * as transactionCtrl from '../controllers/transactionController';
import * as budgetCtrl from '../controllers/budgetController';
import * as goalCtrl from '../controllers/goalController';
import * as investmentCtrl from '../controllers/investmentController';
import * as loanCtrl from '../controllers/loanController';
import * as subCtrl from '../controllers/subscriptionController';
import * as reportCtrl from '../controllers/reportController';
import * as bankSyncCtrl from '../controllers/bankSyncController';
import * as aiCtrl from '../controllers/aiController';
import { prisma } from '../config/db';
import { seedUserData, seedAllRegisteredUsers } from '../config/seedData';
import { CurrencyService } from '../services/currencyService';
import { realtimeHub } from '../services/realtimeService';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// --- Auth Routes ---
router.post('/auth/register', authCtrl.register);
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', authenticateToken, authCtrl.getMe);

// --- Categories Route ---
router.get('/categories', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const categories = await prisma.category.findMany({
      where: {
        OR: [{ userId: null }, { userId }]
      },
      orderBy: { name: 'asc' }
    });
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch categories.' });
  }
});

// --- Accounts Routes ---
router.get('/accounts', authenticateToken, accountCtrl.getAccounts);
router.post('/accounts', authenticateToken, logAuditEvent('CREATE', 'Account'), accountCtrl.createAccount);
router.put('/accounts/:id', authenticateToken, logAuditEvent('UPDATE', 'Account'), accountCtrl.updateAccount);
router.delete('/accounts/:id', authenticateToken, logAuditEvent('DELETE', 'Account'), accountCtrl.deleteAccount);

// --- Bank Sync / Account Aggregator Routes ---
router.post('/bank-sync/discover', authenticateToken, logAuditEvent('DISCOVER', 'BankSync'), bankSyncCtrl.discoverAccounts);
router.post('/bank-sync/confirm', authenticateToken, logAuditEvent('CONFIRM', 'BankSync'), bankSyncCtrl.confirmBankLink);

// --- AI Financial Advisor & Chatbot Routes ---
router.post('/ai/chat', authenticateToken, logAuditEvent('CHAT', 'AIAdvisor'), aiCtrl.chatWithAI);
router.get('/ai/chat-history', authenticateToken, aiCtrl.getChatHistory);
router.delete('/ai/chat-history', authenticateToken, aiCtrl.clearChatHistory);
router.get('/ai/health-score', authenticateToken, aiCtrl.getHealthScore);
router.get('/ai/status', authenticateToken, aiCtrl.getAIStatus);
router.post('/ai/config', authenticateToken, aiCtrl.updateAIConfig);
router.post('/ai/test', authenticateToken, aiCtrl.testAIConnection);

// --- Real-Time Server-Sent Events (SSE) Stream ---
router.get('/stream', authenticateToken, (req: any, res: any) => {
  realtimeHub.addClient(req.user.userId, res);
});

// --- Currency Exchange Rates & Multi-Currency Preferences ---
router.get('/currency/rates', (req, res) => {
  const base = ((req.query.base as string) || 'INR').toUpperCase();
  res.json({ success: true, ...CurrencyService.getRatesSummary(base) });
});

router.post('/currency/convert', (req, res) => {
  const { amount, from, to } = req.body;
  if (typeof amount !== 'number') {
    return res.status(400).json({ success: false, error: 'Valid numeric amount is required' });
  }
  const result = CurrencyService.convert(amount, from || 'INR', to || 'USD');
  res.json({ success: true, ...result });
});

router.put('/users/currency', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { currency } = req.body;
    if (!currency) {
      return res.status(400).json({ success: false, error: 'Currency code is required' });
    }
    const clean = currency.toUpperCase();
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { currency: clean },
      select: { id: true, name: true, email: true, currency: true }
    });
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update currency preference' });
  }
});

// --- Transactions Routes ---
router.get('/transactions', authenticateToken, transactionCtrl.getTransactions);
router.post('/transactions', authenticateToken, logAuditEvent('CREATE', 'Transaction'), transactionCtrl.createTransaction);
router.put('/transactions/:id', authenticateToken, logAuditEvent('UPDATE', 'Transaction'), transactionCtrl.updateTransaction);
router.post('/transactions/simulate-live', authenticateToken, logAuditEvent('SIMULATE', 'Transaction'), transactionCtrl.simulateLiveTransaction);
router.delete('/transactions/:id', authenticateToken, logAuditEvent('DELETE', 'Transaction'), transactionCtrl.deleteTransaction);
router.get('/transactions/export', authenticateToken, transactionCtrl.exportTransactionsCSV);
router.post('/transactions/import', authenticateToken, upload.single('file'), logAuditEvent('IMPORT', 'Transactions'), transactionCtrl.importTransactionsCSV);

// --- Pre-Seeded Demo Data Upload Route ---
router.post('/seed', authenticateToken, logAuditEvent('SEED', 'UserData'), async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const { all } = req.body || {};
    if (all) {
      const count = await seedAllRegisteredUsers();
      return res.json({ success: true, message: `Pre-seeded demo financial data re-uploaded for all ${count} users!` });
    }
    const result = await seedUserData(userId);
    res.json({
      success: true,
      message: `Pre-seeded financial data successfully uploaded (${result.txCount} transactions, accounts, budgets, goals, investments)!`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Failed to seed demo data.' });
  }
});

// --- Budgets Routes ---
router.get('/budgets', authenticateToken, budgetCtrl.getBudgets);
router.post('/budgets', authenticateToken, logAuditEvent('CREATE', 'Budget'), budgetCtrl.createBudget);
router.delete('/budgets/:id', authenticateToken, logAuditEvent('DELETE', 'Budget'), budgetCtrl.deleteBudget);

// --- Goals Routes ---
router.get('/goals', authenticateToken, goalCtrl.getGoals);
router.post('/goals', authenticateToken, logAuditEvent('CREATE', 'Goal'), goalCtrl.createGoal);
router.put('/goals/:id/contribute', authenticateToken, logAuditEvent('UPDATE', 'Goal'), goalCtrl.updateGoalContribution);
router.delete('/goals/:id', authenticateToken, logAuditEvent('DELETE', 'Goal'), goalCtrl.deleteGoal);

// --- Investments Routes ---
router.get('/investments', authenticateToken, investmentCtrl.getInvestments);
router.post('/investments', authenticateToken, logAuditEvent('CREATE', 'Investment'), investmentCtrl.createInvestment);
router.put('/investments/:id/value', authenticateToken, logAuditEvent('UPDATE', 'Investment'), investmentCtrl.updateInvestmentValue);
router.delete('/investments/:id', authenticateToken, logAuditEvent('DELETE', 'Investment'), investmentCtrl.deleteInvestment);

// --- Loans Routes ---
router.get('/loans', authenticateToken, loanCtrl.getLoans);
router.post('/loans', authenticateToken, logAuditEvent('CREATE', 'Loan'), loanCtrl.createLoan);
router.post('/loans/:id/payments', authenticateToken, logAuditEvent('PAYMENT', 'Loan'), loanCtrl.recordLoanPayment);
router.delete('/loans/:id', authenticateToken, logAuditEvent('DELETE', 'Loan'), loanCtrl.deleteLoan);

// --- Subscriptions Routes ---
router.get('/subscriptions', authenticateToken, subCtrl.getSubscriptions);
router.post('/subscriptions', authenticateToken, logAuditEvent('CREATE', 'Subscription'), subCtrl.createSubscription);
router.put('/subscriptions/:id/toggle', authenticateToken, logAuditEvent('UPDATE', 'Subscription'), subCtrl.toggleSubscription);
router.delete('/subscriptions/:id', authenticateToken, logAuditEvent('DELETE', 'Subscription'), subCtrl.deleteSubscription);

// --- Reports & Analytics Routes ---
router.get('/reports/summary', authenticateToken, reportCtrl.getDashboardSummary);
router.get('/reports/cashflow', authenticateToken, reportCtrl.getCashFlow);
router.get('/reports/export/pdf', authenticateToken, reportCtrl.exportReportPDF);

export default router;
