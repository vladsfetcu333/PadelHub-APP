/**
 * Quick smoke test for the RAG retriever — runs a few sample queries
 * against the ingested knowledge base and prints the top-3 chunks.
 *
 * Run: npx tsx src/scripts/test-retrieval.ts
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { retrieveRelevantChunks, citationLabel } from '../lib/rag/retriever.js';

const prisma = new PrismaClient();

const QUERIES = [
  'Care sunt regulile pentru serviciu la padel?',
  'Ce înseamnă bandeja?',
  'Cum mă alătur la un Open Match?',
  'Cum funcționează rating-ul Glicko-2?',
];

async function main() {
  for (const q of QUERIES) {
    console.log(`\n══════════════════════════════════════════════════════`);
    console.log(`Q: ${q}`);
    console.log(`══════════════════════════════════════════════════════`);
    const results = await retrieveRelevantChunks(q, 3);
    for (let i = 0; i < results.length; i++) {
      const r = results[i]!;
      console.log(
        `\n  [${i + 1}] sim=${r.similarity.toFixed(3)}  source=${citationLabel(r.source)}`,
      );
      console.log(`     ${r.content.slice(0, 200).replace(/\n/g, ' ')}…`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
