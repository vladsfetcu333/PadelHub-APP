/**
 * Pluggable embedder.
 *
 * Default: local — `@xenova/transformers` running the
 * `Xenova/all-MiniLM-L6-v2` model (384-dim sentence embeddings). The model
 * is downloaded once on first call and cached in node_modules; no API key
 * required. This was chosen for thesis reproducibility — the demo doesn't
 * depend on a third-party API key being valid on demo day.
 *
 * Swap-path: an OpenAI `text-embedding-3-small` embedder (1536 dims) can
 * be plugged in by changing `getEmbedder()` to return a different
 * implementation. The contract is the same: `embed(text) => number[]`.
 *
 * Cosine similarity (in-memory) is fast enough at thesis scale. When we
 * migrate to Postgres + pgvector in Phase 4, we replace the cosine loop
 * with a `<->` vector index lookup.
 */

import type { FeatureExtractionPipeline } from '@xenova/transformers';

export interface Embedder {
  /** Returned vector dimensionality. */
  readonly dim: number;
  /** Provider identifier — saved alongside chunks for traceability. */
  readonly provider: string;
  embed(text: string): Promise<number[]>;
}

// ─────────────────────────────────────────────────────────────────────
// Xenova / Transformers.js — local, no API key
// ─────────────────────────────────────────────────────────────────────

let xenovaPipeline: FeatureExtractionPipeline | null = null;

async function getXenovaPipeline(): Promise<FeatureExtractionPipeline> {
  if (xenovaPipeline) return xenovaPipeline;
  // Dynamic import keeps the (heavy) transformers module out of the cold
  // startup path of the API server; it's loaded only when first needed.
  const { pipeline } = await import('@xenova/transformers');
  xenovaPipeline = (await pipeline(
    'feature-extraction',
    'Xenova/all-MiniLM-L6-v2',
  )) as FeatureExtractionPipeline;
  return xenovaPipeline;
}

class XenovaEmbedder implements Embedder {
  readonly dim = 384;
  readonly provider = 'xenova/all-MiniLM-L6-v2';

  async embed(text: string): Promise<number[]> {
    const pipe = await getXenovaPipeline();
    const output = await pipe(text, { pooling: 'mean', normalize: true });
    // output is a Tensor with .data being a Float32Array
    return Array.from(output.data as Float32Array);
  }
}

// ─────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────

let cached: Embedder | null = null;

export function getEmbedder(): Embedder {
  if (!cached) cached = new XenovaEmbedder();
  return cached;
}

/** Reset the singleton — useful for tests. */
export function resetEmbedderForTests(): void {
  cached = null;
  xenovaPipeline = null;
}

// ─────────────────────────────────────────────────────────────────────
// Cosine similarity
// ─────────────────────────────────────────────────────────────────────

/**
 * Cosine similarity for two equally-sized vectors. Returns a number in
 * [-1, 1] (1 = identical direction, 0 = orthogonal, -1 = opposite).
 *
 * Note: Xenova outputs are already L2-normalised when we set
 * `normalize: true`, so for our case the dot product alone gives cosine
 * similarity. The full formula is kept here for clarity / robustness
 * in case we ever swap the embedder for one that doesn't normalise.
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector length mismatch: ${a.length} vs ${b.length}`);
  }
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
