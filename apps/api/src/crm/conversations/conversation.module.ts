import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConversationService } from './conversation.service';
import { ConversationController } from './conversation.controller';
import { ConversationGateway } from './conversation.gateway';
import { NotificationModule } from '../../notifications/notification.module';

@Module({
  imports: [NotificationModule, JwtModule.register({})],
  providers: [ConversationService, ConversationGateway],
  controllers: [ConversationController],
  exports: [ConversationService, ConversationGateway],
})
export class ConversationModule {}
