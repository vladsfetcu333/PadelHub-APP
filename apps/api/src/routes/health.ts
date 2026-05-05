import { Router } from 'express';
import { prisma } from '../lib/prisma.js';

const router = Router();

router.get('/', async (_req, res) => {
  let dbConnected = false;
  try {
    await prisma.healthCheck.create({ data: {} });
    dbConnected = true;
  } catch {
    dbConnected = false;
  }

  res.json({
    status: 'ok',
    dbConnected,
    timestamp: new Date().toISOString(),
  });
});

export default router;
