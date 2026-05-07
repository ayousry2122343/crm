import { Module } from '@nestjs/common';
import { WebhookService } from './webhook.service';
import { WebhookDispatcher } from './webhook-dispatcher';
import { WebhookController } from './webhook.controller';

@Module({
  providers: [WebhookService, WebhookDispatcher],
  controllers: [WebhookController],
  exports: [WebhookService, WebhookDispatcher],
})
export class WebhookModule {}
