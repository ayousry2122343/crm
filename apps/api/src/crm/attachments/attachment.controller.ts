import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { AttachmentService } from './attachment.service';
import { QueryAttachmentDto } from './dto/query-attachment.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';
import type { AttachmentEntityType } from '@prisma/client';

@ApiBearerAuth()
@ApiTags('attachments')
@UseGuards(PermissionGuard)
@Controller('attachments')
export class AttachmentController {
  constructor(private readonly svc: AttachmentService) {}

  @RequiresPermission(PERMISSIONS.ATTACHMENT_WRITE)
  @Post(':entityType/:entityId')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  upload(
    @Param('entityType') entityType: AttachmentEntityType,
    @Param('entityId') entityId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.svc.upload(entityType, entityId, file);
  }

  @RequiresPermission(PERMISSIONS.ATTACHMENT_READ)
  @Get(':entityType/:entityId')
  list(
    @Param('entityType') entityType: AttachmentEntityType,
    @Param('entityId') entityId: string,
    @Query() q: QueryAttachmentDto,
  ) {
    return this.svc.list(entityType, entityId, q);
  }

  @RequiresPermission(PERMISSIONS.ATTACHMENT_READ)
  @Get('file/:id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.ATTACHMENT_READ)
  @Get('file/:id/download')
  async download(@Param('id') id: string) {
    const url = await this.svc.download(id);
    return { url };
  }

  @RequiresPermission(PERMISSIONS.ATTACHMENT_DELETE)
  @Delete('file/:id')
  delete(@Param('id') id: string) {
    return this.svc.delete(id);
  }
}
