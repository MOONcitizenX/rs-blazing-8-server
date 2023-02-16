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
import { cardsMap } from 'src/data/cardsMap';
import { GameService } from 'src/gameService/gameService';
import {
  AddChatMessageClientEvent,
  CreateRoomClientEvent,
  JoinRoomClientEvent,
  PlayCardClientEvent,
} from 'src/webSocketsTypes';
import { ClientToServerEvents } from './socketTypes/ClientToServerEvents';
import { ServerToClientEvents } from './socketTypes/ServerToClientEvents';

@WebSocketGateway(5555, {
  cors: {
    origin: '*',
  },
})
export class Gateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server<ClientToServerEvents, ServerToClientEvents>;

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
    const clientRoom = this.gameService.reconnect(client.data.userId);
    if (clientRoom) {
      const { room, chat } = clientRoom;
      client.join(room.roomId);
      client.emit('room-state', room);
      client.emit('get-chat', chat.chat);
    }
  }

  @SubscribeMessage('create-room')
  onCreateRoom(
    @MessageBody() message: CreateRoomClientEvent['payload'],
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const { room, chat } = this.gameService.createRoom(
      client.data.userId,
      message,
    );
    client.join(room.roomId);
    client.emit('room-state', room);
    client.emit('get-chat', chat.chat);
  }

  @SubscribeMessage('join-room')
  onJoinRoom(
    @MessageBody() message: JoinRoomClientEvent['payload'],
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const clientRoom = this.gameService.joinRoom(client.data.userId, message);
    if (clientRoom) {
      const { room, chat } = clientRoom;
      client.join(message.roomId);
      this.server.to(message.roomId).emit('room-state', room);
      this.server.to(message.roomId).emit('get-chat', chat.chat);
    } else {
      client.emit('error', {
        message: 'No such room exists or room is full',
      });
    }
  }

  @SubscribeMessage('convert-to-lobby')
  async onConvertToLobby(
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      room.convertToLobby();
    }
  }

  @SubscribeMessage('leave-room')
  async onLeaveRoom(
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const roomId = [...client.rooms][1];
    const room = this.gameService.leaveRoom(roomId, client.data.userId);

    if (room) {
      const sockets = await this.server.in(room.roomId).fetchSockets();
      const leftPlayer = room.findUserById(client.data.userId);
      if (leftPlayer) {
        leftPlayer.online = false;
      }
      this.gameService.sendPersonalStates(sockets, room);
      const chat = this.gameService.findChat(room.roomId);
      if (chat) {
        chat.addMessage(client.data.userId, 'has left the game');
        this.gameService.sendUpdatedChat(sockets, chat.chat);
      }
      client.emit('leave-success');
    } else {
      client.emit('error', { message: 'No such room or player exists' });
    }
  }

  @SubscribeMessage('start-game')
  async onStartGame(
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      room.startNewGame();
      const sockets = await this.server.in(room.roomId).fetchSockets();
      this.gameService.sendPersonalStates(sockets, room);
    }
  }

  @SubscribeMessage('draw-card')
  async onDrawCard(
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      room.drawCard(client.data.userId);
      const sockets = await this.server.in(room.roomId).fetchSockets();
      this.gameService.sendPersonalStates(sockets, room);
    }
  }

  @SubscribeMessage('pass-turn')
  async onPassTurn(
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      room.movePlayerTurn();
      const sockets = await this.server.in(room.roomId).fetchSockets();
      this.gameService.sendPersonalStates(sockets, room);
    }
  }

  @SubscribeMessage('play-card')
  async onPlayCard(
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
    @MessageBody() message: PlayCardClientEvent['payload'],
  ) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      const winner = room.playCard(client.data.userId, message.card);
      const sockets = await this.server.in(room.roomId).fetchSockets();
      this.gameService.sendPersonalStates(sockets, room);
      if (cardsMap[message.card].value === '8') {
        this.gameService.sendIsChooseColor(sockets, false, client);
      }
      if (winner) {
        this.gameService.sendWinner(sockets, winner.id);
      }
    }
  }

  @SubscribeMessage('choose-color')
  async onChooseColor(
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      const sockets = await this.server.in(room.roomId).fetchSockets();
      this.gameService.sendIsChooseColor(sockets, true);
    }
  }

  @SubscribeMessage('add-chat-message')
  async onNewChatMessage(
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
    @MessageBody() message: AddChatMessageClientEvent['payload'],
  ) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      const chat = this.gameService.findChat(room.roomId);
      if (chat) {
        chat.addMessage(client.data.userId, message.message);
        const sockets = await this.server.in(room.roomId).fetchSockets();
        this.gameService.sendUpdatedChat(sockets, chat.chat);
      }
    }
  }
}
