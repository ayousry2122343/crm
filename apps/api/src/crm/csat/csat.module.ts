import { Module } from '@nestjs/common';
import { CSATService } from './csat.service';
import { CSATController } from './csat.controller';

@Module({
  providers: [CSATService],
  controllers: [CSATController],
  exports: [CSATService],
})
export class CSATModule {}
