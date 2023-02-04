import { OnModuleInit } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from 'src/gameService/gameService';
import {
  CreateRoomClientEvent,
  JoinRoomClientEvent,
} from 'src/webSocketsTypes';

@WebSocketGateway(5555, {
  cors: {
    origin: '*',
  },
})
export class Gateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(private gameService: GameService) {}

  onModuleInit() {
    this.server.on('connection', (socket) => {
      console.log(socket.id, ' Connected');
    });
  }

  @SubscribeMessage('create-room')
  onCreateRoom(
    @MessageBody() message: CreateRoomClientEvent['payload'],
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.gameService.createRoom(client.id, message.userName);
    client.join(room.roomId);
    client.emit('room-state', room);
  }

  @SubscribeMessage('join-room')
  onJoinRoom(
    @MessageBody() message: JoinRoomClientEvent['payload'],
    @ConnectedSocket() client: Socket,
  ) {
    const roomState = this.gameService.joinRoom(client.id, message);
    console.log(roomState);
    if (roomState) {
      client.join(message.roomId);
    }
    this.server.to(message.roomId).emit('room-state', roomState);
  }
}
