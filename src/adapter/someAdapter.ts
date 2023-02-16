import { IoAdapter } from '@nestjs/platform-socket.io';
import { Server } from 'socket.io';
import { ClientToServerEvents } from 'src/gateway/socketTypes/ClientToServerEvents';
import { ServerToClientEvents } from 'src/gateway/socketTypes/ServerToClientEvents';
import { GetMeServerEvent } from 'src/webSocketsTypes';

export class SomeAdapter extends IoAdapter {
  idCounter = 0;

  users: Record<string, string> = {};

  createIOServer(port: number, options?: any): any {
    const server: Server<ClientToServerEvents, ServerToClientEvents> =
      super.createIOServer(port, options);
    server.use((socket, next) => {
      if (!socket.handshake.auth.token) {
        socket
          .timeout(1000)
          .emit('error', { message: 'No auth token provided' }, () => {
            socket.disconnect(true);
          });
      } else {
        socket.data.userId = this.getOrCreateUserId(
          socket.handshake.auth.token,
        );
        const getMePayload: GetMeServerEvent['payload'] = {
          id: socket.data.userId,
        };
        socket.emit('get-me', getMePayload);
      }
      next();
    });
    return server;
  }

  getOrCreateUserId(userToken: string) {
    const userId = this.users[userToken];
    if (userId) {
      return userId;
    }
    return (this.users[userToken] = String(this.idCounter++));
  }
}
