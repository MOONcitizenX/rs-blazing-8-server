import { Injectable, Req } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AppService {
  getCookies(@Req() request: Request) {
    console.log(request.cookies);
    return request.cookies;
  }
}
