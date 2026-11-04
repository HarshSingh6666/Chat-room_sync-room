import { Router, Request, Response } from 'express';
import { firebaseConfig } from '../FirebaseConfig';

export const configRouter = Router();

// Firebase client configuration
configRouter.get('/', (_req: Request, res: Response) => {
  const config = firebaseConfig;

  if (!config.apiKey || !config.projectId) {
    return res.status(500).json({
      configured: false,
      config: null,
      message: 'Firebase configuration is missing',
    });
  }

  return res.json({
    configured: true,
    config,
    message: 'Firebase configuration loaded successfully',
  });
});