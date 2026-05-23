import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CSATService } from './csat.service';
import { CreateCSATDto } from './dto/create-csat.dto';
import { RespondCSATDto } from './dto/respond-csat.dto';
import { QueryCSATDto } from './dto/query-csat.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import { Public } from '../../core/auth/jwt.guard';

@ApiBearerAuth()
@ApiTags('csat')
@UseGuards(PermissionGuard)
@Controller('csat')
export class CSATController {
  constructor(private readonly svc: CSATService) {}

  @RequiresPermission(PERMISSIONS.CSAT_WRITE)
  @Post('send')
  send(@Body() dto: CreateCSATDto) {
    return this.svc.send(dto);
  }

  @Public()
  @Post('respond')
  respond(@Body() dto: RespondCSATDto) {
    return this.svc.respond(dto);
  }

  @RequiresPermission(PERMISSIONS.CSAT_READ)
  @Get()
  list(@Query() q: QueryCSATDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.CSAT_READ)
  @Get('stats')
  stats() {
    return this.svc.stats();
  }
}
