/**
 * Knowledge-base ingestion script.
 *
 * Reads every *.md in `apps/api/src/knowledge-base/`, chunks each file,
 * embeds each chunk, and upserts the result into the `KnowledgeChunk`
 * table. Idempotent via the `contentHash @unique` index — re-running
 * does NOT duplicate rows; updated content gets new chunks while the
 * old hashes that no longer appear are pruned at the end.
 *
 * Usage:  npm run ingest:knowledge -w apps/api
 */

import 'dotenv/config';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { chunkMarkdown } from '../lib/rag/chunker.js';
import { getEmbedder } from '../lib/rag/embedder.js';

const prisma = new PrismaClient();

// Resolve the knowledge-base directory relative to this script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const KB_DIR = path.resolve(__dirname, '..', 'knowledge-base');

const CATEGORY_BY_FILE: Record<string, string> = {
  'padel-rules.md': 'rules',
  'padel-glossary.md': 'glossary',
  'padel-tactics-basic.md': 'tactics',
  'app-guide.md': 'app',
  'faq.md': 'faq',
  'glicko-rating-explained.md': 'rating',
};

function hashContent(s: string): string {
  return createHash('sha256').update(s).digest('hex');
}

async function main() {
  console.log(`Reading knowledge base from ${KB_DIR}…`);
  const files = (await fs.readdir(KB_DIR)).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.warn('No .md files found.');
    return;
  }

  const embedder = getEmbedder();
  console.log(`Using embedder: ${embedder.provider} (${embedder.dim}-dim)`);
  console.log('Note: first run downloads the model (~25MB), can take 30-60s.');

  const seenHashes = new Set<string>();
  let inserted = 0;
  let skipped = 0;

  for (const file of files) {
    const filePath = path.join(KB_DIR, file);
    const md = await fs.readFile(filePath, 'utf8');
    const chunks = chunkMarkdown(md);
    const category = CATEGORY_BY_FILE[file] ?? 'misc';

    console.log(`  ${file} — ${chunks.length} chunks`);
    for (const chunk of chunks) {
      const contentHash = hashContent(chunk.content);
      seenHashes.add(contentHash);

      const existing = await prisma.knowledgeChunk.findUnique({
        where: { contentHash },
      });
      if (existing) {
        skipped++;
        continue;
      }
      const vector = await embedder.embed(chunk.content);
      await prisma.knowledgeChunk.create({
        data: {
          source: file,
          category,
          content: chunk.content,
          embedding: JSON.stringify(vector),
          contentHash,
        },
      });
      inserted++;
    }
  }

  // Prune chunks whose hash is no longer present (content has been edited).
  const stale = await prisma.knowledgeChunk.findMany({
    where: { contentHash: { notIn: [...seenHashes] } },
    select: { id: true, source: true },
  });
  if (stale.length > 0) {
    await prisma.knowledgeChunk.deleteMany({
      where: { id: { in: stale.map((s) => s.id) } },
    });
    console.log(`Pruned ${stale.length} stale chunks.`);
  }

  console.log(`Done. Inserted: ${inserted}, skipped (already present): ${skipped}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
