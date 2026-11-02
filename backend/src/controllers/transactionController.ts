import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { transactionSchema, updateTransactionSchema } from '../utils/validators';
import { parse } from 'csv-parse/sync';
import { stringify } from 'csv-stringify/sync';
import { CurrencyService } from '../services/currencyService';
import { realtimeHub } from '../services/realtimeService';

export const getTransactions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const {
      page = '1',
      limit = '20',
      search,
      type,
      currency,
      accountId,
      categoryId,
      startDate,
      endDate,
      sortBy = 'date',
      sortOrder = 'desc',
      reportingCurrency = 'INR'
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = { userId };

    if (type) where.type = type as string;
    if (currency) where.currency = (currency as string).toUpperCase();
    if (accountId) where.accountId = accountId as string;
    if (categoryId) where.categoryId = categoryId as string;
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }
    if (search) {
      where.OR = [
        { notes: { contains: search as string } },
        { category: { name: { contains: search as string } } },
        { account: { name: { contains: search as string } } }
      ];
    }

    const [transactions, totalCount] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: {
          account: { select: { id: true, name: true, type: true, currency: true } },
          toAccount: { select: { id: true, name: true, type: true, currency: true } },
          category: { select: { id: true, name: true, icon: true, color: true } }
        },
        orderBy: { [sortBy as string]: sortOrder as string },
        skip,
        take: limitNum
      }),
      prisma.transaction.count({ where })
    ]);

    const targetReporting = (reportingCurrency as string || 'INR').toUpperCase();
    const targetMeta = CurrencyService.getMetadata(targetReporting);

    // Enrich transactions with reporting equivalent dynamically
    const enrichedTransactions = transactions.map((t) => {
      const origCurrency = (t.currency || 'INR').toUpperCase();
      const origMeta = CurrencyService.getMetadata(origCurrency);

      let reportingAmount = t.convertedAmount;
      let conversionRate = t.exchangeRate;

      // If requested reporting currency differs from stored baseCurrency, convert dynamically
      if (t.baseCurrency !== targetReporting || !reportingAmount) {
        const conv = CurrencyService.convert(t.amount, origCurrency, targetReporting);
        reportingAmount = conv.convertedAmount;
        conversionRate = conv.exchangeRate;
      }

      return {
        ...t,
        currency: origCurrency,
        currencySymbol: t.currencySymbol || origMeta.symbol,
        reportingCurrency: targetReporting,
        reportingSymbol: targetMeta.symbol,
        reportingAmount,
        exchangeRate: conversionRate
      };
    });

    res.json({
      success: true,
      transactions: enrichedTransactions,
      reportingCurrency: targetReporting,
      reportingSymbol: targetMeta.symbol,
      pagination: {
        total: totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch transactions.' });
  }
};

export const createTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validated = transactionSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
    const userReportingCurrency = (user?.currency || 'INR').toUpperCase();

    const account = await prisma.account.findFirst({
      where: { id: validated.accountId, userId }
    });
    if (!account) {
      return res.status(404).json({ success: false, error: 'Source account not found.' });
    }

    let toAccount = null;
    if (validated.type === 'TRANSFER') {
      if (!validated.toAccountId) {
        return res.status(400).json({ success: false, error: 'Destination account is required for transfers.' });
      }
      if (validated.accountId === validated.toAccountId) {
        return res.status(400).json({ success: false, error: 'Cannot transfer money to the exact same account.' });
      }
      toAccount = await prisma.account.findFirst({
        where: { id: validated.toAccountId, userId }
      });
      if (!toAccount) {
        return res.status(404).json({ success: false, error: 'Destination account not found.' });
      }
    }

    // Determine Original Currency & Convert to Reporting Base
    const originalCurrency = (validated.currency || account.currency || 'INR').toUpperCase();
    const origMeta = CurrencyService.getMetadata(originalCurrency);
    const conversion = CurrencyService.convert(validated.amount, originalCurrency, userReportingCurrency);

    // Convert transaction amount into the account's native currency for balance adjustments
    const accCurrency = (account.currency || 'INR').toUpperCase();
    const accountAmtConv = CurrencyService.convert(validated.amount, originalCurrency, accCurrency);
    const balanceAdjustmentAmount = accountAmtConv.convertedAmount;

    // Execute in DB Transaction to ensure balance consistency
    const transaction = await prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          accountId: validated.accountId,
          toAccountId: validated.toAccountId || null,
          categoryId: validated.categoryId || null,
          amount: validated.amount, // Exact original amount
          currency: originalCurrency, // Exact original currency
          currencySymbol: origMeta.symbol,
          baseCurrency: userReportingCurrency,
          exchangeRate: conversion.exchangeRate,
          convertedAmount: conversion.convertedAmount,
          exchangeRateTimestamp: conversion.timestamp,
          needsReconciliation: false,
          type: validated.type,
          date: new Date(validated.date),
          notes: validated.notes || null,
          receiptUrl: validated.receiptUrl || null,
          isRecurring: validated.isRecurring
        },
        include: {
          account: { select: { id: true, name: true, currency: true } },
          toAccount: { select: { id: true, name: true, currency: true } },
          category: { select: { id: true, name: true, icon: true, color: true } }
        }
      });

      // Update Account Balances in native account currency
      if (validated.type === 'EXPENSE' || validated.type === 'INVESTMENT' || validated.type === 'LOAN_PAYMENT') {
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { decrement: balanceAdjustmentAmount } }
        });
      } else if (validated.type === 'INCOME' || validated.type === 'REFUND') {
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: balanceAdjustmentAmount } }
        });
      } else if (validated.type === 'TRANSFER' && toAccount) {
        const toAccCurrency = (toAccount.currency || 'INR').toUpperCase();
        const toAccAmtConv = CurrencyService.convert(validated.amount, originalCurrency, toAccCurrency);

        await tx.account.update({
          where: { id: account.id },
          data: { balance: { decrement: balanceAdjustmentAmount } }
        });
        await tx.account.update({
          where: { id: toAccount.id },
          data: { balance: { increment: toAccAmtConv.convertedAmount } }
        });
      }

      return createdTx;
    });

    // Broadcast Real-Time Event to connected clients
    realtimeHub.broadcastToUser(userId, {
      type: 'TRANSACTION_CREATED',
      action: 'CREATE',
      data: transaction,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({ success: true, transaction });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Failed to record transaction.' });
  }
};

