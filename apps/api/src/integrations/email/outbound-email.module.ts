import { Module } from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { OutboundEmailService } from './outbound-email.service';
import { OutboundEmailController } from './outbound-email.controller';
import { EmailTrackingService } from './email-tracking.service';
import { EmailTrackingController } from './email-tracking.controller';

@Module({
  providers: [EmailTemplateService, OutboundEmailService, EmailTrackingService],
  controllers: [OutboundEmailController, EmailTrackingController],
  exports: [EmailTemplateService, OutboundEmailService, EmailTrackingService],
})
export class OutboundEmailModule {}
