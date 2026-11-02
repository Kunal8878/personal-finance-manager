import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { budgetSchema } from '../utils/validators';
import { FinancialEngine } from '../services/financialEngine';

export const getBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: { category: { select: { id: true, name: true, color: true, icon: true } } },
      orderBy: { createdAt: 'desc' }
    });

    // Calculate dynamic spending utilization for each budget
    const updatedBudgets = await Promise.all(
      budgets.map(async (b) => {
        const totalSpent = await prisma.transaction.aggregate({
          where: {
            userId,
            categoryId: b.categoryId,
            type: 'EXPENSE',
            date: {
              gte: b.startDate,
              lte: b.endDate
            }
          },
          _sum: { amount: true }
        });

        const spent = totalSpent._sum.amount || 0;
        const utilization = FinancialEngine.calculateBudgetUtilization(b.amount, spent);

        return {
          ...b,
          utilization
        };
      })
    );

    res.json({ success: true, budgets: updatedBudgets });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch budgets.' });
  }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validated = budgetSchema.parse(req.body);

    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: validated.categoryId,
        amount: validated.amount,
        period: validated.period,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate)
      },
      include: { category: { select: { id: true, name: true, color: true, icon: true } } }
    });

    res.status(201).json({ success: true, budget });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Failed to create budget.' });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.budget.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Budget not found.' });
    }

    await prisma.budget.delete({ where: { id } });
    res.json({ success: true, message: 'Budget deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete budget.' });
  }
};
