import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
const rows = await p.club.findMany({
  select: { name: true, photos: true },
  take: 3,
  orderBy: { createdAt: 'asc' },
});
for (const r of rows) {
  console.log(r.name);
  console.log('  photos:', JSON.stringify(r.photos));
}
await p.$disconnect();