export const updateTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validated = updateTransactionSchema.parse(req.body);

    const existingTx = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { account: true, toAccount: true }
    });

    if (!existingTx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    const updatedAccount = validated.accountId
      ? await prisma.account.findFirst({ where: { id: validated.accountId, userId } })
      : existingTx.account;

    if (!updatedAccount) {
      return res.status(404).json({ success: false, error: 'Account not found.' });
    }

    const newAmount = validated.amount !== undefined ? validated.amount : existingTx.amount;
    const newCurrency = (validated.currency || existingTx.currency || 'INR').toUpperCase();
    const origMeta = CurrencyService.getMetadata(newCurrency);
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
    const userReportingCurrency = (user?.currency || 'INR').toUpperCase();

    const conversion = CurrencyService.convert(newAmount, newCurrency, userReportingCurrency);

    const updatedTx = await prisma.$transaction(async (tx) => {
      // 1. Revert Old Transaction's Account Balance Impact
      const oldAccCurrency = (existingTx.account.currency || 'INR').toUpperCase();
      const oldAccAmt = CurrencyService.convert(existingTx.amount, existingTx.currency, oldAccCurrency).convertedAmount;

      if (existingTx.type === 'EXPENSE' || existingTx.type === 'INVESTMENT' || existingTx.type === 'LOAN_PAYMENT') {
        await tx.account.update({ where: { id: existingTx.accountId }, data: { balance: { increment: oldAccAmt } } });
      } else if (existingTx.type === 'INCOME' || existingTx.type === 'REFUND') {
        await tx.account.update({ where: { id: existingTx.accountId }, data: { balance: { decrement: oldAccAmt } } });
      } else if (existingTx.type === 'TRANSFER' && existingTx.toAccountId && existingTx.toAccount) {
        const oldToAccCurrency = (existingTx.toAccount.currency || 'INR').toUpperCase();
        const oldToAccAmt = CurrencyService.convert(existingTx.amount, existingTx.currency, oldToAccCurrency).convertedAmount;
        await tx.account.update({ where: { id: existingTx.accountId }, data: { balance: { increment: oldAccAmt } } });
        await tx.account.update({ where: { id: existingTx.toAccountId }, data: { balance: { decrement: oldToAccAmt } } });
      }

      // 2. Apply New Transaction's Account Balance Impact
      const newAccCurrency = (updatedAccount.currency || 'INR').toUpperCase();
      const newAccAmt = CurrencyService.convert(newAmount, newCurrency, newAccCurrency).convertedAmount;
      const targetType = validated.type || existingTx.type;

      if (targetType === 'EXPENSE' || targetType === 'INVESTMENT' || targetType === 'LOAN_PAYMENT') {
        await tx.account.update({ where: { id: updatedAccount.id }, data: { balance: { decrement: newAccAmt } } });
      } else if (targetType === 'INCOME' || targetType === 'REFUND') {
        await tx.account.update({ where: { id: updatedAccount.id }, data: { balance: { increment: newAccAmt } } });
      }

      // 3. Update Database Transaction Record
      return await tx.transaction.update({
        where: { id },
        data: {
          accountId: updatedAccount.id,
          toAccountId: validated.toAccountId !== undefined ? validated.toAccountId : existingTx.toAccountId,
          categoryId: validated.categoryId !== undefined ? validated.categoryId : existingTx.categoryId,
          amount: newAmount,
          currency: newCurrency,
          currencySymbol: origMeta.symbol,
          baseCurrency: userReportingCurrency,
          exchangeRate: conversion.exchangeRate,
          convertedAmount: conversion.convertedAmount,
          exchangeRateTimestamp: conversion.timestamp,
          type: targetType,
          date: validated.date ? new Date(validated.date) : existingTx.date,
          notes: validated.notes !== undefined ? validated.notes : existingTx.notes,
          receiptUrl: validated.receiptUrl !== undefined ? validated.receiptUrl : existingTx.receiptUrl,
          isRecurring: validated.isRecurring !== undefined ? validated.isRecurring : existingTx.isRecurring
        },
        include: {
          account: { select: { id: true, name: true, currency: true } },
          toAccount: { select: { id: true, name: true, currency: true } },
          category: { select: { id: true, name: true, icon: true, color: true } }
        }
      });
    });

    // Broadcast Real-Time Event
    realtimeHub.broadcastToUser(userId, {
      type: 'TRANSACTION_UPDATED',
      action: 'UPDATE',
      data: updatedTx,
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, transaction: updatedTx });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Failed to update transaction.' });
  }
};

