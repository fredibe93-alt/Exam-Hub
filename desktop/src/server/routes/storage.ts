import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Router, raw } from 'express';
import { requireAdmin, requireAuth } from '../auth';

const extensions: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function createStorageRouter(dataDir: string) {
  const router = Router();
  const uploadDir = path.join(dataDir, 'diagrams', 'uploads');

  router.post(
    '/storage/uploads',
    requireAdmin,
    raw({ type: Object.keys(extensions), limit: '8mb' }),
    async (req, res): Promise<void> => {
      const contentType = String(req.headers['content-type'] ?? '').split(';')[0].trim();
      const extension = extensions[contentType];
      if (!extension || !Buffer.isBuffer(req.body) || req.body.length === 0) {
        res.status(400).json({ error: 'Upload a PNG, JPG, WEBP, or GIF image' });
        return;
      }
      await mkdir(uploadDir, { recursive: true });
      const filename = `${randomUUID()}.${extension}`;
      await writeFile(path.join(uploadDir, filename), req.body);
      res.status(201).json({ objectPath: `/objects/uploads/${filename}` });
    },
  );

  router.get('/storage/objects/*path', requireAuth, async (req, res): Promise<void> => {
    const parts = req.params.path;
    const segments = Array.isArray(parts) ? parts : [parts];
    const filename = segments.length === 2 && segments[0] === 'uploads' ? segments[1] : '';
    const extension = filename.match(/\.([a-z]+)$/)?.[1];
    const contentType = extension ? Object.entries(extensions).find(([, ext]) => ext === extension)?.[0] : undefined;
    if (!contentType || !/^[a-zA-Z0-9-]+\.(png|jpg|webp|gif)$/.test(filename)) {
      res.status(404).json({ error: 'Diagram image not found' });
      return;
    }
    try {
      const image = await readFile(path.join(uploadDir, filename));
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'private, max-age=86400');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.send(image);
    } catch {
      res.status(404).json({ error: 'Diagram image not found' });
    }
  });

  return router;
}
