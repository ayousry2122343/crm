import { Module } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { AttachmentController } from './attachment.controller';
import { StorageService } from './storage.service';

@Module({
  providers: [AttachmentService, StorageService],
  controllers: [AttachmentController],
  exports: [AttachmentService, StorageService],
})
export class AttachmentModule {}
