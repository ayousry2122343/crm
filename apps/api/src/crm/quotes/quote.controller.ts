import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { QuoteService } from './quote.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { UpdateQuoteDto } from './dto/update-quote.dto';
import { QueryQuoteDto } from './dto/query-quote.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('quotes')
@UseGuards(PermissionGuard)
@Controller('quotes')
export class QuoteController {
  constructor(private readonly svc: QuoteService) {}

  @RequiresPermission(PERMISSIONS.QUOTE_READ)
  @Get()
  list(@Query() q: QueryQuoteDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.QUOTE_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.QUOTE_WRITE)
  @Post()
  create(@Body() dto: CreateQuoteDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.QUOTE_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateQuoteDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.QUOTE_WRITE)
  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.svc.updateStatus(id, 'SENT');
  }

  @RequiresPermission(PERMISSIONS.QUOTE_WRITE)
  @Post(':id/accept')
  accept(@Param('id') id: string) {
    return this.svc.updateStatus(id, 'ACCEPTED');
  }

  @RequiresPermission(PERMISSIONS.QUOTE_WRITE)
  @Post(':id/reject')
  reject(@Param('id') id: string) {
    return this.svc.updateStatus(id, 'REJECTED');
  }

  @RequiresPermission(PERMISSIONS.QUOTE_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
