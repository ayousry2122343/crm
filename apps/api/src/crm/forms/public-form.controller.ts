import { Body, Controller, Get, Ip, Param, Post, Headers } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../core/auth/public.decorator';
import { FormService } from './form.service';
import { FormSubmissionService } from './form-submission.service';
import { WebToCaseService } from './web-to-case.service';
import { SubmitFormDto } from './dto/submit-form.dto';

@ApiTags('public-forms')
@Controller('public/forms')
export class PublicFormController {
  constructor(
    private readonly formSvc: FormService,
    private readonly submissionSvc: FormSubmissionService,
    private readonly webToCaseSvc: WebToCaseService,
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
    const mappings = (form.mappings as Record<string, string>) ?? {};

    const submission = await this.submissionSvc.submit(
      workspaceId,
      form.id,
      form.fields as any[],
      mappings,
      dto,
      ip,
      userAgent,
      form.rateLimit,
      form.useHoneypot,
    );

    if ((form as any).createTicket && submission && 'id' in submission) {
      const ticket = await this.webToCaseSvc.createTicketFromSubmission({
        workspaceId,
        formId: form.id,
        formName: form.name,
        ticketQueueId: (form as any).ticketQueueId ?? null,
        submissionId: submission.id,
        personId: submission.personId ?? null,
        data: dto.data,
        mappings,
        createdById: (form as any).createdById ?? 'system',
      });
      return { ...submission, ticketId: ticket.id, ticketNumber: ticket.ticketNumber };
    }

    return submission;
  }
}
