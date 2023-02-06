import { IoAdapter } from '@nestjs/platform-socket.io';

export class WebsocketAdapter extends IoAdapter {
  constructor(private cookieParser: any) {
    super();
  }
  createIOServer(port: number, options?: any): any {
    const server = super.createIOServer(port, options);
    server.use((socket, next) => this.cookieParser(socket.request, {}, next));
    return server;
  }
}
