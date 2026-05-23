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
import { MacroService } from './macro.service';
import { CreateMacroDto } from './dto/create-macro.dto';
import { UpdateMacroDto } from './dto/update-macro.dto';
import { QueryMacroDto } from './dto/query-macro.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('macros')
@UseGuards(PermissionGuard)
@Controller('macros')
export class MacroController {
  constructor(private readonly svc: MacroService) {}

  @RequiresPermission(PERMISSIONS.MACRO_READ)
  @Get()
  list(@Query() q: QueryMacroDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.MACRO_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.MACRO_WRITE)
  @Post()
  create(@Body() dto: CreateMacroDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.MACRO_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMacroDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.MACRO_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
