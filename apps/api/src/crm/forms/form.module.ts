import { Module } from '@nestjs/common';
import { FormService } from './form.service';
import { FormSubmissionService } from './form-submission.service';
import { FormController } from './form.controller';
import { PublicFormController } from './public-form.controller';

@Module({
  providers: [FormService, FormSubmissionService],
  controllers: [FormController, PublicFormController],
  exports: [FormService, FormSubmissionService],
})
export class FormModule {}
