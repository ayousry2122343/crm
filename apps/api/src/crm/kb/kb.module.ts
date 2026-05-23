import { Module } from '@nestjs/common';
import { KBService } from './kb.service';
import { KBController } from './kb.controller';

@Module({
  providers: [KBService],
  controllers: [KBController],
  exports: [KBService],
})
export class KBModule {}
