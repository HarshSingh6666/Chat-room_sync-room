import 'dotenv/config';
import express from 'express';
import { apiRouter } from './server/routes';
import { setupFrontendMiddleware } from './server/vite';

const app = express();
const PORT = Number(process.env.PORT);

app.use(express.json({ limit: '1mb' }));

// API routes
app.use('/api', apiRouter);

async function startServer(): Promise<void> {
  // Setup Vite development middleware or production static SPA serving
  await setupFrontendMiddleware(app);

  app.listen(PORT, () => {
    console.log(`SyncRoom Server running on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error('Failed to start SyncRoom server:', error);
  process.exit(1);
});
