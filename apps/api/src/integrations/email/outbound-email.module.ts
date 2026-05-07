import { Module } from '@nestjs/common';
import { EmailTemplateService } from './email-template.service';
import { OutboundEmailService } from './outbound-email.service';
import { OutboundEmailController } from './outbound-email.controller';

@Module({
  providers: [EmailTemplateService, OutboundEmailService],
  controllers: [OutboundEmailController],
  exports: [EmailTemplateService, OutboundEmailService],
})
export class OutboundEmailModule {}
