import { Room } from './gameService/gameService';

// From front to back

export interface CreateRoomClientEvent {
  event: 'create-room';
  payload: {
    userName: string;
  };
}

export interface JoinRoomClientEvent {
  event: 'join-room';
  payload: {
    roomId: string;
    userName: string;
  };
}

// From back to front
export interface RoomStateServerEvent {
  event: 'room-state';
  payload: Room | null;
}
