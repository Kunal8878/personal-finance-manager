import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma, seedDefaultCategories, seedAdminUser } from '../config/db';
import { AuthRequest } from '../middleware/auth';
import { registerSchema, loginSchema } from '../utils/validators';

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const validated = registerSchema.parse(req.body);

    const existingUser = await prisma.user.findUnique({ where: { email: validated.email } });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(validated.password, salt);

    // Seed default categories first if needed
    await seedDefaultCategories();

    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        passwordHash,
        currency: validated.currency || 'USD'
      }
    });

    const secret = process.env.JWT_SECRET || 'super-secret-finance-jwt-key';
    const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency
      }
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Registration failed. Please try again.' });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const validated = loginSchema.parse(req.body);

    // Admin shortcut using env variables
    if (process.env.ADMIN_ID && process.env.ADMIN_PASS &&
        validated.email === process.env.ADMIN_ID && validated.password === process.env.ADMIN_PASS) {
      const admin = await seedAdminUser();
      const secret = process.env.JWT_SECRET || 'super-secret-finance-jwt-key';
      const adminId = admin ? admin.id : 'admin';
      const token = jwt.sign({ userId: adminId, email: validated.email, isAdmin: true }, secret, { expiresIn: '7d' });
      return res.json({
        success: true,
        token,
        user: { id: adminId, name: admin?.name || 'Admin', email: validated.email, currency: admin?.currency || 'USD', isAdmin: true }
      });
    }

    const user = await prisma.user.findUnique({ where: { email: validated.email } });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(validated.password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const secret = process.env.JWT_SECRET || 'super-secret-finance-jwt-key';
    const token = jwt.sign({ userId: user.id, email: user.email }, secret, { expiresIn: '7d' });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        currency: user.currency
      }
    });
  } catch (err: any) {
    if (err.name === 'ZodError') {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Login failed. Please try again.' });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false, error: 'Unauthorized' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, currency: true, createdAt: true }
    });

    if (!user) {
      // Fallback for legacy admin token without DB record
      if (userId === 'admin' || req.user?.email === process.env.ADMIN_ID) {
        return res.json({
          success: true,
          user: {
            id: userId,
            name: 'Admin',
            email: req.user?.email || 'admin@example.com',
            currency: 'USD',
            isAdmin: true,
            createdAt: new Date().toISOString()
          }
        });
      }
      return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    res.json({ success: true, user: { ...user, isAdmin: req.user?.email === process.env.ADMIN_ID } });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
  }
};
