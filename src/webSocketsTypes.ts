// From front to back

import { Room } from './gameService/roomService';

export interface CreateRoomClientEvent {
  event: 'create-room';
  payload: {
    userName: string;
    avatarId: string;
  };
}

export interface JoinRoomClientEvent {
  event: 'join-room';
  payload: {
    roomId: string;
    userName: string;
    avatarId: string;
  };
}

export interface LeaveRoomClientEvent {
  event: 'leave-room';
}

export interface StartGameClientEvent {
  event: 'start-game';
}

export interface DrawCardClietnEvent {
  event: 'draw-card';
}

// From back to front
export interface RoomStateServerEvent {
  event: 'room-state';
  payload: Room | null;
}

export interface GetMeServerEvent {
  event: 'get-me';
  payload: {
    id: string;
  };
}

export interface LeaveSuccessServerEvent {
  event: 'leave-success';
}
