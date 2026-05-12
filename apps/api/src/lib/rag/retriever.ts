/**
 * RAG retriever — finds the top-K most-similar knowledge chunks for a
 * given user query.
 *
 * Algorithm: embed the query → load all chunks → compute cosine
 * similarity vs each → sort desc → return top K.
 *
 * At thesis scale (~50-200 chunks total across 5 markdown files) this
 * in-memory scan completes in <20 ms. Phase 4 (Postgres + pgvector)
 * replaces the in-memory loop with a `<->` SQL operator.
 */

import { prisma } from '../prisma.js';
import { cosineSimilarity, getEmbedder } from './embedder.js';

export interface RetrievedChunk {
  id: string;
  source: string;
  category: string;
  content: string;
  similarity: number;
}

export async function retrieveRelevantChunks(query: string, topK = 5): Promise<RetrievedChunk[]> {
  const embedder = getEmbedder();
  const queryVector = await embedder.embed(query);

  const chunks = await prisma.knowledgeChunk.findMany();
  if (chunks.length === 0) return [];

  const scored: RetrievedChunk[] = [];
  for (const c of chunks) {
    let chunkVector: number[];
    try {
      chunkVector = JSON.parse(c.embedding) as number[];
    } catch {
      continue; // skip malformed
    }
    if (chunkVector.length !== queryVector.length) continue; // dim mismatch (embedder swap)
    scored.push({
      id: c.id,
      source: c.source,
      category: c.category,
      content: c.content,
      similarity: cosineSimilarity(queryVector, chunkVector),
    });
  }

  scored.sort((a, b) => b.similarity - a.similarity);
  return scored.slice(0, topK);
}

/** Map filename → human-readable Romanian source label for citations. */
export function citationLabel(source: string): string {
  switch (source) {
    case 'padel-rules.md':
      return 'Regulament padel';
    case 'padel-glossary.md':
      return 'Glosar padel';
    case 'padel-tactics-basic.md':
      return 'Tactică de bază';
    case 'app-guide.md':
      return 'Ghid aplicație';
    case 'faq.md':
      return 'Întrebări frecvente';
    case 'glicko-rating-explained.md':
      return 'Explicație rating Glicko';
    default:
      return source.replace(/\.md$/, '');
  }
}
