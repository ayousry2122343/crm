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
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { QueryCampaignDto } from './dto/query-campaign.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import { Public } from '../../core/auth/jwt.guard';

@ApiBearerAuth()
@ApiTags('campaigns')
@UseGuards(PermissionGuard)
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly svc: CampaignService) {}

  @RequiresPermission(PERMISSIONS.CAMPAIGN_READ)
  @Get()
  list(@Query() q: QueryCampaignDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.CAMPAIGN_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.CAMPAIGN_WRITE)
  @Post()
  create(@Body() dto: CreateCampaignDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.CAMPAIGN_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCampaignDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.CAMPAIGN_WRITE)
  @Post(':id/schedule')
  schedule(@Param('id') id: string, @Body('scheduledAt') scheduledAt: string) {
    return this.svc.schedule(id, new Date(scheduledAt));
  }

  @RequiresPermission(PERMISSIONS.CAMPAIGN_WRITE)
  @Post(':id/send')
  send(@Param('id') id: string) {
    return this.svc.send(id);
  }

  @RequiresPermission(PERMISSIONS.CAMPAIGN_WRITE)
  @Post(':id/pause')
  pause(@Param('id') id: string) {
    return this.svc.pause(id);
  }

  @RequiresPermission(PERMISSIONS.CAMPAIGN_READ)
  @Get(':id/recipients')
  recipients(
    @Param('id') id: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.svc.listRecipients(id, cursor, limit ? parseInt(limit, 10) : undefined);
  }

  @Public()
  @Post('track/open/:recipientId')
  trackOpen(@Param('recipientId') recipientId: string) {
    return this.svc.trackOpen(recipientId);
  }

  @Public()
  @Post('track/click/:recipientId')
  trackClick(@Param('recipientId') recipientId: string) {
    return this.svc.trackClick(recipientId);
  }

  @Public()
  @Post('unsubscribe/:recipientId')
  unsubscribe(@Param('recipientId') recipientId: string) {
    return this.svc.unsubscribe(recipientId);
  }

  @RequiresPermission(PERMISSIONS.CAMPAIGN_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