export const deleteTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existingTx = await prisma.transaction.findFirst({
      where: { id, userId },
      include: { account: true, toAccount: true }
    });
    if (!existingTx) {
      return res.status(404).json({ success: false, error: 'Transaction not found.' });
    }

    await prisma.$transaction(async (tx) => {
      const accCurrency = (existingTx.account.currency || 'INR').toUpperCase();
      const accAmt = CurrencyService.convert(existingTx.amount, existingTx.currency, accCurrency).convertedAmount;

      // Reverse balance updates
      if (existingTx.type === 'EXPENSE' || existingTx.type === 'INVESTMENT' || existingTx.type === 'LOAN_PAYMENT') {
        await tx.account.update({
          where: { id: existingTx.accountId },
          data: { balance: { increment: accAmt } }
        });
      } else if (existingTx.type === 'INCOME' || existingTx.type === 'REFUND') {
        await tx.account.update({
          where: { id: existingTx.accountId },
          data: { balance: { decrement: accAmt } }
        });
      } else if (existingTx.type === 'TRANSFER' && existingTx.toAccountId && existingTx.toAccount) {
        const toAccCurrency = (existingTx.toAccount.currency || 'INR').toUpperCase();
        const toAccAmt = CurrencyService.convert(existingTx.amount, existingTx.currency, toAccCurrency).convertedAmount;
        await tx.account.update({
          where: { id: existingTx.accountId },
          data: { balance: { increment: accAmt } }
        });
        await tx.account.update({
          where: { id: existingTx.toAccountId },
          data: { balance: { decrement: toAccAmt } }
        });
      }

      await tx.transaction.delete({ where: { id } });
    });

    // Broadcast Real-Time Event
    realtimeHub.broadcastToUser(userId, {
      type: 'TRANSACTION_DELETED',
      action: 'DELETE',
      data: { id },
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, message: 'Transaction deleted and balances recalculated.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete transaction.' });
  }
};

