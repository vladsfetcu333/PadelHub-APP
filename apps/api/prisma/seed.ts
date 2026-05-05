import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Full seed (admin, players, clubs) implemented in a later chunk of Phase 1.
  console.log('Seed placeholder — full domain seed implemented separately.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
