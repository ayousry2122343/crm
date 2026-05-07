import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ValidationService } from './validation.service';
import { CreateValidationRuleDto } from './dto/create-validation-rule.dto';
import { UpdateValidationRuleDto } from './dto/update-validation-rule.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';

@ApiBearerAuth()
@ApiTags('validation-rules')
@UseGuards(PermissionGuard)
@Controller('validation-rules')
export class ValidationController {
  constructor(private readonly svc: ValidationService) {}

  @RequiresPermission('validation-rule:read')
  @Get()
  list() {
    return this.svc.list();
  }

  @RequiresPermission('validation-rule:read')
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission('validation-rule:write')
  @Post()
  create(@Body() dto: CreateValidationRuleDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission('validation-rule:write')
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateValidationRuleDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission('validation-rule:write')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
