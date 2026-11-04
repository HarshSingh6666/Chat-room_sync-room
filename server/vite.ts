import path from 'path';
import express, { Express, Request, Response, NextFunction } from 'express';

export async function setupFrontendMiddleware(app: Express): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    const clientDistPath = path.resolve(process.cwd(), 'dist');

    app.use(express.static(clientDistPath));

    // Express 5 compatible SPA fallback; avoids app.get('*').
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
