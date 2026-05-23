import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { ChannelConfigController } from './channel-config.controller';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { NotificationModule } from '../../notifications/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [ChannelService, TwilioAdapter],
  controllers: [ChannelController, ChannelConfigController],
  exports: [ChannelService, TwilioAdapter],
})
export class ChannelModule {}
