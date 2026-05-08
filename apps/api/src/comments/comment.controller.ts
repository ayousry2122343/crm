import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentBodyDto } from './dto/update-comment.dto';
import { QueryCommentDto } from './dto/query-comment.dto';
import { PermissionGuard } from '../core/rbac/permission.guard';
import { RequiresPermission } from '../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('comments')
@UseGuards(PermissionGuard)
@Controller('comments')
export class CommentController {
  constructor(private readonly svc: CommentService) {}

  @RequiresPermission(PERMISSIONS.COMMENT_WRITE)
  @Post()
  create(@Body() dto: CreateCommentDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.COMMENT_READ)
  @Get(':entityType/:entityId')
  list(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Query() q: QueryCommentDto,
  ) {
    return this.svc.list(entityType, entityId, q);
  }

  @RequiresPermission(PERMISSIONS.COMMENT_WRITE)
  @Put(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCommentBodyDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.COMMENT_WRITE)
  @Patch(':id/pin')
  pin(@Param('id') id: string) {
    return this.svc.pin(id, true);
  }

  @RequiresPermission(PERMISSIONS.COMMENT_WRITE)
  @Patch(':id/unpin')
  unpin(@Param('id') id: string) {
    return this.svc.pin(id, false);
  }

  @RequiresPermission(PERMISSIONS.COMMENT_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  @RequiresPermission(PERMISSIONS.COMMENT_READ)
  @Post(':entityType/:entityId/follow')
  follow(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.svc.follow(entityType, entityId);
  }

  @RequiresPermission(PERMISSIONS.COMMENT_READ)
  @Delete(':entityType/:entityId/follow')
  unfollow(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.svc.unfollow(entityType, entityId);
  }

  @RequiresPermission(PERMISSIONS.COMMENT_READ)
  @Get(':entityType/:entityId/followers')
  listFollowers(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.svc.listFollowers(entityType, entityId);
  }
}
