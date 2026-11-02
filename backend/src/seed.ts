import { seedAllRegisteredUsers } from './config/seedData';
import { prisma } from './config/db';

async function main() {
  console.log('[Seed CLI] Starting database pre-seeded data upload...');
  const count = await seedAllRegisteredUsers();
  console.log(`[Seed CLI] Pre-seeded data successfully uploaded for ${count} users!`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('[Seed CLI Error]', err);
  process.exit(1);
});
