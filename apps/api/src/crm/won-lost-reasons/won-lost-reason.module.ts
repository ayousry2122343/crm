import { Module } from '@nestjs/common';
import { WonLostReasonService } from './won-lost-reason.service';
import { WonLostReasonController } from './won-lost-reason.controller';

@Module({
  providers: [WonLostReasonService],
  controllers: [WonLostReasonController],
  exports: [WonLostReasonService],
})
export class WonLostReasonModule {}
