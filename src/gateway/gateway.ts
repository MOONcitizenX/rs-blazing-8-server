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
  PlayCardClientEvent,
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
  async onLeaveRoom(@ConnectedSocket() client: Socket) {
    const roomId = [...client.rooms][1];
    const room = this.gameService.leaveRoom(roomId, client.data.userId);

    if (room) {
      const sockets = await this.server.in(room.roomId).fetchSockets();
      const leftPlayer = room.findUserById(client.data.userId);
      if (leftPlayer) {
        leftPlayer.online = false;
      }
      this.gameService.sendPersonalStates(sockets, room);
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
      this.gameService.sendPersonalStates(sockets, room);
    }
  }

  @SubscribeMessage('draw-card')
  async onDrawCard(@ConnectedSocket() client: Socket) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      room.drawCard(client.data.userId);
      const sockets = await this.server.in(room.roomId).fetchSockets();
      this.gameService.sendPersonalStates(sockets, room);
    }
  }

  @SubscribeMessage('play-card')
  async onPlayCard(
    @ConnectedSocket() client: Socket,
    @MessageBody() message: PlayCardClientEvent['payload'],
  ) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      room.playCard(client.data.userId, message.card);
      const sockets = await this.server.in(room.roomId).fetchSockets();
      this.gameService.sendPersonalStates(sockets, room);
    }
  }
}
