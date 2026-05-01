import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { TagService } from './tag.service';
import { CreateTagDto, UpdateTagDto } from './dto/create-tag.dto';
import { AssignTagDto } from './dto/assign-tag.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('tags')
@UseGuards(PermissionGuard)
@Controller('tags')
export class TagController {
  constructor(private readonly svc: TagService) {}

  @RequiresPermission(PERMISSIONS.TAG_WRITE)
  @Post()
  create(@Body() dto: CreateTagDto) {
    return this.svc.create(dto);
  }

  @Get()
  list() {
    return this.svc.list();
  }

  @RequiresPermission(PERMISSIONS.TAG_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateTagDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.TAG_WRITE)
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }

  @RequiresPermission(PERMISSIONS.TAG_WRITE)
  @Post(':tagId/assign')
  assign(@Param('tagId') tagId: string, @Body() dto: AssignTagDto) {
    return this.svc.assign(tagId, dto);
  }

  @RequiresPermission(PERMISSIONS.TAG_WRITE)
  @Post(':tagId/unassign')
  unassign(@Param('tagId') tagId: string, @Body() dto: AssignTagDto) {
    return this.svc.unassign(tagId, dto);
  }
}
