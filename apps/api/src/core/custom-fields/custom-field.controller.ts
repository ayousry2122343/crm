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
import { CustomFieldService } from './custom-field.service';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { PermissionGuard } from '../rbac/permission.guard';
import { RequiresPermission } from '../rbac/requires-permission.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('custom-fields')
@UseGuards(PermissionGuard)
@Controller('custom-fields')
export class CustomFieldController {
  constructor(private readonly svc: CustomFieldService) {}

  @RequiresPermission(PERMISSIONS.CUSTOM_FIELD_WRITE)
  @Post()
  create(@Body() dto: CreateCustomFieldDto) {
    return this.svc.create(dto);
  }

  @Get()
  list(@Query('entityType') entityType?: string) {
    return this.svc.list(entityType);
  }

  @RequiresPermission(PERMISSIONS.CUSTOM_FIELD_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCustomFieldDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.CUSTOM_FIELD_WRITE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
