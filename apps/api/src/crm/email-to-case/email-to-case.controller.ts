import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../core/auth/jwt.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import { EmailToCaseService } from './email-to-case.service';
import { CreateEmailToCaseConfigDto } from './dto/create-config.dto';
import { UpdateEmailToCaseConfigDto } from './dto/update-config.dto';
import { InboundEmailDto } from './dto/inbound-email.dto';

@ApiTags('email-to-case')
@Controller('email-to-case')
export class EmailToCaseController {
  constructor(private readonly svc: EmailToCaseService) {}

  @RequiresPermission(PERMISSIONS.EMAIL_TO_CASE_WRITE)
  @Post('configs')
  create(@Body() dto: CreateEmailToCaseConfigDto) {
    return this.svc.createConfig(dto);
  }

  @RequiresPermission(PERMISSIONS.EMAIL_TO_CASE_READ)
  @Get('configs')
  list() {
    return this.svc.listConfigs();
  }

  @RequiresPermission(PERMISSIONS.EMAIL_TO_CASE_READ)
  @Get('configs/:id')
  get(@Param('id') id: string) {
    return this.svc.getConfig(id);
  }

  @RequiresPermission(PERMISSIONS.EMAIL_TO_CASE_WRITE)
  @Patch('configs/:id')
  update(@Param('id') id: string, @Body() dto: UpdateEmailToCaseConfigDto) {
    return this.svc.updateConfig(id, dto);
  }

  @RequiresPermission(PERMISSIONS.EMAIL_TO_CASE_WRITE)
  @Delete('configs/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  delete(@Param('id') id: string) {
    return this.svc.deleteConfig(id);
  }

  @Public()
  @Post('inbound')
  @HttpCode(HttpStatus.OK)
  processInbound(@Body() dto: InboundEmailDto) {
    return this.svc.processInboundEmail(dto);
  }
}
