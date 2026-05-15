/**
 * RAG retriever — finds the top-K most-similar knowledge chunks for a
 * given user query.
 *
 * Implementation (Phase 4): pgvector cosine search via the `<=>` operator
 * on the `vector(384)` column, with the HNSW index installed by the init
 * migration. The query is a single round-trip:
 *
 *   SELECT id, source, category, content,
 *          1 - (embedding <=> $1::vector) AS similarity
 *   FROM "KnowledgeChunk"
 *   ORDER BY embedding <=> $1::vector
 *   LIMIT $2;
 *
 * `<=>` is the cosine-distance operator (0 = identical, 1 = orthogonal,
 * 2 = opposite). We expose `1 - distance` so the API field stays
 * compatible with the in-memory implementation from Phase 3 (higher =
 * better). Since embeddings are L2-normalised at ingest time, cosine
 * distance is equivalent to inner-product distance — `<=>` is the
 * canonical pgvector operator for that case.
 *
 * Performance: HNSW index brings top-5 lookup down to sub-millisecond
 * even at hundreds of thousands of rows; the in-memory JS loop in Phase 3
 * was O(N) per query. The bottleneck is now the embedding step
 * (~50 ms on Xenova MiniLM, single-threaded CPU).
 */

import { prisma } from '../prisma.js';
import { getEmbedder } from './embedder.js';

export interface RetrievedChunk {
  id: string;
  source: string;
  category: string;
  content: string;
  similarity: number;
}

/** Format a JS number array as a pgvector literal: `[0.1,0.2,...]`. */
function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`;
}

export async function retrieveRelevantChunks(query: string, topK = 5): Promise<RetrievedChunk[]> {
  const embedder = getEmbedder();
  const queryVector = await embedder.embed(query);
  const vectorLiteral = toVectorLiteral(queryVector);

  const rows = await prisma.$queryRawUnsafe<
    Array<{ id: string; source: string; category: string; content: string; similarity: number }>
  >(
    `SELECT id, source, category, content,
            (1 - (embedding <=> $1::vector))::float8 AS similarity
     FROM "KnowledgeChunk"
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    vectorLiteral,
    topK,
  );

  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    category: r.category,
    content: r.content,
    similarity: Number(r.similarity),
  }));
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
