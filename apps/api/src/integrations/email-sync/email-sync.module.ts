import { Module } from '@nestjs/common';
import { EmailSyncService } from './email-sync.service';
import { EmailSyncController } from './email-sync.controller';

@Module({
  providers: [EmailSyncService],
  controllers: [EmailSyncController],
  exports: [EmailSyncService],
})
export class EmailSyncModule {}
