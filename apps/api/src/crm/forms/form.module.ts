import { Module } from '@nestjs/common';
import { FormService } from './form.service';
import { FormSubmissionService } from './form-submission.service';
import { WebToCaseService } from './web-to-case.service';
import { FormController } from './form.controller';
import { PublicFormController } from './public-form.controller';

@Module({
  providers: [FormService, FormSubmissionService, WebToCaseService],
  controllers: [FormController, PublicFormController],
  exports: [FormService, FormSubmissionService, WebToCaseService],
})
export class FormModule {}
