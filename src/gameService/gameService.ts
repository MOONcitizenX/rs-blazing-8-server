import { Injectable } from '@nestjs/common';
import { RemoteSocket, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Chat, ChatMessage } from 'src/chatService/chatService';
import {
  CreateRoomClientEvent,
  JoinRoomClientEvent,
} from 'src/webSocketsTypes';
import { Room } from './roomService';

@Injectable()
export class GameService {
  rooms: Room[] = [];
  chats: Chat[] = [];

  createRoom(
    userId: string,
    { userName, avatarId }: CreateRoomClientEvent['payload'],
  ) {
    const room = new Room(userId, userName, avatarId);
    this.rooms.push(room);
    const chat = new Chat(userId, room.roomId);
    this.chats.push(chat);
    return { room, chat };
  }

  joinRoom(
    userId: string,
    { roomId, userName, avatarId }: JoinRoomClientEvent['payload'],
  ) {
    const room = this.findRoom('room', roomId);
    const chat = this.findChat(roomId);
    if (room && chat && room.players.length < 5) {
      const newRoom = room.addNewPlayer({ userId, userName, avatarId });
      chat.addMessage(userId);
      return { room: newRoom, chat };
    }
    return null;
  }

  leaveRoom(roomId: string, userId: string) {
    const roomState = this.findRoom('room', roomId);
    // Handle lobby client leave
    if (roomState && roomState.status === 'lobby') {
      const playerIndex = roomState.players.findIndex(
        (player) => player.id === userId,
      );
      if (playerIndex !== -1) {
        roomState.players.splice(playerIndex, 1);
        return roomState;
      }
    }

    //Handle game client leave
    if (roomState && roomState.status === 'playing') {
      const playerIndex = roomState.players.findIndex(
        (player) => player.id === userId,
      );
      if (playerIndex !== -1) {
        roomState.players[playerIndex].online = false;
        return roomState;
      }
    }
    return null;
  }

  reconnect(userId: string) {
    const room = this.findRoom('user', userId);
    if (room) {
      const chat = this.findChat(room.roomId);
      const player = room.findUserById(userId);
      const personalRoomState = room.getUserState(userId);
      if (personalRoomState && player && chat) {
        player.online = true;
        return { room: personalRoomState, chat };
      }
    }
    return null;
  }

  findRoom(by: 'room' | 'user', id: string) {
    if (by === 'user') {
      const room = this.rooms.find((room) => {
        return room.findUserById(id);
      });
      return room;
    }
    if (by === 'room') {
      const room = this.rooms.find((room) => room.roomId === id);
      return room;
    }
  }

  findChat(roomId: string) {
    return this.chats.find((chat) => chat.roomId === roomId);
  }

  sendPersonalStates(
    sockets: RemoteSocket<DefaultEventsMap, any>[],
    room: Room,
  ) {
    sockets.forEach((socket) => {
      socket.emit('room-state', room.getUserState(socket.data.userId));
    });
  }

  sendIsChooseColor(
    client: Socket,
    sockets: RemoteSocket<DefaultEventsMap, any>[],
    value: boolean,
  ) {
    sockets.forEach((socket) => {
      if (socket.data.userId !== client.data.userId) {
        socket.emit('choose-color', value);
      }
    });
  }

  sendUpdatedChat(
    sockets: RemoteSocket<DefaultEventsMap, any>[],
    chat: ChatMessage[],
  ) {
    sockets.forEach((socket) => {
      socket.emit('get-chat', chat);
    });
  }
}
