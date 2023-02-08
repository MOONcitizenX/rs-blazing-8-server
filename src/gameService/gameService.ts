import { Injectable } from '@nestjs/common';
import {
  CreateRoomClientEvent,
  JoinRoomClientEvent,
} from 'src/webSocketsTypes';
import { Room } from './roomService';

@Injectable()
export class GameService {
  rooms: Room[] = [];

  createRoom(
    userId: string,
    { userName, avatarId }: CreateRoomClientEvent['payload'],
  ) {
    const room = new Room(userId, userName, avatarId);
    this.rooms.push(room);
    return room;
  }

  joinRoom(
    userId: string,
    { roomId, userName, avatarId }: JoinRoomClientEvent['payload'],
  ) {
    const room = this.findRoom('room', roomId);
    if (room) {
      const newRoom = room.addNewPlayer({ userId, userName, avatarId });
      return newRoom;
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
    const roomState = this.findRoom('user', userId);
    const player = roomState?.findUserById(userId);
    if (roomState && player) {
      player.online = true;
      return roomState;
    }
    return null;
  }

  findRoom(by: 'room' | 'user', id: string) {
    if (by === 'room') {
      const room = this.rooms.find((room) => {
        room.players.find((player) => player.id === id);
      });
      return room;
    }
    if (by === 'user') {
      const room = this.rooms.find((room) => room.roomId === id);
      return room;
    }
  }
}
