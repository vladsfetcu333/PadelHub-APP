import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const rows = await prisma.$queryRawUnsafe<Array<{ category: string; n: bigint }>>(
  'SELECT category, COUNT(*) AS n FROM "KnowledgeChunk" GROUP BY category ORDER BY category',
);
console.log('Chunks by category:');
let total = 0n;
for (const r of rows) {
  console.log(`  ${r.category.padEnd(12)} → ${r.n}`);
  total += r.n;
}
console.log(`  ${'TOTAL'.padEnd(12)} → ${total}`);
await prisma.$disconnect();
