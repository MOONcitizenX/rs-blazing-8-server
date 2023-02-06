import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { WebsocketAdapter } from './adapter/WebsocketAdapter';
import { AppModule } from './app.module';

async function bootstrap() {
  const myCookieParser = cookieParser();
  const app = await NestFactory.create(AppModule);
  app.use(myCookieParser);
  app.useWebSocketAdapter(new WebsocketAdapter(myCookieParser));
  await app.listen(5554);
}
bootstrap();
