import { Module, OnModuleInit } from '@nestjs/common';
import { DatabaseModule } from './core/database/database.module.js';
import { QueueModule } from './core/queue/queue.module.js';
import { SseModule } from './core/sse/sse.module.js';
import { ScanModule } from './features/scan/scan.module.js';
import { MediaModule } from './features/media/media.module.js';
import { DatabaseService } from './core/database/database.service.js';
import { QueueService } from './core/queue/queue.service.js';
import { ScanService } from './features/scan/scan.service.js';
import { MediaProcessor } from './features/scan/media.processor.js';

@Module({
  imports: [DatabaseModule, QueueModule, SseModule, ScanModule, MediaModule],
})
export class AppModule implements OnModuleInit {
  constructor(
    private dbService: DatabaseService,
    private queueService: QueueService,
    private scanService: ScanService,
    private mediaProcessor: MediaProcessor,
  ) {}

  async onModuleInit() {
    await this.dbService.ensureReady();
    this.queueService.register('folder', async (payload) => {
      await this.scanService.processDirectory(payload.currentPath);
    });
    this.queueService.register('file', async (payload) => {
      await this.mediaProcessor.processFile(payload);
    });
    await this.scanService.start();
  }
}