import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

export const prisma = new PrismaClient();

export const DEFAULT_CATEGORIES = [
  // Income
  { name: 'Salary', type: 'INCOME', icon: 'briefcase', color: '#10b981' },
  { name: 'Freelance & Business', type: 'INCOME', icon: 'laptop', color: '#059669' },
  { name: 'Investments Return', type: 'INCOME', icon: 'trending-up', color: '#047857' },
  { name: 'Other Income', type: 'INCOME', icon: 'plus-circle', color: '#34d399' },
  
  // Expenses
  { name: 'Housing & Rent', type: 'EXPENSE', icon: 'home', color: '#f43f5e' },
  { name: 'Groceries & Dining', type: 'EXPENSE', icon: 'shopping-bag', color: '#fb7185' },
  { name: 'Utilities & Bills', type: 'EXPENSE', icon: 'zap', color: '#e11d48' },
  { name: 'Transportation & Fuel', type: 'EXPENSE', icon: 'truck', color: '#f59e0b' },
  { name: 'Entertainment & Leisure', type: 'EXPENSE', icon: 'film', color: '#a855f7' },
  { name: 'Healthcare & Insurance', type: 'EXPENSE', icon: 'activity', color: '#06b6d4' },
  { name: 'Debt & EMI Payment', type: 'EXPENSE', icon: 'credit-card', color: '#64748b' },
  { name: 'Shopping & Apparel', type: 'EXPENSE', icon: 'shopping-cart', color: '#ec4899' },
  { name: 'Subscriptions', type: 'EXPENSE', icon: 'repeat', color: '#8b5cf6' },
  
  // Transfers
  { name: 'Internal Account Transfer', type: 'TRANSFER', icon: 'arrow-right-left', color: '#38bdf8' }
];

export async function seedDefaultCategories() {
  const existingCount = await prisma.category.count({ where: { userId: null } });
  if (existingCount === 0) {
    for (const cat of DEFAULT_CATEGORIES) {
      await prisma.category.create({
        data: {
          name: cat.name,
          type: cat.type,
          icon: cat.icon,
          color: cat.color,
          userId: null // Global system default category
        }
      });
    }
    console.log('[DB] System default categories seeded.');
  }

  // Ensure Admin User exists in DB
  await seedAdminUser();
}

export async function seedAdminUser() {
  try {
    const adminEmail = process.env.ADMIN_ID || 'admin@example.com';
    const adminPass = process.env.ADMIN_PASS || 'adminpassword';
    
    let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!admin) {
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(adminPass, salt);
      admin = await prisma.user.create({
        data: {
          name: 'Admin',
          email: adminEmail,
          passwordHash,
          currency: 'USD'
        }
      });
      console.log(`[DB] Admin account initialized (${adminEmail}) ID: ${admin.id}`);
    }
    return admin;
  } catch (err) {
    console.error('[DB] seedAdminUser warning:', err);
  }
}
