import { Module } from '@nestjs/common';
import { ChannelService } from './channel.service';
import { ChannelController } from './channel.controller';
import { ChannelConfigController } from './channel-config.controller';
import { TwilioAdapter } from './adapters/twilio.adapter';
import { TwilioWhatsAppAdapter } from './adapters/twilio-whatsapp.adapter';
import { WhatsAppTemplateService } from './whatsapp-template.service';
import { WhatsAppTemplateController } from './whatsapp-template.controller';
import { NotificationModule } from '../../notifications/notification.module';

@Module({
  imports: [NotificationModule],
  providers: [ChannelService, TwilioAdapter, TwilioWhatsAppAdapter, WhatsAppTemplateService],
  controllers: [ChannelController, ChannelConfigController, WhatsAppTemplateController],
  exports: [ChannelService, TwilioAdapter, TwilioWhatsAppAdapter, WhatsAppTemplateService],
})
export class ChannelModule {}
