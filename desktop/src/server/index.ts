import express from 'express';
import path from 'path';
import { initDb } from './db';
import { seedDb } from './seed';
import router from './routes/index';

export function startServer(port: number, dataDir: string, webDir: string): Promise<void> {
  const dbPath = path.join(dataDir, 'examhub.db');
  initDb(dbPath);
  seedDb();

  const app = express();
  app.use(express.json({ limit: '10mb' }));

  app.use('/api', router);

  app.use(express.static(webDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(webDir, 'index.html'));
  });

  return new Promise((resolve, reject) => {
    const server = app.listen(port, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
}
