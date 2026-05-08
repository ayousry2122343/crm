import { Module } from '@nestjs/common';
import { TicketService } from './ticket.service';
import { TicketController } from './ticket.controller';
import { NotificationModule } from '../../notifications/notification.module';
import { QueueModule } from '../queues/queue.module';

@Module({
  imports: [NotificationModule, QueueModule],
  providers: [TicketService],
  controllers: [TicketController],
  exports: [TicketService],
})
export class TicketModule {}
