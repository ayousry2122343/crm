import { Body, Controller, Get, Ip, Param, Post, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../core/auth/public.decorator';
import { FormService } from './form.service';
import { FormSubmissionService } from './form-submission.service';
import { SubmitFormDto } from './dto/submit-form.dto';

@ApiTags('public-forms')
@Controller('public/forms')
export class PublicFormController {
  constructor(
    private readonly formSvc: FormService,
    private readonly submissionSvc: FormSubmissionService,
  ) {}

  @Public()
  @Get(':workspaceId/:slug')
  async getForm(
    @Param('workspaceId') workspaceId: string,
    @Param('slug') slug: string,
  ) {
    const form = await this.formSvc.getBySlug(slug, workspaceId);
    return {
      name: form.name,
      fields: form.fields,
      successMessage: form.successMessage,
    };
  }

  @Public()
  @Post(':workspaceId/:slug/submit')
  async submit(
    @Param('workspaceId') workspaceId: string,
    @Param('slug') slug: string,
    @Body() dto: SubmitFormDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const form = await this.formSvc.getBySlug(slug, workspaceId);
    return this.submissionSvc.submit(
      workspaceId,
      form.id,
      form.fields as any[],
      (form.mappings as Record<string, string>) ?? {},
      dto,
      ip,
      userAgent,
      form.rateLimit,
      form.useHoneypot,
    );
  }
}
