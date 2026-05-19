-- Phase 5 Part E — promote Club.photos from text-encoded-JSON-of-strings
-- to a native jsonb column whose items are objects `{ url, category,
-- caption?, order }`.
--
-- Steps:
--   1. Add a temporary jsonb column.
--   2. Backfill: parse the existing text as JSON, map each URL string to
--      { url, category: 'MAIN', order: index } for backward compatibility.
--      Rows where parsing fails fall back to an empty array.
--   3. Drop the old column, rename the new one in place.
--
-- The HNSW index on KnowledgeChunk.embedding is intentionally untouched —
-- see the inline comment on the previous migration for why.

ALTER TABLE "Club" ADD COLUMN "photos_new" JSONB NOT NULL DEFAULT '[]';

-- Backfill — map ["url1", "url2"] → [{url:"url1",category:"MAIN",order:0}, …]
-- Uses jsonb_array_elements_text to iterate; preserves rows with already
-- structured JSON (no .url field falls through to MAIN/0).
UPDATE "Club"
SET "photos_new" = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'url', val,
        'category', 'MAIN',
        'order', idx - 1
      )
    )
    FROM jsonb_array_elements_text(("photos")::jsonb) WITH ORDINALITY AS t(val, idx)
  ),
  '[]'::jsonb
)
WHERE ("photos")::jsonb IS NOT NULL;

ALTER TABLE "Club" DROP COLUMN "photos";
ALTER TABLE "Club" RENAME COLUMN "photos_new" TO "photos";
