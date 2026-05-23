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
import { KBService } from './kb.service';
import { CreateKBCategoryDto } from './dto/create-category.dto';
import { CreateKBArticleDto } from './dto/create-article.dto';
import { UpdateKBArticleDto } from './dto/update-article.dto';
import { QueryKBArticleDto } from './dto/query-article.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('kb')
@UseGuards(PermissionGuard)
@Controller('kb')
export class KBController {
  constructor(private readonly svc: KBService) {}

  // ── Categories ──

  @RequiresPermission(PERMISSIONS.KB_READ)
  @Get('categories')
  listCategories() {
    return this.svc.listCategories();
  }

  @RequiresPermission(PERMISSIONS.KB_WRITE)
  @Post('categories')
  createCategory(@Body() dto: CreateKBCategoryDto) {
    return this.svc.createCategory(dto);
  }

  @RequiresPermission(PERMISSIONS.KB_WRITE)
  @Patch('categories/:id')
  updateCategory(@Param('id') id: string, @Body() dto: Partial<CreateKBCategoryDto>) {
    return this.svc.updateCategory(id, dto);
  }

  @RequiresPermission(PERMISSIONS.KB_DELETE)
  @Delete('categories/:id')
  archiveCategory(@Param('id') id: string) {
    return this.svc.archiveCategory(id);
  }

  // ── Articles ──

  @RequiresPermission(PERMISSIONS.KB_READ)
  @Get('articles')
  listArticles(@Query() q: QueryKBArticleDto) {
    return this.svc.listArticles(q);
  }

  @RequiresPermission(PERMISSIONS.KB_READ)
  @Get('articles/:id')
  getArticle(@Param('id') id: string) {
    return this.svc.getArticle(id);
  }

  @RequiresPermission(PERMISSIONS.KB_WRITE)
  @Post('articles')
  createArticle(@Body() dto: CreateKBArticleDto) {
    return this.svc.createArticle(dto);
  }

  @RequiresPermission(PERMISSIONS.KB_WRITE)
  @Patch('articles/:id')
  updateArticle(@Param('id') id: string, @Body() dto: UpdateKBArticleDto) {
    return this.svc.updateArticle(id, dto);
  }

  @RequiresPermission(PERMISSIONS.KB_DELETE)
  @Delete('articles/:id')
  archiveArticle(@Param('id') id: string) {
    return this.svc.archiveArticle(id);
  }

  @RequiresPermission(PERMISSIONS.KB_WRITE)
  @Post('articles/:id/feedback')
  feedback(@Param('id') id: string, @Body('helpful') helpful: boolean) {
    return this.svc.feedback(id, helpful);
  }
}
