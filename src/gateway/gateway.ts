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

const PORT = Number(process.env.PORT) || 5555;

@WebSocketGateway(PORT, {
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
    // const roomState = this.gameService.reconnect(client.data.userId);
  }
  handleConnection(client: Socket, ...args: any[]) {
    console.log(client.data.userId, ' connected');
    const clientRoom = this.gameService.reconnect(client.data.userId);
    if (clientRoom) {
      const { room, chat, id, timerCount } = clientRoom;
      // const sockets = await this.server.in(room.roomId).fetchSockets();
      // const foundRoom = this.gameService.findRoom('user', client.data.userId);
      // foundRoom?.updateSockets(sockets);
      client.join(room.roomId);
      client.emit('room-state', room);
      client.emit('get-chat', chat.chat);
      client.emit('timer-update', { id, timerCount });
    }
  }

  @SubscribeMessage('create-room')
  async onCreateRoom(
    @MessageBody() message: CreateRoomClientEvent['payload'],
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const { room, chat } = this.gameService.createRoom(
      client.data.userId,
      message,
    );
    client.join(room.roomId);
    const sockets = await this.server.in(room.roomId).fetchSockets();
    this.gameService.sendPersonalStates(sockets, room);
    if (chat) {
      this.gameService.sendUpdatedChat(sockets, chat.chat);
    }
  }

  @SubscribeMessage('join-room')
  async onJoinRoom(
    @MessageBody() message: JoinRoomClientEvent['payload'],
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const clientRoom = this.gameService.joinRoom(client.data.userId, message);
    if (clientRoom) {
      const { room, chat } = clientRoom;
      client.join(message.roomId);
      const sockets = await this.server.in(room.roomId).fetchSockets();
      this.gameService.sendPersonalStates(sockets, room);
      if (chat) {
        this.gameService.sendUpdatedChat(sockets, chat.chat);
      }
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
      const sockets = await this.server.in(room.roomId).fetchSockets();
      this.gameService.sendPersonalStates(sockets, room);
      this.gameService.sendWinner(sockets, null);
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
      client.leave(room.roomId);
      const sockets = await this.server.in(room.roomId).fetchSockets();
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
      const sockets = await this.server.in(room.roomId).fetchSockets();
      const isGameStarted = room.startNewGame(this.server);
      if (isGameStarted) {
        this.gameService.sendPersonalStates(sockets, room);
        this.gameService.sendWinner(sockets, null);
      } else {
        sockets.forEach((socket) =>
          socket.emit('error', { message: 'Unable to start the game' }),
        );
      }
    }
  }

  @SubscribeMessage('draw-card')
  async onDrawCard(
    @ConnectedSocket()
    client: Socket<ClientToServerEvents, ServerToClientEvents>,
  ) {
    const room = this.gameService.findRoom('user', client.data.userId);
    if (room) {
      const card = room.drawCard(client.data.userId);
      const sockets = await this.server.in(room.roomId).fetchSockets();
      if (card) {
        const oneCardLeft = room.checkIsOneCardLeft();
        if (oneCardLeft) {
          this.gameService.sendOneCardLeft(sockets, true);
        } else {
          this.gameService.sendOneCardLeft(sockets, false);
        }
        this.gameService.sendPersonalStates(sockets, room);
      } else {
        sockets.forEach((socket) =>
          socket.emit('error', { message: 'No cards in deck to draw' }),
        );
      }
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
      const { winner, oneCardLeft } = room.playCard(
        client.data.userId,
        message.card,
      );
      const sockets = await this.server.in(room.roomId).fetchSockets();
      if (cardsMap[message.card].value === 'swap') {
        const player = room.findUserById(client.data.userId);
        if (player) {
          const swapPayload = room.playSwap(cardsMap[message.card], player);
          this.gameService.sendSwapCardPlayed(sockets, swapPayload);
          setTimeout(() => {
            this.gameService.sendPersonalStates(sockets, room);
          }, 500);
        }
      } else if (cardsMap[message.card].value === '8') {
        this.gameService.sendIsChooseColor(sockets, false, client);
        this.gameService.sendPersonalStates(sockets, room);
      } else {
        this.gameService.sendPersonalStates(sockets, room);
      }

      if (oneCardLeft) {
        this.gameService.sendOneCardLeft(sockets, true);
      } else {
        this.gameService.sendOneCardLeft(sockets, false);
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
