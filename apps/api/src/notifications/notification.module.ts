import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { JwtModule } from '@nestjs/jwt';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationWorker } from './notification.worker';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'notifications' }),
    JwtModule.register({}),
  ],
  providers: [
    NotificationService,
    NotificationGateway,
    NotificationWorker,
  ],
  controllers: [NotificationController],
  exports: [NotificationService, NotificationGateway],
})
export class NotificationModule {}
