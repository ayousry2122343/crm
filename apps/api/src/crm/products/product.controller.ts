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
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('products')
@UseGuards(PermissionGuard)
@Controller('products')
export class ProductController {
  constructor(private readonly svc: ProductService) {}

  // ─── Categories ───

  @RequiresPermission(PERMISSIONS.PRODUCT_READ)
  @Get('categories')
  listCategories() {
    return this.svc.listCategories();
  }

  @RequiresPermission(PERMISSIONS.PRODUCT_WRITE)
  @Post('categories')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.svc.createCategory(dto);
  }

  // ─── Products ───

  @RequiresPermission(PERMISSIONS.PRODUCT_READ)
  @Get()
  list(@Query() q: QueryProductDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.PRODUCT_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.PRODUCT_WRITE)
  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.PRODUCT_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.PRODUCT_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
