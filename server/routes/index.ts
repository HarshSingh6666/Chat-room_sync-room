import { Router } from 'express';
import { roomsRouter } from './rooms';
import { messagesRouter } from './messages';
import { signalsRouter } from './signals';
import { reactionsRouter } from './reactions';
import { aiRouter } from './ai';
import { configRouter } from './config';

export const apiRouter = Router();

// Sub-resource routers for rooms
apiRouter.use('/rooms', messagesRouter);
apiRouter.use('/rooms', signalsRouter);
apiRouter.use('/rooms', reactionsRouter);

// Core room operations
apiRouter.use('/rooms', roomsRouter);

// Gemini AI meeting assistant
apiRouter.use('/ai', aiRouter);

// Public Firebase config
apiRouter.use('/firebase-config', configRouter);
