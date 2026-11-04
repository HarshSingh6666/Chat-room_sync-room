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

  // Retains the original guest auto-create behavior.
  if (!room) {
    const code = roomId.replace('room_', '').toUpperCase();

    room = {
      id: roomId,
      code:
        code.length === 6
          ? `${code.slice(0, 3)}-${code.slice(3)}`
          : code,
      adminId: '',
      adminName: 'Host',
      createdAt: Date.now(),
      status: 'active',
      participants: {},
    };
  }

  if (room.status === 'ended') {
    return res.status(410).json({
      error: 'Room ended',
    });
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

    // If the person leaving is the admin, automatically end the room for everyone!
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

  return res.json({ room });
});
