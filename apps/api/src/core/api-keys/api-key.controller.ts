import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../rbac/permission.guard';
import { RequiresPermission } from '../rbac/requires-permission.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@ApiBearerAuth()
@ApiTags('api-keys')
@UseGuards(PermissionGuard)
@Controller('api-keys')
export class ApiKeyController {
  constructor(private readonly svc: ApiKeyService) {}

  @RequiresPermission(PERMISSIONS.API_KEY_WRITE)
  @Post()
  create(@Body() dto: CreateApiKeyDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.API_KEY_READ)
  @Get()
  list() {
    return this.svc.list();
  }

  @RequiresPermission(PERMISSIONS.API_KEY_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateApiKeyDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.API_KEY_WRITE)
  @Delete(':id')
  revoke(@Param('id') id: string) {
    return this.svc.revoke(id);
  }
}