export const exportTransactionsCSV = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      include: {
        account: { select: { name: true } },
        toAccount: { select: { name: true } },
        category: { select: { name: true } }
      },
      orderBy: { date: 'desc' }
    });

    const records = transactions.map((t) => ({
      Date: t.date.toISOString().split('T')[0],
      Type: t.type,
      'Original Amount': t.amount,
      'Original Currency': t.currency || 'INR',
      'Reporting Amount (INR)': t.convertedAmount || t.amount,
      'Exchange Rate': t.exchangeRate || 1.0,
      Category: t.category?.name || 'Uncategorized',
      Account: t.account?.name || '',
      Notes: t.notes || ''
    }));

    const csvOutput = stringify(records, { header: true });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="aura_transactions_ledger.csv"');
    res.send(csvOutput);
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to export CSV.' });
  }
};

export const importTransactionsCSV = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded.' });
    }

    const defaultAccount = await prisma.account.findFirst({ where: { userId, isActive: true } });
    if (!defaultAccount) {
      return res.status(400).json({ success: false, error: 'No active account found to link imported transactions.' });
    }

    const fileContent = req.file.buffer.toString('utf-8');
    const records: any[] = parse(fileContent, { columns: true, skip_empty_lines: true, trim: true });

    let importedCount = 0;
    for (const record of records) {
      const amount = parseFloat(record.Amount || record.amount || '0');
      const currency = (record.Currency || record.currency || defaultAccount.currency || 'INR').toUpperCase();
      const type = (record.Type || record.type || 'EXPENSE').toUpperCase();
      const date = record.Date || record.date ? new Date(record.Date || record.date) : new Date();
      const notes = record.Notes || record.notes || record.Description || record.description || 'Imported Transaction';

      if (!amount || isNaN(amount)) continue;

      const origMeta = CurrencyService.getMetadata(currency);
      const conversion = CurrencyService.convert(amount, currency, 'INR');

      await prisma.$transaction(async (tx) => {
        await tx.transaction.create({
          data: {
            userId,
            accountId: defaultAccount.id,
            amount,
            currency,
            currencySymbol: origMeta.symbol,
            baseCurrency: 'INR',
            exchangeRate: conversion.exchangeRate,
            convertedAmount: conversion.convertedAmount,
            type,
            date,
            notes
          }
        });

        const accCurrency = (defaultAccount.currency || 'INR').toUpperCase();
        const accAmt = CurrencyService.convert(amount, currency, accCurrency).convertedAmount;

        if (type === 'INCOME') {
          await tx.account.update({ where: { id: defaultAccount.id }, data: { balance: { increment: accAmt } } });
        } else if (type === 'EXPENSE') {
          await tx.account.update({ where: { id: defaultAccount.id }, data: { balance: { decrement: accAmt } } });
        }
      });
      importedCount++;
    }

    realtimeHub.broadcastToUser(userId, {
      type: 'TRANSACTION_CREATED',
      action: 'IMPORT',
      data: { count: importedCount },
      timestamp: new Date().toISOString()
    });

    res.json({ success: true, count: importedCount, message: `Successfully imported ${importedCount} transactions.` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to parse and import CSV file.' });
  }
};

