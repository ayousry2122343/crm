import { Module } from '@nestjs/common';
import { SequenceService } from './sequence.service';
import { SequenceController } from './sequence.controller';

@Module({
  providers: [SequenceService],
  controllers: [SequenceController],
  exports: [SequenceService],
})
export class SequenceModule {}
