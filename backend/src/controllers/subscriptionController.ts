import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { subscriptionSchema } from '../utils/validators';

export const getSubscriptions = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      include: {
        category: { select: { id: true, name: true, color: true } },
        account: { select: { id: true, name: true } }
      },
      orderBy: { nextBillingDate: 'asc' }
    });

    let monthlyTotal = 0;
    let yearlyTotal = 0;

    for (const sub of subscriptions) {
      if (sub.isActive) {
        if (sub.billingCycle === 'MONTHLY') {
          monthlyTotal += sub.cost;
          yearlyTotal += sub.cost * 12;
        } else {
          monthlyTotal += sub.cost / 12;
          yearlyTotal += sub.cost;
        }
      }
    }

    res.json({
      success: true,
      subscriptions,
      summary: {
        monthlyTotal: Number(monthlyTotal.toFixed(2)),
        yearlyTotal: Number(yearlyTotal.toFixed(2)),
        activeCount: subscriptions.filter((s) => s.isActive).length
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch subscriptions.' });
  }
};

export const createSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validated = subscriptionSchema.parse(req.body);

    const subscription = await prisma.subscription.create({
      data: {
        userId,
        name: validated.name,
        cost: validated.cost,
        billingCycle: validated.billingCycle,
        nextBillingDate: new Date(validated.nextBillingDate),
        categoryId: validated.categoryId || null,
        accountId: validated.accountId || null,
        isActive: validated.isActive
      },
      include: {
        category: { select: { id: true, name: true, color: true } },
        account: { select: { id: true, name: true } }
      }
    });

    res.status(201).json({ success: true, subscription });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Failed to create subscription.' });
  }
};

export const toggleSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found.' });
    }

    const updated = await prisma.subscription.update({
      where: { id },
      data: { isActive: !existing.isActive }
    });

    res.json({ success: true, subscription: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update subscription status.' });
  }
};

export const deleteSubscription = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.subscription.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Subscription not found.' });
    }

    await prisma.subscription.delete({ where: { id } });
    res.json({ success: true, message: 'Subscription deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete subscription.' });
  }
};
