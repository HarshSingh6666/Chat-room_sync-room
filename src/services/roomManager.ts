import { SignalingManager } from './room/SignalingManager';

export class RoomManager extends SignalingManager {}

export const roomManager = new RoomManager();
