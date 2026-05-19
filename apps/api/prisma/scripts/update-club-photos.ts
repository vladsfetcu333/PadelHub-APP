/**
 * One-shot script: replace the cover photo on every Club row with a
 * curated padel/tennis-court Unsplash URL. The seed previously used
 * `picsum.photos` which returns random landscapes — visually wrong for a
 * padel platform.
 *
 * Run with:
 *   npm run db:update:photos -w apps/api
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Curated Unsplash photo IDs scraped from `unsplash.com/s/photos/padel`
// and `/s/photos/padel-court` searches and verified with HTTP 200. All
// 16 are real padel / padel-court / racquet-sport photos with stable IDs.
const PADEL_PHOTOS = [
  '1646649853703-7645147474ba',
  '1658723826297-fe4d1b1e6600',
  '1612534847738-b3af9bc31f0c',
  '1646649851800-48dba35edc76',
  '1526888935184-a82d2a4b7e67',
  '1646651105426-e8c8ee9badde',
  '1604967438356-597a56e99a05',
  '1646649852033-7e0f3d679f8b',
  '1646649851780-d9701b7c3c04',
  '1646649853517-e2f75cde1908',
  '1574379989050-bfd9e1a8a543',
  '1613870930431-a09c7139eb33',
  '1657704358775-ed705c7388d2',
  '1541744573515-478c959628a0',
  '1689942963385-f5bd03f3b270',
  '1658491830143-72808ca237e3',
];

function buildUrl(id: string): string {
  return `https://images.unsplash.com/photo-${id}?w=1200&q=80&auto=format&fit=crop`;
}

async function main() {
  const clubs = await prisma.club.findMany({
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true },
  });

  if (clubs.length === 0) {
    console.log('No clubs to update. Run db:seed:demo first.');
    return;
  }

  console.log(`Updating cover photo on ${clubs.length} clubs…`);
  for (let i = 0; i < clubs.length; i++) {
    const club = clubs[i]!;
    const photoId = PADEL_PHOTOS[i % PADEL_PHOTOS.length]!;
    const url = buildUrl(photoId);
    // Photos are now native JSON objects per Phase 5 Part E. We write
    // a single MAIN-category entry; cap photos at MAX_CLUB_PHOTOS is
    // enforced by the upload endpoint, not this admin override.
    await prisma.club.update({
      where: { id: club.id },
      data: { photos: [{ url, category: 'MAIN', order: 0 }] },
    });
    console.log(`  ✓ ${club.name} → ${photoId}`);
  }
  console.log('Done.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
