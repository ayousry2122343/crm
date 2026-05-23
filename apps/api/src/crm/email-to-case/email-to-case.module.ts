import { Module } from '@nestjs/common';
import { EmailToCaseService } from './email-to-case.service';
import { EmailToCaseController } from './email-to-case.controller';
import { TicketModule } from '../tickets/ticket.module';

@Module({
  imports: [TicketModule],
  providers: [EmailToCaseService],
  controllers: [EmailToCaseController],
  exports: [EmailToCaseService],
})
export class EmailToCaseModule {}
