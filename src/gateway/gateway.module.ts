import { Module } from '@nestjs/common';
import { GameService } from 'src/gameService/gameService';
import { Gateway } from './gateway';

@Module({
  providers: [Gateway, GameService],
})
export class GatewayModule {}
