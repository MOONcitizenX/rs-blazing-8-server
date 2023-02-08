import { NestFactory } from '@nestjs/core';
import { SomeAdapter } from './adapter/someAdapter';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new SomeAdapter());
  await app.listen(5554);
}
bootstrap();
