import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './workflow.executor';
import { WorkflowController } from './workflow.controller';

@Module({
  providers: [WorkflowService, WorkflowExecutor],
  controllers: [WorkflowController],
  exports: [WorkflowService, WorkflowExecutor],
})
export class WorkflowModule {}
