import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChannelService } from './channel.service';
import { CreateChannelConfigDto, UpdateChannelConfigDto } from './dto/create-channel-config.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('channel-configs')
@UseGuards(PermissionGuard)
@Controller('channel-configs')
export class ChannelConfigController {
  constructor(private readonly svc: ChannelService) {}

  @RequiresPermission(PERMISSIONS.CHANNEL_READ)
  @Get()
  list() {
    return this.svc.listConfigs();
  }

  @RequiresPermission(PERMISSIONS.CHANNEL_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.getConfig(id);
  }

  @RequiresPermission(PERMISSIONS.CHANNEL_WRITE)
  @Post()
  create(@Body() dto: CreateChannelConfigDto) {
    return this.svc.createConfig(dto);
  }

  @RequiresPermission(PERMISSIONS.CHANNEL_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateChannelConfigDto) {
    return this.svc.updateConfig(id, dto);
  }
}
