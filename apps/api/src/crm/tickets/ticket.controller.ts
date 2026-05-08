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
import { TicketService } from './ticket.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { ChangeStatusDto } from './dto/change-status.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { QueryTicketDto } from './dto/query-ticket.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('tickets')
@UseGuards(PermissionGuard)
@Controller('tickets')
export class TicketController {
  constructor(private readonly svc: TicketService) {}

  @RequiresPermission(PERMISSIONS.TICKET_READ)
  @Get()
  list(@Query() q: QueryTicketDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.TICKET_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.TICKET_WRITE)
  @Post()
  create(@Body() dto: CreateTicketDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.TICKET_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.TICKET_WRITE)
  @Patch(':id/status')
  changeStatus(@Param('id') id: string, @Body() dto: ChangeStatusDto) {
    return this.svc.changeStatus(id, dto.status);
  }

  @RequiresPermission(PERMISSIONS.TICKET_ASSIGN)
  @Patch(':id/assign')
  assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.svc.assign(id, dto.assigneeId);
  }

  @RequiresPermission(PERMISSIONS.TICKET_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
