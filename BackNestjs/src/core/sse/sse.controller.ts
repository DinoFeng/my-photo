import { Controller, Sse } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SseService } from './sse.service.js';

@Controller('sse')
export class SseController {
  constructor(private readonly sseService: SseService) {}

  @Sse('connect')
  connect(): Observable<MessageEvent> {
    const { observable } = this.sseService.createConnection();
    return observable;
  }

  @Sse('media-updates')
  mediaUpdates(): Observable<MessageEvent> {
    const { observable } = this.sseService.createMediaConnection();
    return observable;
  }
}