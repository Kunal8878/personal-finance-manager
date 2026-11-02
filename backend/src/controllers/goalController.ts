import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { goalSchema } from '../utils/validators';

export const getGoals = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { targetDate: 'asc' }
    });

    const now = new Date();
    const enrichedGoals = goals.map((g) => {
      const percentage = g.targetAmount > 0 ? Math.min(100, Number(((g.currentAmount / g.targetAmount) * 100).toFixed(1))) : 0;
      const targetDate = new Date(g.targetDate);

      // Calculate months remaining
      const monthsDiff = (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth());
      const remainingMonths = Math.max(1, monthsDiff);
      const remainingAmount = Math.max(0, g.targetAmount - g.currentAmount);
      const requiredMonthlySavings = Number((remainingAmount / remainingMonths).toFixed(2));

      return {
        ...g,
        percentage,
        remainingAmount,
        monthsRemaining: remainingMonths,
        requiredMonthlySavings
      };
    });

    res.json({ success: true, goals: enrichedGoals });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch financial goals.' });
  }
};

export const createGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validated = goalSchema.parse(req.body);

    const goal = await prisma.goal.create({
      data: {
        userId,
        name: validated.name,
        targetAmount: validated.targetAmount,
        currentAmount: validated.currentAmount,
        targetDate: new Date(validated.targetDate),
        category: validated.category
      }
    });

    res.status(201).json({ success: true, goal });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Failed to create financial goal.' });
  }
};

export const updateGoalContribution = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { amount } = req.body;

    if (!amount || typeof amount !== 'number') {
      return res.status(400).json({ success: false, error: 'Contribution amount must be a number.' });
    }

    const existing = await prisma.goal.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Goal not found.' });
    }

    const updated = await prisma.goal.update({
      where: { id },
      data: { currentAmount: { increment: amount } }
    });

    res.json({ success: true, goal: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update goal progress.' });
  }
};

export const deleteGoal = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.goal.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Goal not found.' });
    }

    await prisma.goal.delete({ where: { id } });
    res.json({ success: true, message: 'Goal deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete goal.' });
  }
};
