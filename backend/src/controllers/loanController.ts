import { Response } from 'express';
import { prisma } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { loanSchema } from '../utils/validators';
import { FinancialEngine } from '../services/financialEngine';

export const getLoans = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const loans = await prisma.loan.findMany({
      where: { userId },
      include: {
        payments: { orderBy: { paymentDate: 'desc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ success: true, loans });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch loans.' });
  }
};

export const createLoan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const validated = loanSchema.parse(req.body);

    const emiAmount = FinancialEngine.calculateEMI(
      validated.principal,
      validated.interestRate,
      validated.tenureMonths
    );

    const loan = await prisma.loan.create({
      data: {
        userId,
        name: validated.name,
        type: validated.type,
        principal: validated.principal,
        interestRate: validated.interestRate,
        tenureMonths: validated.tenureMonths,
        emiAmount,
        remainingPrincipal: validated.principal,
        startDate: new Date(validated.startDate)
      }
    });

    res.status(201).json({ success: true, loan });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Failed to create loan record.' });
  }
};

export const recordLoanPayment = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { amount, paymentDate, notes } = req.body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ success: false, error: 'Payment amount must be greater than 0.' });
    }

    const loan = await prisma.loan.findFirst({ where: { id, userId } });
    if (!loan) {
      return res.status(404).json({ success: false, error: 'Loan not found.' });
    }

    // Estimate monthly interest vs principal breakdown
    const monthlyRate = loan.interestRate / 12 / 100;
    const interestComponent = Number((loan.remainingPrincipal * monthlyRate).toFixed(2));
    const principalComponent = Number(Math.max(0, amount - interestComponent).toFixed(2));
    const newRemaining = Number(Math.max(0, loan.remainingPrincipal - principalComponent).toFixed(2));

    const [payment, updatedLoan] = await prisma.$transaction([
      prisma.loanPayment.create({
        data: {
          loanId: loan.id,
          userId,
          amount,
          paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
          principalComponent,
          interestComponent,
          notes: notes || 'EMI Payment'
        }
      }),
      prisma.loan.update({
        where: { id: loan.id },
        data: { remainingPrincipal: newRemaining }
      })
    ]);

    res.json({ success: true, payment, loan: updatedLoan });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to record loan payment.' });
  }
};

export const deleteLoan = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const existing = await prisma.loan.findFirst({ where: { id, userId } });
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Loan not found.' });
    }

    await prisma.loan.delete({ where: { id } });
    res.json({ success: true, message: 'Loan deleted successfully.' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete loan.' });
  }
};
