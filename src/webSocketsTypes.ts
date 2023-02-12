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

export interface DrawCardClientEvent {
  event: 'draw-card';
}

export interface PutCardClientEvent {
  event: 'play-card';
  payload: {
    card: string;
  };
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
