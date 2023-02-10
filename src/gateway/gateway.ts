import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
export class Gateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(private gameService: GameService) {}
  handleDisconnect(client: Socket) {
    console.log(client.data.userId, ' disconnected');
    const roomState = this.gameService.reconnect(client.data.userId);
    if (roomState) {
      this.onLeaveRoom(client);
    }
  }
  handleConnection(client: Socket, ...args: any[]) {
    console.log(client.data.userId, ' connected');
    const roomState = this.gameService.reconnect(client.data.userId);
    if (roomState) {
      client.join(roomState.roomId);
      client.emit('room-state', roomState);
    }
  }

  @SubscribeMessage('create-room')
  onCreateRoom(
    @MessageBody() message: CreateRoomClientEvent['payload'],
    @ConnectedSocket() client: Socket,
  ) {
    const room = this.gameService.createRoom(client.data.userId, message);
    client.join(room.roomId);
    client.emit('room-state', room);
  }

  @SubscribeMessage('join-room')
  onJoinRoom(
    @MessageBody() message: JoinRoomClientEvent['payload'],
    @ConnectedSocket() client: Socket,
  ) {
    const roomState = this.gameService.joinRoom(client.data.userId, message);
    if (roomState) {
      client.join(message.roomId);
    } else {
      client.emit('error', { message: 'No such room exists or room is full' });
    }
    this.server.to(message.roomId).emit('room-state', roomState);
  }

  @SubscribeMessage('leave-room')
  onLeaveRoom(@ConnectedSocket() client: Socket) {
    const roomId = [...client.rooms][1];
    const roomState = this.gameService.leaveRoom(roomId, client.data.userId);

    if (roomState) {
      this.server.to(roomId).emit('room-state', roomState);
      client.emit('leave-success');
    } else {
      client.emit('error', { message: 'No such room or player exists' });
    }
  }

  @SubscribeMessage('start-game')
  async onStartGame(@ConnectedSocket() client: Socket) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      room.startNewGame();
      const sockets = await this.server.in(room.roomId).fetchSockets();
      sockets.forEach((socket) => {
        socket.emit('room-state', room.getUserState(socket.data.userId));
      });
    }
  }
}
