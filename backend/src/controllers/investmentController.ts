import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { investmentSchema } from '../utils/validators';

export const getInvestments = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const investments = await prisma.investment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    let totalInvested = 0;
    let totalCurrentValue = 0;

    const enriched = investments.map((inv) => {
      totalInvested += inv.investedAmount;
      totalCurrentValue += inv.currentValue;

      const pnl = Number((inv.currentValue - inv.investedAmount).toFixed(2));
      const pnlPercentage = inv.investedAmount > 0 
        ? Number(((pnl / inv.investedAmount) * 100).toFixed(2))
        : 0;

      return {
        ...inv,
        pnl,
        pnlPercentage
      };
    });

    const totalPnl = Number((totalCurrentValue - totalInvested).toFixed(2));
    const totalPnlPercentage = totalInvested > 0 
      ? Number(((totalPnl / totalInvested) * 100).toFixed(2)) 
      : 0;

    res.json({
      success: true,
      investments: enriched,
      summary: {
        totalInvested: Number(totalInvested.toFixed(2)),
        totalCurrentValue: Number(totalCurrentValue.toFixed(2)),
        totalPnl,
        totalPnlPercentage
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch investments.' });
  }
};

export const createInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validated = investmentSchema.parse(req.body);

    const investment = await prisma.investment.create({
      data: {
        userId,
        name: validated.name,
        type: validated.type,
        investedAmount: validated.investedAmount,
        currentValue: validated.currentValue
      }
    });

    res.status(201).json({ success: true, investment });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Failed to create investment record.' });
  }
};

export const updateInvestmentValue = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { currentValue } = req.body;

    if (typeof currentValue !== 'number' || currentValue < 0) {
      return res.status(400).json({ success: false, error: 'Valid current value required.' });
    }

    const existing = await prisma.investment.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Investment not found.' });
    }

    const updated = await prisma.investment.update({
      where: { id },
      data: { currentValue }
    });

    res.json({ success: true, investment: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update investment valuation.' });
  }
};

export const deleteInvestment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.investment.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Investment not found.' });
    }

    await prisma.investment.delete({ where: { id } });
    res.json({ success: true, message: 'Investment deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete investment.' });
  }
};
