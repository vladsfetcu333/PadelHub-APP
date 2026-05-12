/**
 * Markdown chunker.
 *
 * Splits a Markdown document into chunks of ~500 chars with 50-char
 * overlap, respecting paragraph boundaries when possible. Headings are
 * preserved at the top of each chunk so the model sees the context.
 *
 * The algorithm:
 *   1. Walk the document line by line, keeping a running "current heading
 *      stack" so each chunk knows its section.
 *   2. Accumulate paragraphs (separated by blank lines) into the current
 *      chunk until adding the next paragraph would push us over the size
 *      target.
 *   3. On overflow, emit the current chunk with its heading prefix, then
 *      start the next chunk with a 50-char tail-overlap so the model can
 *      stitch context across boundaries.
 */

const TARGET_SIZE = 500;
const OVERLAP_SIZE = 50;

export interface Chunk {
  /** The text that gets embedded (may include a heading prefix). */
  content: string;
}

/** Splits a markdown string into RAG-ready chunks. */
export function chunkMarkdown(markdown: string): Chunk[] {
  const lines = markdown.split('\n');
  const chunks: Chunk[] = [];

  let currentHeadings: string[] = []; // stack-like — index = level - 1
  let buffer = '';
  const flush = () => {
    const trimmed = buffer.trim();
    if (trimmed.length === 0) return;
    // Prefix the current heading path so the model has context. Skip if
    // the chunk already starts with the same heading.
    const headingPrefix = currentHeadings.filter(Boolean).join(' › ');
    const content =
      headingPrefix && !trimmed.startsWith('#') ? `[${headingPrefix}]\n\n${trimmed}` : trimmed;
    chunks.push({ content });
    // Carry over a small tail for overlap (helps if a sentence got split)
    const tail = trimmed.slice(Math.max(0, trimmed.length - OVERLAP_SIZE));
    buffer = tail.trim() ? tail + '\n\n' : '';
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/u, '');
    // Heading detection
    const headingMatch = /^(#{1,6})\s+(.*)$/u.exec(line);
    if (headingMatch) {
      const level = headingMatch[1]!.length;
      const text = headingMatch[2]!.trim();
      // Flush whatever is currently in buffer before recording the new heading.
      if (buffer.trim().length > 0) flush();
      // Update heading stack — truncate to `level - 1`, then set level slot.
      currentHeadings = currentHeadings.slice(0, level - 1);
      currentHeadings[level - 1] = text;
      buffer += line + '\n';
      continue;
    }

    // Empty line — paragraph boundary
    if (line.length === 0) {
      buffer += '\n';
      if (buffer.length >= TARGET_SIZE) flush();
      continue;
    }

    // Normal content line
    if ((buffer + line).length > TARGET_SIZE + OVERLAP_SIZE) {
      flush();
    }
    buffer += line + '\n';
  }

  flush();
  return chunks;
}
