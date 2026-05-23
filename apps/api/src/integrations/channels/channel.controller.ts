import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ChannelService } from './channel.service';
import { SendMessageDto } from './dto/send-message.dto';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import { Public } from '../../core/auth/jwt.guard';

@ApiTags('channels')
@Controller('channels')
export class ChannelController {
  constructor(private readonly svc: ChannelService) {}

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @RequiresPermission(PERMISSIONS.CHANNEL_SEND)
  @Post('send')
  send(@Body() dto: SendMessageDto) {
    return this.svc.send(dto);
  }

  @ApiBearerAuth()
  @UseGuards(PermissionGuard)
  @RequiresPermission(PERMISSIONS.CHANNEL_READ)
  @Get('messages')
  listMessages(@Query() q: QueryMessagesDto) {
    return this.svc.listMessages(q);
  }

  @Public()
  @Post('twilio/webhook/:configId')
  twilioWebhook(
    @Param('configId') configId: string,
    @Body() payload: any,
    @Headers() headers: any,
  ) {
    return this.svc.processWebhook(configId, payload, headers);
  }

  @Public()
  @Post('twilio/status/:configId')
  twilioStatus(
    @Param('configId') configId: string,
    @Body() payload: any,
  ) {
    return this.svc.updateMessageStatus(configId, payload.MessageSid, payload.MessageStatus);
  }
}
