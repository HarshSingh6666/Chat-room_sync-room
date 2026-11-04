import path from 'path';
import fs from 'fs';
import express, { Express, Request, Response, NextFunction } from 'express';

export async function setupFrontendMiddleware(app: Express): Promise<void> {
  const clientDistPath = path.resolve(process.cwd(), 'dist');
  const hasDist = fs.existsSync(path.join(clientDistPath, 'index.html'));

  // On Render or production, always serve built static files (uses ~30MB RAM).
  const isProduction =
    Boolean(process.env.RENDER) ||
    process.env.NODE_ENV === 'production' ||
    hasDist;

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        allowedHosts: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    app.use(express.static(clientDistPath));

    // Express compatible SPA fallback; avoids app.get('*').
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        return next();
      }

      return res.sendFile(
        path.join(clientDistPath, 'index.html'),
        (error) => {
          if (error && !res.headersSent) {
            next(error);
          }
        }
      );
    });
  }
}