export const simulateLiveTransaction = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const account = await prisma.account.findFirst({
      where: { userId, isActive: true },
      orderBy: { balance: 'desc' }
    });
    if (!account) {
      return res.status(400).json({ success: false, error: 'No active account found for simulating transaction.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { currency: true } });
    const userReportingCurrency = (user?.currency || 'INR').toUpperCase();

    const categories = await prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId }] }
    });

    // Realistic multi-currency sample transactions: INR and USD
    const samples = [
      { notes: 'Blinkit Superfast — Weekly Organic Groceries', amount: 1850.00, currency: 'INR', type: 'EXPENSE', catName: 'Groceries' },
      { notes: 'Netflix 4K Ultra HD Subscription', amount: 19.99, currency: 'USD', type: 'EXPENSE', catName: 'Subscriptions' },
      { notes: 'Amazon India — Workstation Accessories', amount: 2450.00, currency: 'INR', type: 'EXPENSE', catName: 'Shopping' },
      { notes: 'Stripe Payout — US Client Software Milestone', amount: 1250.00, currency: 'USD', type: 'INCOME', catName: 'Salary' },
      { notes: 'GitHub Copilot Enterprise License', amount: 21.00, currency: 'USD', type: 'EXPENSE', catName: 'Subscriptions' },
      { notes: 'Swiggy Gourmet — Family Dinner Delivery', amount: 1420.00, currency: 'INR', type: 'EXPENSE', catName: 'Groceries' },
      { notes: 'Tata Power EV Fast Charging Station', amount: 650.00, currency: 'INR', type: 'EXPENSE', catName: 'Transportation' },
      { notes: 'Upwork Global Direct Escrow Wire', amount: 450.00, currency: 'USD', type: 'INCOME', catName: 'Salary' }
    ];

    const pick = samples[Math.floor(Math.random() * samples.length)];
    const category = categories.find((c) => c.name.toLowerCase().includes(pick.catName.toLowerCase())) || categories[0];

    const origMeta = CurrencyService.getMetadata(pick.currency);
    const conversion = CurrencyService.convert(pick.amount, pick.currency, userReportingCurrency);

    // Convert transaction amount into the account's native currency
    const accCurrency = (account.currency || 'INR').toUpperCase();
    const accountAmt = CurrencyService.convert(pick.amount, pick.currency, accCurrency).convertedAmount;

    const transaction = await prisma.$transaction(async (tx) => {
      const createdTx = await tx.transaction.create({
        data: {
          userId,
          accountId: account.id,
          categoryId: category?.id || null,
          amount: pick.amount,
          currency: pick.currency,
          currencySymbol: origMeta.symbol,
          baseCurrency: userReportingCurrency,
          exchangeRate: conversion.exchangeRate,
          convertedAmount: conversion.convertedAmount,
          exchangeRateTimestamp: conversion.timestamp,
          needsReconciliation: false,
          type: pick.type,
          date: new Date(),
          notes: pick.notes,
          isRecurring: false
        },
        include: {
          account: { select: { id: true, name: true, currency: true } },
          category: { select: { id: true, name: true, icon: true, color: true } }
        }
      });

      if (pick.type === 'INCOME') {
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { increment: accountAmt } }
        });
      } else {
        await tx.account.update({
          where: { id: account.id },
          data: { balance: { decrement: accountAmt } }
        });
      }

      return createdTx;
    });

    // Broadcast Real-Time Event
    realtimeHub.broadcastToUser(userId, {
      type: 'TRANSACTION_CREATED',
      action: 'SIMULATE',
      data: transaction,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: `Live transaction processed: ${origMeta.symbol}${pick.amount} ${pick.currency} (≈ ₹${conversion.convertedAmount.toFixed(2)} INR)`,
      transaction
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to simulate live transaction.' });
  }
};
