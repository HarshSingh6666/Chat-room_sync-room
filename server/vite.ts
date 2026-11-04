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

      const indexPath = path.join(clientDistPath, 'index.html');
      if (!fs.existsSync(indexPath)) {
        return res.status(500).send(`
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <title>SyncRoom - Build Missing</title>
              <style>
                body { font-family: system-ui, sans-serif; background: #0b0f19; color: #f1f5f9; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 32px; max-width: 520px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
                h2 { color: #f87171; margin-top: 0; font-size: 20px; }
                p { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
                code { background: #0f172a; padding: 4px 8px; border-radius: 6px; color: #38bdf8; font-size: 13px; font-family: monospace; }
                pre { background: #0f172a; padding: 12px; border-radius: 8px; color: #38bdf8; overflow-x: auto; font-size: 13px; border: 1px solid #334155; }
              </style>
            </head>
            <body>
              <div class="card">
                <h2>⚠️ Client Build Missing (dist/index.html not found)</h2>
                <p>The server is running on Render, but the frontend was not built during the build phase.</p>
                <p><strong>Fix this in your Render Dashboard:</strong></p>
                <p>Go to <strong>Settings</strong> &gt; <strong>Build Command</strong> and change it to:</p>
                <pre>npm install && npm run build</pre>
                <p>Then click <strong>Manual Deploy &gt; Deploy latest commit</strong>.</p>
              </div>
            </body>
          </html>
        `);
      }

      return res.sendFile(indexPath, (error) => {
        if (error && !res.headersSent) {
          next(error);
        }
      });
    });
  }
}
