import { Module } from '@nestjs/common';
import { AgentExecutorService } from './agent-executor.service';
import { AgentConfigService } from './agent-config.service';
import { AgentConfigController } from './agent-config.controller';
import { AIModule } from '../ai.module';

@Module({
  imports: [AIModule],
  providers: [AgentExecutorService, AgentConfigService],
  controllers: [AgentConfigController],
  exports: [AgentExecutorService, AgentConfigService],
})
export class AgentModule {}
