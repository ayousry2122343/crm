import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { FormService } from './form.service';
import { CreateFormDto } from './dto/create-form.dto';
import { UpdateFormDto } from './dto/update-form.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('forms')
@UseGuards(PermissionGuard)
@Controller('forms')
export class FormController {
  constructor(private readonly svc: FormService) {}

  @RequiresPermission('form:read')
  @Get()
  list() {
    return this.svc.list();
  }

  @RequiresPermission('form:read')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.FORM_WRITE)
  @Post()
  create(@Body() dto: CreateFormDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.FORM_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateFormDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.FORM_WRITE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
