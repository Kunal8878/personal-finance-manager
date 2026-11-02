import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { AccountAggregatorService } from '../services/accountAggregator';

export const discoverAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const { pan, aadhaar } = req.body;

    if (!pan || !AccountAggregatorService.validatePAN(pan)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid PAN format. Please enter a valid 10-character PAN (e.g. ABCDE1234F).'
      });
    }

    if (aadhaar && !AccountAggregatorService.validateAadhaar(aadhaar)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Aadhaar format. Please enter a valid 12-digit Aadhaar number.'
      });
    }

    const discovery = AccountAggregatorService.discoverLinkedAccounts(pan, aadhaar);

    res.json({
      success: true,
      maskedPan: discovery.maskedPan,
      maskedAadhaar: discovery.maskedAadhaar,
      discoveredAccounts: discovery.discoveredAccounts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to discover bank accounts via Account Aggregator.' });
  }
};

export const confirmBankLink = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { pan, aadhaar, accountsToLink } = req.body;

    if (!Array.isArray(accountsToLink) || accountsToLink.length === 0) {
      return res.status(400).json({ success: false, error: 'Select at least one discovered account to import.' });
    }

    const maskedPan = pan ? AccountAggregatorService.maskPAN(pan) : undefined;
    const maskedAadhaar = aadhaar ? AccountAggregatorService.maskAadhaar(aadhaar) : undefined;

    // Update User profile with linked PAN / Aadhaar
    await prisma.user.update({
      where: { id: userId },
      data: {
        ...(maskedPan && { panMasked: maskedPan }),
        ...(maskedAadhaar && { aadhaarMasked: maskedAadhaar })
      }
    });

    const importedAccounts = [];

    for (const acc of accountsToLink) {
      const type = acc.type || acc.accountType || 'SAVINGS';
      const balance = typeof acc.estimatedBalance === 'number' ? acc.estimatedBalance : (typeof acc.balance === 'number' ? acc.balance : 0.0);
      const created = await prisma.account.create({
        data: {
          userId,
          name: `${acc.institution} (${type})`,
          type,
          institution: acc.institution,
          balance,
          currency: acc.currency || 'USD'
        }
      });

      // Automatically generate & fetch 3 months of bank statement transactions!
      await AccountAggregatorService.generateBankStatementHistory(
        userId,
        created.id,
        acc.institution
      );

      importedAccounts.push(created);
    }

    res.json({
      success: true,
      message: `Successfully linked ${importedAccounts.length} bank accounts and imported 3 months of statement transaction history!`,
      accounts: importedAccounts
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to confirm bank link consent and statement history sync.' });
  }
};
