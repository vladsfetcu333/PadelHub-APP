/**
 * Chat routes — REST for session management + SSE for message streaming.
 *
 * The streaming endpoint uses Server-Sent Events. We explicitly set the
 * SSE headers, call `res.flushHeaders()` (Express 5 buffers responses by
 * default), and stream `data: <json>\n\n` frames per event. The frontend
 * uses the native EventSource-style parsing via fetch + ReadableStream.
 */

import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as chatService from '../services/chatService.js';
import { logger } from '../lib/logger.js';

const router = Router();

const CreateSessionSchema = z.object({
  title: z.string().min(1).max(120).optional(),
});

const SendMessageSchema = z.object({
  content: z.string().min(1).max(4000),
});

router.post('/sessions', requireAuth, validate(CreateSessionSchema), async (req, res, next) => {
  try {
    const s = await chatService.createSession(
      req.user!.userId,
      (req.body as { title?: string }).title,
    );
    res.status(201).json(s);
  } catch (err) {
    next(err);
  }
});

router.get('/sessions', requireAuth, async (req, res, next) => {
  try {
    const list = await chatService.listSessions(req.user!.userId);
    res.json(list);
  } catch (err) {
    next(err);
  }
});

router.get('/sessions/:id', requireAuth, async (req, res, next) => {
  try {
    const s = await chatService.getSession(String(req.params['id']), req.user!.userId);
    res.json(s);
  } catch (err) {
    next(err);
  }
});

router.delete('/sessions/:id', requireAuth, async (req, res, next) => {
  try {
    await chatService.deleteSession(String(req.params['id']), req.user!.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

/**
 * Streaming endpoint — Server-Sent Events.
 *
 * We don't use the `validate` middleware here because we need to write
 * SSE headers before any error response. We parse the body manually and
 * report errors as an SSE `error` event so the client can render them
 * inline.
 */
router.post('/sessions/:id/messages', requireAuth, async (req, res) => {
  const parseResult = SendMessageSchema.safeParse(req.body);
  if (!parseResult.success) {
    res
      .status(400)
      .json({ error: { message: 'Validation failed', details: parseResult.error.flatten() } });
    return;
  }

  // SSE setup
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering if present
  res.flushHeaders();

  const send = (event: unknown) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  };

  try {
    const generator = chatService.streamAssistantResponse(
      String(req.params['id']),
      req.user!.userId,
      parseResult.data.content,
    );
    for await (const ev of generator) send(ev);
  } catch (err) {
    logger.error({ err }, 'Chat stream failed');
    send({
      type: 'error',
      message: err instanceof Error ? err.message : 'Internal server error',
    });
  } finally {
    res.end();
  }
});

export default router;
