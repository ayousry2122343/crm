import { Module } from '@nestjs/common';
import { ServiceDashboardService } from './service-dashboard.service';
import { ServiceDashboardController } from './service-dashboard.controller';

@Module({
  providers: [ServiceDashboardService],
  controllers: [ServiceDashboardController],
  exports: [ServiceDashboardService],
})
export class ServiceDashboardModule {}
