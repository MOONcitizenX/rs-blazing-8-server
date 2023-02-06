import { NestFactory } from '@nestjs/core';
// import * as cookieParser from 'cookie-parser';
import * as session from 'express-session';
import { WebsocketAdapter } from './adapter/WebsocketAdapter';
import { AppModule } from './app.module';

async function bootstrap() {
  const myCookieParser = session({
    secret: 'my-secret',
    resave: false,
    saveUninitialized: false,
  });
  const app = await NestFactory.create(AppModule);
  app.use(myCookieParser);
  app.useWebSocketAdapter(new WebsocketAdapter(myCookieParser));
  await app.listen(5554);
}
bootstrap();
