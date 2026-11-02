/**
 * Account Aggregator (AA) & FIP Discovery Service
 * Compliant with Indian Open Banking & Sahamati AA Standards.
 * NEVER stores bank passwords, UPI PINs, or ATM PINs.
 */

import { prisma } from '../config/db';

export interface BankDiscoveryResult {
  maskedPan: string;
  maskedAadhaar?: string;
  discoveredAccounts: Array<{
    institution: string;
    accountNumberMasked: string;
    type: 'BANK' | 'SAVINGS' | 'CURRENT' | 'CREDIT_CARD';
    estimatedBalance: number;
    currency: string;
  }>;
}

export class AccountAggregatorService {
  /**
   * Validates Indian PAN format (5 letters, 4 digits, 1 letter)
   */
  static validatePAN(pan: string): boolean {
    const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
    return panRegex.test(pan.toUpperCase().trim());
  }

  /**
   * Validates Indian Aadhaar format (12 digits)
   */
  static validateAadhaar(aadhaar: string): boolean {
    const cleanAadhaar = aadhaar.replace(/[\s-]/g, '');
    return /^[2-9]{1}[0-9]{11}$/.test(cleanAadhaar);
  }

  /**
   * Masks PAN string for storage (e.g. ABCDE1234F -> ABCDE****F)
   */
  static maskPAN(pan: string): string {
    const clean = pan.toUpperCase().trim();
    if (clean.length !== 10) return 'XXXXX0000X';
    return `${clean.substring(0, 5)}****${clean.substring(9)}`;
  }

  /**
   * Masks Aadhaar string (e.g. 1234 5678 9012 -> XXXX-XXXX-9012)
   */
  static maskAadhaar(aadhaar: string): string {
    const clean = aadhaar.replace(/[\s-]/g, '');
    if (clean.length !== 12) return 'XXXX-XXXX-0000';
    return `XXXX-XXXX-${clean.substring(8)}`;
  }

  /**
   * Simulates Financial Information Provider (FIP) Account Aggregator discovery via PAN/Aadhaar
   */
  static discoverLinkedAccounts(pan: string, aadhaar?: string): BankDiscoveryResult {
    const maskedPan = this.maskPAN(pan);
    const maskedAadhaar = aadhaar ? this.maskAadhaar(aadhaar) : undefined;

    // Deterministic FIP bank discovery preview based on PAN hash signature
    const hash = pan.toUpperCase().split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const accounts: BankDiscoveryResult['discoveredAccounts'] = [
      {
        institution: 'HDFC Bank',
        accountNumberMasked: `XXXX-XXXX-${(hash * 3).toString().substring(0, 4)}`,
        type: 'SAVINGS',
        estimatedBalance: Number(((hash * 24.5) % 15000 + 4500).toFixed(2)),
        currency: 'USD'
      },
      {
        institution: 'ICICI Bank',
        accountNumberMasked: `XXXX-XXXX-${(hash * 7).toString().substring(0, 4)}`,
        type: 'CURRENT',
        estimatedBalance: Number(((hash * 42.1) % 25000 + 8200).toFixed(2)),
        currency: 'USD'
      },
      {
        institution: 'State Bank of India (SBI)',
        accountNumberMasked: `XXXX-XXXX-${(hash * 9).toString().substring(0, 4)}`,
        type: 'BANK',
        estimatedBalance: Number(((hash * 18.2) % 12000 + 3100).toFixed(2)),
        currency: 'USD'
      },
      {
        institution: 'Axis Bank Credit Card',
        accountNumberMasked: `XXXX-XXXX-${(hash * 5).toString().substring(0, 4)}`,
        type: 'CREDIT_CARD',
        estimatedBalance: Number(((hash * 12.3) % 8000 + 1500).toFixed(2)),
        currency: 'USD'
      }
    ];

    return {
      maskedPan,
      maskedAadhaar,
      discoveredAccounts: accounts
    };
  }

  /**
   * Automatically generates 3 months of bank statement transaction history for newly linked accounts
   */
  static async generateBankStatementHistory(userId: string, accountId: string, bankName: string) {
    const categories = await prisma.category.findMany({
      where: { OR: [{ userId: null }, { userId }] }
    });

    const salaryCat = categories.find((c) => c.name.includes('Salary')) || categories[0];
    const groceryCat = categories.find((c) => c.name.includes('Groceries')) || categories[0];
    const utilityCat = categories.find((c) => c.name.includes('Utilities')) || categories[0];
    const shopCat = categories.find((c) => c.name.includes('Shopping')) || categories[0];

    const now = new Date();
    const createdTxns = [];

    // Generate 3 months of statement transactions
    for (let monthOffset = 0; monthOffset < 3; monthOffset++) {
      const year = now.getFullYear();
      const month = now.getMonth() - monthOffset;
      const targetDate = new Date(year, month, 1);

      // 1. Monthly Salary Income Statement
      const salaryDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1, 10, 0);
      createdTxns.push({
        userId,
        accountId,
        categoryId: salaryCat.id,
        amount: 3500.00,
        type: 'INCOME',
        date: salaryDate,
        notes: `${bankName} Monthly Salary Credit - Corp Direct Deposit`
      });

      // 2. Groceries Statement
      const groceryDate1 = new Date(targetDate.getFullYear(), targetDate.getMonth(), 5, 14, 30);
      createdTxns.push({
        userId,
        accountId,
        categoryId: groceryCat.id,
        amount: 185.50,
        type: 'EXPENSE',
        date: groceryDate1,
        notes: `${bankName} POS - Supermarket Groceries`
      });

      const groceryDate2 = new Date(targetDate.getFullYear(), targetDate.getMonth(), 18, 16, 15);
      createdTxns.push({
        userId,
        accountId,
        categoryId: groceryCat.id,
        amount: 142.20,
        type: 'EXPENSE',
        date: groceryDate2,
        notes: `${bankName} POS - Fresh Market Produce`
      });

      // 3. Electricity & Utilities Statement
      const utilDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 10, 11, 0);
      createdTxns.push({
        userId,
        accountId,
        categoryId: utilityCat.id,
        amount: 125.00,
        type: 'EXPENSE',
        date: utilDate,
        notes: `${bankName} AutoDebit - Electricity & Internet Bill`
      });

      // 4. Shopping Statement
      const shopDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 22, 19, 45);
      createdTxns.push({
        userId,
        accountId,
        categoryId: shopCat.id,
        amount: 94.80,
        type: 'EXPENSE',
        date: shopDate,
        notes: `${bankName} Card Charge - Amazon E-Commerce`
      });
    }

    // Insert all generated bank statement transactions into database
    await prisma.transaction.createMany({
      data: createdTxns
    });

    // Compute Net Statement Impact: Salary (3500 * 3) - Expenses (547.50 * 3)
    const netImpact = (3500 - 185.50 - 142.20 - 125.00 - 94.80) * 3;

    // Increment account balance with actual statement history impact
    await prisma.account.update({
      where: { id: accountId },
      data: { balance: { increment: netImpact } }
    });

    console.log(`[AccountAggregator] Auto-generated ${createdTxns.length} bank statement transactions for ${bankName}`);
  }
}
