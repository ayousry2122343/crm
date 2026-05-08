import { Module } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './workflow.executor';
import { WorkflowController } from './workflow.controller';
import { CronRunnerService } from './cron-runner.service';

@Module({
  providers: [WorkflowService, WorkflowExecutor, CronRunnerService],
  controllers: [WorkflowController],
  exports: [WorkflowService, WorkflowExecutor, CronRunnerService],
})
export class WorkflowModule {}
