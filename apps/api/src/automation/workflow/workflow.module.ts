import { Module, forwardRef } from '@nestjs/common';
import { WorkflowService } from './workflow.service';
import { WorkflowExecutor } from './workflow.executor';
import { WorkflowController } from './workflow.controller';
import { CronRunnerService } from './cron-runner.service';
import { NotificationModule } from '../../notifications/notification.module';

@Module({
  imports: [forwardRef(() => NotificationModule)],
  providers: [WorkflowService, WorkflowExecutor, CronRunnerService],
  controllers: [WorkflowController],
  exports: [WorkflowService, WorkflowExecutor, CronRunnerService],
})
export class WorkflowModule {}
