import { Router, Request, Response } from 'express';
import { findRoom, memorySignals } from '../store';

export const signalsRouter = Router();

// Get WebRTC signals for room
signalsRouter.get('/:id/signals', (req: Request, res: Response) => {
  const room = findRoom(req.params.id);
  const since = Number(req.query.since) || 0;
  const excludeUserId = req.query.excludeUserId as string;

  const allSignals = room ? memorySignals.get(room.id) || [] : [];

  const signals = allSignals.filter(
    (signal) =>
      signal.timestamp > since &&
      (!excludeUserId || signal.fromUserId !== excludeUserId)
  );

  return res.json({ signals });
});

// Post WebRTC signal for room
signalsRouter.post('/:id/signals', (req: Request, res: Response) => {
  const room = findRoom(req.params.id);
  const { fromUserId, targetUserId, signal, timestamp } = req.body;

  if (!room) {
    return res.status(404).json({
      error: 'Room not found',
    });
  }

  if (!fromUserId || !signal) {
    return res.status(400).json({
      error: 'Missing signal parameters',
    });
  }

  const signals = memorySignals.get(room.id) || [];

  signals.push({
    fromUserId,
    targetUserId,
    signal,
    timestamp: timestamp || Date.now(),
  });

  if (signals.length > 100) {
    signals.splice(0, signals.length - 100);
  }

  memorySignals.set(room.id, signals);

  return res.json({ success: true });
});
