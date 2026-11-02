import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { accountSchema } from '../utils/validators';

export const getAccounts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const accounts = await prisma.account.findMany({
      where: { userId, isActive: true },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ success: true, accounts });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch accounts.' });
  }
};

export const createAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validated = accountSchema.parse(req.body);

    const account = await prisma.account.create({
      data: {
        userId,
        name: validated.name,
        type: validated.type,
        institution: validated.institution,
        balance: validated.balance,
        currency: validated.currency
      }
    });

    res.status(201).json({ success: true, account });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Failed to create account.' });
  }
};

export const updateAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const validated = accountSchema.partial().parse(req.body);

    const existing = await prisma.account.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Account not found or unauthorized.' });
    }

    const updated = await prisma.account.update({
      where: { id },
      data: validated
    });

    res.json({ success: true, account: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update account.' });
  }
};

export const deleteAccount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.account.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Account not found or unauthorized.' });
    }

    // Soft delete by setting isActive to false
    await prisma.account.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete account.' });
  }
};
