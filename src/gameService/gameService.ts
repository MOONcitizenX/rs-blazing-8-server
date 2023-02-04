import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface Room {
  id: string;
  players: [
    {
      id: string;
      name: string;
    },
  ];
}

@Injectable()
export class GameService {
  rooms: Room[] = [];

  createRoom(clientId: string, userName: string) {
    const roomID = randomUUID();
    const room: Room = {
      id: roomID,
      players: [
        {
          id: clientId,
          name: userName,
        },
      ],
    };
    this.rooms.push(room);
    return room;
  }

  joinRoom(
    clientId: string,
    { roomId, userName }: { roomId: string; userName: string },
  ) {
    const roomState = this.rooms.find((room) => room.id === roomId);
    if (roomState) {
      if (!roomState.players.find((player) => player.id === clientId)) {
        roomState.players.push({
          id: clientId,
          name: userName,
        });
        return roomState;
      } else {
        return roomState;
      }
    }
    return null;
  }
}
