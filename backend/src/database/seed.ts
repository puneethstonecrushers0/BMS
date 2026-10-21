import { prisma } from './prisma.js';
import { hashPassword } from '../utils/password.js';
import { Role, UserStatus } from '@prisma/client';

async function main() {
  console.log('[Seed] Checking if administrator account already exists...');
  const existingAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN },
  });

  if (existingAdmin) {
    console.log(`[Seed] Administrator already exists: ${existingAdmin.email}`);
    return;
  }

  const passwordHash = await hashPassword('Admin@BMS2026');

  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@bms.local',
      passwordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },
  });

  console.log(`[Seed] Default Administrator created successfully:`);
  console.log(`       Email: ${admin.email}`);
  console.log(`       Password: Admin@BMS2026 (Please change on first login)`);
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
