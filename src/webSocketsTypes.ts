// From front to back

import { ChatMessage } from './chatService/chatService';
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

export interface PlayCardClientEvent {
  event: 'play-card';
  payload: {
    card: string;
  };
}

export interface ChooseColorClientEvent {
  event: 'choose-color';
}

export interface PassTurnClientEvent {
  event: 'pass-turn';
}

export interface AddChatMessageClientEvent {
  event: 'add-chat-message';
  payload: {
    message: string;
  };
}

// From back to front
export interface RoomStateServerEvent {
  event: 'room-state';
  payload: Room | null;
}

export interface ChooseColorServerEvent {
  event: 'choose-color';
  payload: boolean;
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

export interface GetChatServerEvent {
  event: 'get-chat';
  payload: ChatMessage[];
}
