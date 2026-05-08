import { Module } from '@nestjs/common';
import { PricebookService } from './pricebook.service';
import { PricebookController } from './pricebook.controller';

@Module({
  providers: [PricebookService],
  controllers: [PricebookController],
  exports: [PricebookService],
})
export class PricebookModule {}
