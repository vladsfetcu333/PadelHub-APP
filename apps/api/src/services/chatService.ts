/**
 * Chat service — orchestrates the RAG pipeline:
 *
 *   1. Receive a user message in a ChatSession.
 *   2. Embed the message + retrieve top-5 knowledge chunks.
 *   3. Build a system prompt with the context and conversation history
 *      (last 10 turns).
 *   4. Call Anthropic Claude Haiku 4.5 with streaming enabled.
 *   5. As tokens arrive, yield them to the caller (used by the SSE route).
 *   6. When complete, persist user + assistant messages with the list of
 *      context chunk ids for citation.
 *
 * The function is implemented as an async generator so the HTTP layer can
 * stream tokens to the client over SSE without buffering.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ChatRole } from '@padel/shared';
import { prisma } from '../lib/prisma.js';
import { retrieveRelevantChunks, citationLabel } from '../lib/rag/retriever.js';
import { logger } from '../lib/logger.js';
import { env } from '../config/env.js';
import { notFound, forbidden, badRequest } from '../lib/httpError.js';

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_HISTORY_MESSAGES = 10;
const MAX_OUTPUT_TOKENS = 1024;

const SYSTEM_PROMPT = `Ești un asistent prietenos al platformei PadelHub Romania.
Răspunzi la întrebări despre reguli, terminologie, tactici, echipamente padel
(rachete, mingi, pantofi, grip-uri, accesorii) și ghidul aplicației PadelHub.

Reguli stricte:
- Răspunde MEREU în limba română.
- Folosește informațiile din secțiunea "Context" de mai jos atunci când
  sunt relevante. Dacă răspunsul nu se află în context, spune onest că
  nu știi exact și sugerează cum poate utilizatorul afla mai mult.
- Fii concis dar complet. Folosește liste numerotate când explici pași.
- Nu inventa reguli, funcționalități sau termeni care nu apar în context.
- Dacă întrebarea este în engleză, răspunde tot în română.`;

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    if (!env.anthropicApiKey) {
      throw badRequest(
        'ANTHROPIC_API_KEY is not configured on the server. Set it in apps/api/.env to enable the chatbot.',
      );
    }
    anthropicClient = new Anthropic({ apiKey: env.anthropicApiKey });
  }
  return anthropicClient;
}

// ─────────────────────────────────────────────────────────────────────
// Session management
// ─────────────────────────────────────────────────────────────────────

export async function createSession(userId: string, title?: string) {
  const session = await prisma.chatSession.create({
    data: { userId, title: title ?? null },
  });
  return { id: session.id, title: session.title, createdAt: session.createdAt.toISOString() };
}

export async function listSessions(userId: string) {
  const rows = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });
  return rows.map((s) => ({
    id: s.id,
    title: s.title,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));
}

export async function getSession(sessionId: string, userId: string) {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  });
  if (!session) throw notFound('Session not found');
  if (session.userId !== userId) throw forbidden();
  return {
    id: session.id,
    title: session.title,
    createdAt: session.createdAt.toISOString(),
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role as ChatRole,
      content: m.content,
      contextChunkIds: m.contextChunkIds ? (JSON.parse(m.contextChunkIds) as string[]) : null,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

export async function deleteSession(sessionId: string, userId: string) {
  const session = await prisma.chatSession.findUnique({ where: { id: sessionId } });
  if (!session) throw notFound('Session not found');
  if (session.userId !== userId) throw forbidden();
  await prisma.chatSession.delete({ where: { id: sessionId } });
}

// ─────────────────────────────────────────────────────────────────────
// Streaming message
// ─────────────────────────────────────────────────────────────────────

export interface StreamEvent {
  type: 'token' | 'sources' | 'done' | 'error';
  data?: string;
  sources?: Array<{ id: string; source: string; label: string; similarity: number }>;
  message?: string;
}

/**
 * Async generator yielding streaming events. The HTTP layer translates
 * each event into an SSE `data:` line.
 */
export async function* streamAssistantResponse(
  sessionId: string,
  userId: string,
  userMessage: string,
): AsyncGenerator<StreamEvent> {
  const session = await prisma.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' }, take: MAX_HISTORY_MESSAGES } },
  });
  if (!session) throw notFound('Session not found');
  if (session.userId !== userId) throw forbidden();

  const userMsgTrimmed = userMessage.trim();
  if (!userMsgTrimmed) throw badRequest('Empty message');

  // Persist the user message immediately so it shows in the UI even if
  // the assistant call fails.
  await prisma.chatMessage.create({
    data: { sessionId, role: 'USER', content: userMsgTrimmed },
  });

  // Retrieve context
  const retrieved = await retrieveRelevantChunks(userMsgTrimmed, 5);
  const sources = retrieved.map((c) => ({
    id: c.id,
    source: c.source,
    label: citationLabel(c.source),
    similarity: Math.round(c.similarity * 1000) / 1000,
  }));
  // Emit sources up front so the UI can show citations immediately
  yield { type: 'sources', sources };

  const contextBlock =
    retrieved.length > 0
      ? retrieved
          .map((c, i) => `[Sursa ${i + 1} — ${citationLabel(c.source)}]\n${c.content}`)
          .join('\n\n---\n\n')
      : '(nicio sursă disponibilă în baza de cunoștințe)';

  // Build conversation history for the API call. We re-fetch to include
  // the just-saved user message.
  const history = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: MAX_HISTORY_MESSAGES + 1, // +1 for the message we just inserted
  });

  const apiMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];
  for (const m of history) {
    if (m.role === 'USER') apiMessages.push({ role: 'user', content: m.content });
    else if (m.role === 'ASSISTANT') apiMessages.push({ role: 'assistant', content: m.content });
  }

  // Inject the context into the latest user message (Claude convention:
  // system prompt for behaviour, content for query-time augmentation).
  if (apiMessages.length > 0 && apiMessages[apiMessages.length - 1]!.role === 'user') {
    const last = apiMessages[apiMessages.length - 1]!;
    last.content = `Context din baza de cunoștințe:\n\n${contextBlock}\n\n---\n\nÎntrebare: ${last.content}`;
  }

  let assistantText = '';
  try {
    const client = getAnthropic();
    const stream = await client.messages.stream({
      model: MODEL,
      max_tokens: MAX_OUTPUT_TOKENS,
      system: SYSTEM_PROMPT,
      messages: apiMessages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        const token = event.delta.text;
        assistantText += token;
        yield { type: 'token', data: token };
      }
    }
  } catch (err) {
    logger.error({ err }, 'Anthropic streaming failed');
    yield { type: 'error', message: err instanceof Error ? err.message : 'Unknown error' };
    return;
  }

  // Persist assistant message
  await prisma.chatMessage.create({
    data: {
      sessionId,
      role: 'ASSISTANT',
      content: assistantText,
      contextChunkIds: JSON.stringify(retrieved.map((c) => c.id)),
    },
  });

  // Bump session updatedAt so it sorts to top in the sidebar
  await prisma.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  });

  // If this was the first exchange, set a title from the user message
  if (!session.title) {
    const inferredTitle = userMsgTrimmed.slice(0, 60) + (userMsgTrimmed.length > 60 ? '…' : '');
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title: inferredTitle },
    });
  }

  yield { type: 'done' };
}
