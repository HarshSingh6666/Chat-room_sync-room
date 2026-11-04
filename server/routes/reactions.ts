import { Router, Request, Response } from 'express';
import { findRoom, memoryReactions } from '../store';

export const reactionsRouter = Router();

// Get reactions for room
reactionsRouter.get('/:id/reactions', (req: Request, res: Response) => {
  const room = findRoom(req.params.id);
  const since = Number(req.query.since) || 0;

  const allReactions = room ? memoryReactions.get(room.id) || [] : [];

  const reactions = allReactions.filter(
    (reaction) => reaction.timestamp > since
  );

  return res.json({ reactions });
});

// Post reaction to room
reactionsRouter.post('/:id/reactions', (req: Request, res: Response) => {
  const room = findRoom(req.params.id);
  const { emoji, senderName, timestamp } = req.body;

  if (!room) {
    return res.status(404).json({
      error: 'Room not found',
    });
  }

  if (!emoji) {
    return res.status(400).json({
      error: 'Missing emoji',
    });
  }

  const reactions = memoryReactions.get(room.id) || [];

  reactions.push({
    emoji,
    senderName: senderName || 'Guest',
    timestamp: timestamp || Date.now(),
  });

  if (reactions.length > 50) {
    reactions.splice(0, reactions.length - 50);
  }

  memoryReactions.set(room.id, reactions);

  return res.json({ success: true });
});
