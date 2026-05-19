import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import usersRouter from './routes/users.js';
import clubsRouter from './routes/clubs.js';
import matchingRouter from './routes/matching.js';
import openMatchesRouter from './routes/openMatches.js';
import matchesRouter from './routes/matches.js';
import tournamentsRouter from './routes/tournaments.js';
import reportsRouter from './routes/reports.js';
import notificationsRouter from './routes/notifications.js';
import chatRouter from './routes/chat.js';
import adminUsersRouter from './routes/adminUsers.js';
import { startMatchExpiryJob } from './services/matchService.js';

const app = express();

app.use(cors({ origin: env.corsOrigin, credentials: true }));
// Bump the JSON body limit to 3 MB so club-photo uploads (base64 data
// URLs of compressed JPEGs, capped at 2 MB after client-side compression)
// fit comfortably with overhead. Default is 100 KB.
app.use(express.json({ limit: '3mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/clubs', clubsRouter);
app.use('/api/matching', matchingRouter);
app.use('/api/open-matches', openMatchesRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin/users', adminUsersRouter);

app.use(errorHandler);

app.listen(env.port, () => {
  logger.info(`API running on http://localhost:${env.port} [${env.nodeEnv}]`);
  startMatchExpiryJob();
});
