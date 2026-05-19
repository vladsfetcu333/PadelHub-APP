-- Phase 5 Part D — admin user management columns on `User`.
--
-- Prisma's `Unsupported<vector(384)>` declaration on KnowledgeChunk.embedding
-- causes `migrate diff` to emit a spurious DROP for the HNSW index on every
-- schema change. We omit that DROP so the existing HNSW index defined in
-- the init migration is preserved verbatim — the chatbot retrieval path
-- keeps its sub-millisecond cosine lookup.

-- AlterTable
ALTER TABLE "User"
  ADD COLUMN "isSuspended"     BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "suspendedAt"     TIMESTAMP(3),
  ADD COLUMN "suspendedBy"     TEXT,
  ADD COLUMN "suspendedReason" TEXT;
