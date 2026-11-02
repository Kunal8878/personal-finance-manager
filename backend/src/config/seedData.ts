import { prisma } from './db';
import { CurrencyService } from '../services/currencyService';

export async function seedUserData(userId: string) {
  // Update user default reporting currency to INR
  await prisma.user.update({
    where: { id: userId },
    data: { currency: 'INR' }
  });

  // Ensure default categories exist
  const categories = await prisma.category.findMany({
    where: { OR: [{ userId: null }, { userId }] }
  });

  const getCat = (name: string, fallbackType: string = 'EXPENSE') => {
    return categories.find((c) => c.name.toLowerCase().includes(name.toLowerCase())) || categories[0];
  };

  const salaryCat = getCat('Salary', 'INCOME');
  const freelanceCat = getCat('Freelance', 'INCOME') || salaryCat;
  const groceryCat = getCat('Groceries', 'EXPENSE');
  const rentCat = getCat('Housing', 'EXPENSE');
  const utilCat = getCat('Utilities', 'EXPENSE');
  const transportCat = getCat('Transportation', 'EXPENSE');
  const entertainCat = getCat('Entertainment', 'EXPENSE');
  const shoppingCat = getCat('Shopping', 'EXPENSE');
  const subCat = getCat('Subscriptions', 'EXPENSE');

  // 1. Clean previous records for clean re-seeding
  await prisma.transaction.deleteMany({ where: { userId } });
  await prisma.budget.deleteMany({ where: { userId } });
  await prisma.goal.deleteMany({ where: { userId } });
  await prisma.investment.deleteMany({ where: { userId } });
  await prisma.loan.deleteMany({ where: { userId } });
  await prisma.subscription.deleteMany({ where: { userId } });
  await prisma.account.deleteMany({ where: { userId } });

  // 2. Create Accounts (Multi-Currency: INR and USD accounts)
  const hdfc = await prisma.account.create({
    data: {
      userId,
      name: 'HDFC Bank (Premier Savings)',
      type: 'SAVINGS',
      institution: 'HDFC Bank',
      balance: 245000.00,
      currency: 'INR'
    }
  });

  const icici = await prisma.account.create({
    data: {
      userId,
      name: 'ICICI Bank (Wealth Checking)',
      type: 'BANK',
      institution: 'ICICI Bank',
      balance: 180000.00,
      currency: 'INR'
    }
  });

  const sbi = await prisma.account.create({
    data: {
      userId,
      name: 'State Bank of India (Emergency Reserve)',
      type: 'SAVINGS',
      institution: 'SBI',
      balance: 120000.00,
      currency: 'INR'
    }
  });

  const creditCard = await prisma.account.create({
    data: {
      userId,
      name: 'Axis Bank Burgundy Card',
      type: 'CREDIT_CARD',
      institution: 'Axis Bank',
      balance: 14200.00,
      currency: 'INR'
    }
  });

  const usdAccount = await prisma.account.create({
    data: {
      userId,
      name: 'Silicon Valley Remittance Vault',
      type: 'BANK',
      institution: 'Global Remittance',
      balance: 3500.00,
      currency: 'USD'
    }
  });

  // 3. Budgets (in base INR)
  const startOfMonth = new Date(2026, 10, 1);
  const endOfMonth = new Date(2026, 10, 30, 23, 59, 59);

  if (groceryCat) {
    await prisma.budget.create({
      data: {
        userId,
        categoryId: groceryCat.id,
        amount: 25000.00,
        period: 'MONTHLY',
        startDate: startOfMonth,
        endDate: endOfMonth
      }
    });
  }
  if (rentCat) {
    await prisma.budget.create({
      data: {
        userId,
        categoryId: rentCat.id,
        amount: 50000.00,
        period: 'MONTHLY',
        startDate: startOfMonth,
        endDate: endOfMonth
      }
    });
  }
  if (entertainCat) {
    await prisma.budget.create({
      data: {
        userId,
        categoryId: entertainCat.id,
        amount: 15000.00,
        period: 'MONTHLY',
        startDate: startOfMonth,
        endDate: endOfMonth
      }
    });
  }
  if (utilCat) {
    await prisma.budget.create({
      data: {
        userId,
        categoryId: utilCat.id,
        amount: 8000.00,
        period: 'MONTHLY',
        startDate: startOfMonth,
        endDate: endOfMonth
      }
    });
  }

  // 4. Financial Goals
  await prisma.goal.createMany({
    data: [
      {
        userId,
        name: 'Private Wealth Liquidity Vault (12M)',
        targetAmount: 1500000.00,
        currentAmount: 950000.00,
        targetDate: new Date(2027, 11, 31),
        category: 'EMERGENCY_FUND'
      },
      {
        userId,
        name: 'Commercial Real Estate Equity',
        targetAmount: 5000000.00,
        currentAmount: 2200000.00,
        targetDate: new Date(2028, 5, 30),
        category: 'HOME'
      },
      {
        userId,
        name: 'Alpine Skiing & Swiss Retreat',
        targetAmount: 450000.00,
        currentAmount: 310000.00,
        targetDate: new Date(2027, 2, 15),
        category: 'VACATION'
      }
    ]
  });

  // 5. Investments (in INR)
  await prisma.investment.createMany({
    data: [
      {
        userId,
        name: 'Nifty 50 Index Mutual Fund',
        type: 'MUTUAL_FUNDS',
        investedAmount: 500000.00,
        currentValue: 645000.00
      },
      {
        userId,
        name: 'Tata & Reliance Blue Chip Equities',
        type: 'STOCKS',
        investedAmount: 350000.00,
        currentValue: 420000.00
      },
      {
        userId,
        name: 'Sovereign Gold Bonds Series IV',
        type: 'GOLD',
        investedAmount: 200000.00,
        currentValue: 242000.00
      }
    ]
  });

  // 6. Loans
  await prisma.loan.create({
    data: {
      userId,
      name: 'Luxury Sedan Green Auto Loan',
      type: 'BORROWED',
      principal: 1200000.00,
      interestRate: 8.2,
      tenureMonths: 48,
      emiAmount: 29400.00,
      remainingPrincipal: 680000.00,
      startDate: new Date(2025, 3, 1)
    }
  });

  // 7. Subscriptions
  await prisma.subscription.createMany({
    data: [
      {
        userId,
        name: 'Bloomberg Terminal Professional',
        cost: 2000.00,
        billingCycle: 'MONTHLY',
        nextBillingDate: new Date(2026, 10, 15),
        categoryId: subCat?.id,
        accountId: creditCard.id,
        isActive: true
      },
      {
        userId,
        name: 'Netflix 4K Ultra HD',
        cost: 649.00,
        billingCycle: 'MONTHLY',
        nextBillingDate: new Date(2026, 10, 20),
        categoryId: subCat?.id,
        accountId: creditCard.id,
        isActive: true
      },
      {
        userId,
        name: 'GitHub Enterprise Suite',
        cost: 1750.00,
        billingCycle: 'MONTHLY',
        nextBillingDate: new Date(2026, 10, 28),
        categoryId: subCat?.id,
        accountId: creditCard.id,
        isActive: true
      }
    ]
  });

  // 8. Multi-Currency Transactions
  // Includes exact user-required examples:
  // - Grocery: ₹2,000 INR
  // - Online subscription: $15 USD
  // - Shopping: ₹1,500 INR
  // - Software subscription: $25 USD
  const txList: any[] = [];

  const addTx = (account: any, category: any, amount: number, currency: string, type: string, date: Date, notes: string) => {
    const origMeta = CurrencyService.getMetadata(currency);
    const conv = CurrencyService.convert(amount, currency, 'INR');

    txList.push({
      userId,
      accountId: account.id,
      categoryId: category?.id || null,
      amount, // Exact original amount
      currency, // Exact original currency (INR, USD, etc.)
      currencySymbol: origMeta.symbol,
      baseCurrency: 'INR',
      exchangeRate: conv.exchangeRate,
      convertedAmount: conv.convertedAmount,
      exchangeRateTimestamp: conv.timestamp,
      needsReconciliation: false,
      type,
      date,
      notes,
      isRecurring: type === 'INCOME' && amount > 50000
    });
  };

  // --- Current Month (November 2026) ---
  addTx(hdfc, salaryCat, 185000.00, 'INR', 'INCOME', new Date(2026, 10, 1, 9, 30), 'Aura Wealth Advisory — Monthly Retainer');
  addTx(usdAccount, freelanceCat, 1250.00, 'USD', 'INCOME', new Date(2026, 10, 2, 14, 0), 'Silicon Valley Corp — US Client Consulting Wire');
  addTx(hdfc, rentCat, 45000.00, 'INR', 'EXPENSE', new Date(2026, 10, 1, 11, 0), 'Luxury Penthouse Residence — Monthly Lease');
  addTx(creditCard, groceryCat, 2000.00, 'INR', 'EXPENSE', new Date(2026, 10, 2, 18, 30), 'Nature’s Basket — Organic Grocery Run');
  addTx(creditCard, subCat, 15.00, 'USD', 'EXPENSE', new Date(2026, 10, 2, 12, 15), 'Netflix Premium Family — Online Subscription');
  addTx(creditCard, shoppingCat, 1500.00, 'INR', 'EXPENSE', new Date(2026, 10, 2, 19, 10), 'FabIndia Heritage Collection — Shopping');
  addTx(usdAccount, subCat, 25.00, 'USD', 'EXPENSE', new Date(2026, 10, 2, 15, 0), 'GitHub Copilot Enterprise — Software Subscription');
  addTx(hdfc, utilCat, 3850.00, 'INR', 'EXPENSE', new Date(2026, 10, 2, 10, 15), 'Tata Power & Gigabit Fiber Connectivity');
  addTx(creditCard, entertainCat, 4200.00, 'INR', 'EXPENSE', new Date(2026, 10, 2, 20, 0), 'The Oberoi Grill — Private Dining');
  addTx(creditCard, transportCat, 2800.00, 'INR', 'EXPENSE', new Date(2026, 10, 2, 8, 30), 'Shell Select EV Supercharging');

  // --- Prior Month (October 2026) ---
  addTx(hdfc, salaryCat, 185000.00, 'INR', 'INCOME', new Date(2026, 9, 1, 9, 30), 'Aura Wealth Advisory — Monthly Retainer');
  addTx(hdfc, rentCat, 45000.00, 'INR', 'EXPENSE', new Date(2026, 9, 1, 11, 0), 'Luxury Penthouse Residence — Monthly Lease');
  addTx(creditCard, groceryCat, 12500.00, 'INR', 'EXPENSE', new Date(2026, 9, 6, 16, 15), 'Gourmet Food Hall — Monthly Staples');
  addTx(usdAccount, subCat, 15.00, 'USD', 'EXPENSE', new Date(2026, 9, 7, 10, 0), 'Spotify HiFi Duo — Online Subscription');
  addTx(usdAccount, subCat, 25.00, 'USD', 'EXPENSE', new Date(2026, 9, 8, 12, 0), 'Linear App Software Subscription');
  addTx(creditCard, shoppingCat, 18500.00, 'INR', 'EXPENSE', new Date(2026, 9, 14, 15, 0), 'Montblanc Bespoke Pen & Notebooks');
  addTx(hdfc, utilCat, 4100.00, 'INR', 'EXPENSE', new Date(2026, 9, 10, 10, 0), 'State Electricity & Utility Auto-Debit');
  addTx(creditCard, entertainCat, 8500.00, 'INR', 'EXPENSE', new Date(2026, 9, 21, 21, 30), 'Symphony Concert & Fine Dining');

  // --- Two Months Ago (September 2026) ---
  addTx(hdfc, salaryCat, 185000.00, 'INR', 'INCOME', new Date(2026, 8, 1, 9, 30), 'Aura Wealth Advisory — Monthly Retainer');
  addTx(usdAccount, freelanceCat, 2500.00, 'USD', 'INCOME', new Date(2026, 8, 15, 12, 0), 'European Client Advisory Wire');
  addTx(hdfc, rentCat, 45000.00, 'INR', 'EXPENSE', new Date(2026, 8, 1, 11, 0), 'Luxury Penthouse Residence — Monthly Lease');
  addTx(creditCard, groceryCat, 9800.00, 'INR', 'EXPENSE', new Date(2026, 8, 5, 14, 0), 'Organic Supermarket Provisions');
  addTx(usdAccount, subCat, 15.00, 'USD', 'EXPENSE', new Date(2026, 8, 10, 10, 0), 'Streaming Media Subscription');
  addTx(creditCard, shoppingCat, 7500.00, 'INR', 'EXPENSE', new Date(2026, 8, 18, 17, 30), 'Artisan Leather Travel Bag');
  addTx(hdfc, utilCat, 3900.00, 'INR', 'EXPENSE', new Date(2026, 8, 12, 11, 0), 'High-Speed Fiber Infrastructure');

  await prisma.transaction.createMany({ data: txList });

  console.log(`[Seed] Seeded ${txList.length} authentic multi-currency transactions, accounts, and budgets for user ${userId}`);
  return { txCount: txList.length };
}

export async function seedAllRegisteredUsers() {
  const users = await prisma.user.findMany();
  console.log(`[Seed] Seeding multi-currency private wealth data for all ${users.length} users...`);
  for (const user of users) {
    await seedUserData(user.id);
  }
  return users.length;
}
