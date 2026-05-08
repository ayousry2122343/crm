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
import { BlogService } from './blog.service';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { QueryBlogDto } from './dto/query-blog.dto';
import { CreateBlogCategoryDto } from './dto/create-blog-category.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('blogs')
@UseGuards(PermissionGuard)
@Controller('blogs')
export class BlogController {
  constructor(private readonly svc: BlogService) {}

  // ─── Categories ───

  @RequiresPermission(PERMISSIONS.BLOG_READ)
  @Get('categories')
  listCategories() {
    return this.svc.listCategories();
  }

  @RequiresPermission(PERMISSIONS.BLOG_WRITE)
  @Post('categories')
  createCategory(@Body() dto: CreateBlogCategoryDto) {
    return this.svc.createCategory(dto);
  }

  // ─── Blogs ───

  @RequiresPermission(PERMISSIONS.BLOG_READ)
  @Get()
  list(@Query() q: QueryBlogDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.BLOG_READ)
  @Get('slug/:slug')
  getBySlug(@Param('slug') slug: string) {
    return this.svc.getBySlug(slug);
  }

  @RequiresPermission(PERMISSIONS.BLOG_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.BLOG_READ)
  @Get(':id/render')
  async render(@Param('id') id: string) {
    const blog = await this.svc.get(id);
    return { ...blog, bodyHtml: this.svc.renderMarkdown(blog.body) };
  }

  @RequiresPermission(PERMISSIONS.BLOG_WRITE)
  @Post()
  create(@Body() dto: CreateBlogDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.BLOG_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBlogDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.BLOG_WRITE)
  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.svc.publish(id);
  }

  @RequiresPermission(PERMISSIONS.BLOG_WRITE)
  @Post(':id/unpublish')
  unpublish(@Param('id') id: string) {
    return this.svc.unpublish(id);
  }

  @RequiresPermission(PERMISSIONS.BLOG_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
