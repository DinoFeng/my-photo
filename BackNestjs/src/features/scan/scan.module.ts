import { Module } from '@nestjs/common';
import { ScanService } from './scan.service.js';
import { MediaProcessor } from './media.processor.js';
import { DatabaseModule } from '../../core/database/database.module.js';
import { QueueModule } from '../../core/queue/queue.module.js';

@Module({
  imports: [DatabaseModule, QueueModule],
  providers: [ScanService, MediaProcessor],
  exports: [ScanService, MediaProcessor],
})
export class ScanModule {}