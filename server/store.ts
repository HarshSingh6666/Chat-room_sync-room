import { ServerRoom, ServerSignal, ServerReaction } from './types';

export const memoryRooms = new Map<string, ServerRoom>();
export const memoryMessages = new Map<string, any[]>();
export const memorySignals = new Map<string, ServerSignal[]>();
export const memoryReactions = new Map<string, ServerReaction[]>();

export function findRoom(key: string): ServerRoom | undefined {
  const direct =
    memoryRooms.get(key) ||
    memoryRooms.get(key.toUpperCase()) ||
    memoryRooms.get(key.toLowerCase());

  if (direct) return direct;

  const normalized = key.replace(/-/g, '').toUpperCase();

  // Room objects may have multiple keys in the map.
  for (const room of new Set(memoryRooms.values())) {
    if (
      room.code.replace(/-/g, '').toUpperCase() === normalized ||
      room.id === key
    ) {
      return room;
    }
  }

  return undefined;
}

export function saveRoom(room: ServerRoom): void {
  memoryRooms.set(room.id, room);
  memoryRooms.set(room.code.toUpperCase(), room);

  if (!memoryMessages.has(room.id)) {
    memoryMessages.set(room.id, []);
  }

  if (!memorySignals.has(room.id)) {
    memorySignals.set(room.id, []);
  }

  if (!memoryReactions.has(room.id)) {
    memoryReactions.set(room.id, []);
  }
}
