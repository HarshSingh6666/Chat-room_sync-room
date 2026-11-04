import { Router, Request, Response } from 'express';
import { findRoom, memoryMessages } from '../store';

export const messagesRouter = Router();

// Get room messages
messagesRouter.get('/:id/messages', (req: Request, res: Response) => {
  const room = findRoom(req.params.id);
  const messages = room ? memoryMessages.get(room.id) || [] : [];

  return res.json({ messages });
});

// Post message to room
messagesRouter.post('/:id/messages', (req: Request, res: Response) => {
  const room = findRoom(req.params.id);
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: 'Missing message',
    });
  }

  if (!room) {
    return res.status(404).json({
      error: 'Room not found',
    });
  }

  const messages = memoryMessages.get(room.id) || [];

  messages.push(message);

  // Keep the most recent 500 messages.
  if (messages.length > 500) {
    messages.splice(0, messages.length - 500);
  }

  memoryMessages.set(room.id, messages);

  return res.json({
    success: true,
    message,
  });
});
