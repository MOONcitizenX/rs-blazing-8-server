import { IoAdapter } from '@nestjs/platform-socket.io';
import { NextFunction, Request, Response } from 'express';
import { Session } from 'express-session';

declare module 'http' {
  interface IncomingMessage {
    session: Session & {
      authenticated: boolean;
    };
  }
}

export class WebsocketAdapter extends IoAdapter {
  constructor(private session: any) {
    super();
  }
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.use((socket, next) =>
      this.session(
        socket.request as Request,
        {} as Response,
        next as NextFunction,
      ),
    );
    return server;
  }
}
