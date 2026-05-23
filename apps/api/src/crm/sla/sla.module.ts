import { Module } from '@nestjs/common';
import { SLAService } from './sla.service';
import { SLAController } from './sla.controller';
import { SLABreachWorker } from './sla-breach.worker';
import { BusinessHoursModule } from './business-hours/business-hours.module';
import { NotificationModule } from '../../notifications/notification.module';

@Module({
  imports: [BusinessHoursModule, NotificationModule],
  providers: [SLAService, SLABreachWorker],
  controllers: [SLAController],
  exports: [SLAService],
})
export class SLAModule {}
