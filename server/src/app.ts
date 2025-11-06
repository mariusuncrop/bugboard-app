import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import express, { type Express } from 'express';
import { attachUser } from './lib/auth.js';
import { ApiError, errorHandler } from './lib/http.js';
import { attachmentsRouter } from './routes/attachments.js';
import { authRouter } from './routes/auth.js';
import { boardRouter } from './routes/board.js';
import { configRouter } from './routes/config.js';
import { commentsRouter } from './routes/comments.js';
import { issuesRouter, projectIssuesRouter } from './routes/issues.js';
import { linksRouter } from './routes/links.js';
import { meRouter } from './routes/me.js';
import { projectsRouter } from './routes/projects.js';
import { statsRouter } from './routes/stats.js';
import { testRouter } from './routes/test.js';
import { usersRouter } from './routes/users.js';

const serverRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webDist = resolve(serverRoot, '../web/dist');

export function createApp(): Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  app.use((req, res, next) => {
    const startedAt = Date.now();
    res.on('finish', () => {
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`);
    });
    next();
  });

  app.use(attachUser);

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/api/openapi.yaml', (_req, res) => {
    res.type('text/yaml').sendFile(join(serverRoot, 'openapi.yaml'));
  });

  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/config', configRouter);
  app.use('/api/test', testRouter);
  app.use('/api/me', meRouter);

  // Collections live under their project; single issues keep a short URL and
  // derive the project from the key.
  app.use('/api/projects/:projectKey/issues', projectIssuesRouter);
  app.use('/api/projects/:projectKey/board', boardRouter);
  app.use('/api/projects/:projectKey/stats', statsRouter);
  app.use('/api/projects', projectsRouter);

  app.use('/api', linksRouter);
  app.use('/api', commentsRouter);
  app.use('/api', attachmentsRouter);
  app.use('/api/issues', issuesRouter);

  app.use('/api', (_req, _res, next) => {
    next(ApiError.notFound('Unknown API endpoint.'));
  });

  // In production the built frontend is served from the same origin, so the app
  // runs on a single port with no proxy in front of it.
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('*', (_req, res) => {
      res.sendFile(join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
