import { Router, Request, Response } from 'express';
import { findRoom, saveRoom } from '../store';
import { ServerRoom, ServerParticipant } from '../types';

export const roomsRouter = Router();

// Create or update a room
roomsRouter.post('/', (req: Request, res: Response) => {
  const room = req.body as ServerRoom;

  if (!room || !room.id || !room.code) {
    return res.status(400).json({
      error: 'Invalid room payload',
    });
  }

  if (!room.participants || typeof room.participants !== 'object') {
    room.participants = {};
  }

  if (room.status !== 'ended') {
    room.status = 'active';
  }

  saveRoom(room);

  return res.json({
    success: true,
    room,
  });
});

// Join room
roomsRouter.post('/:id/join', (req: Request, res: Response) => {
  const roomId = req.params.id;
  const { user } = req.body;

  if (!user || !user.id) {
    return res.status(400).json({
      error: 'Missing user profile',
    });
  }

  let room = findRoom(roomId);

  if (!room || room.status === 'ended') {
    return res.status(410).json({
      error: 'This room code and link have expired or the meeting was closed by the host.',
    });
  }

  // Deduplicate same-name guests: if a guest rejoins with the same name (e.g. after accidental back/disconnect),
  // remove the old stale participant ID to prevent duplicate participants in the room!
  if (user.role !== 'admin') {
    const trimmedNewName = (user.name || '').trim().toLowerCase();
    for (const existingId of Object.keys(room.participants)) {
      const existing = room.participants[existingId];
      if (
        existing &&
        existing.id !== user.id &&
        existing.role !== 'admin' &&
        existing.name.trim().toLowerCase() === trimmedNewName
      ) {
        delete room.participants[existingId];
      }
    }
  }

  const participant: ServerParticipant = {
    id: user.id,
    name: user.name || 'Guest',
    role: user.role === 'admin' ? 'admin' : 'guest',
    isMuted: false,
    isCameraOff: false,
    joinedAt: Date.now(),
    photoURL: user.photoURL,
  };

  room.participants[user.id] = participant;
  saveRoom(room);

  return res.json({
    success: true,
    room,
    participant,
  });
});

// Leave room
roomsRouter.post('/:id/leave', (req: Request, res: Response) => {
  const room = findRoom(req.params.id);
  const { userId } = req.body;

  if (room && userId) {
    delete room.participants[userId];

    // If the person leaving is the admin/host, automatically end and expire the room for everyone!
    if (room.adminId === userId) {
      room.status = 'ended';
      room.participants = {};
    }

    saveRoom(room);
  }

  return res.json({ success: true, roomStatus: room?.status });
});

// End room for everyone
roomsRouter.post('/:id/end', (req: Request, res: Response) => {
  const room = findRoom(req.params.id);

  if (room) {
    room.status = 'ended';
    room.participants = {};
    saveRoom(room);
  }

  return res.json({ success: true, status: 'ended' });
});

// Update participant state
roomsRouter.post('/:id/participant-state', (req: Request, res: Response) => {
  const room = findRoom(req.params.id);
  const { userId, updates } = req.body;

  if (!userId || !updates || typeof updates !== 'object') {
    return res.status(400).json({
      error: 'Missing participant updates',
    });
  }

  if (room && room.participants[userId]) {
    room.participants[userId] = {
      ...room.participants[userId],
      ...updates,
      id: userId,
    };

    saveRoom(room);
  }

  return res.json({ success: true });
});

// Find room by code or id
roomsRouter.get('/:codeOrId', (req: Request, res: Response) => {
  const room = findRoom(req.params.codeOrId);

  if (!room) {
    return res.status(404).json({
      error: 'Room not found',
    });
  }

  if (room.status === 'ended') {
    return res.status(410).json({
      error: 'This room code and link have expired.',
      status: 'ended',
    });
  }

  return res.json({ room });
});
