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
import { PricebookService } from './pricebook.service';
import { CreatePricebookDto } from './dto/create-pricebook.dto';
import { UpdatePricebookDto } from './dto/update-pricebook.dto';
import { SetEntryDto } from './dto/set-entry.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('pricebooks')
@UseGuards(PermissionGuard)
@Controller('pricebooks')
export class PricebookController {
  constructor(private readonly svc: PricebookService) {}

  @RequiresPermission(PERMISSIONS.PRICEBOOK_READ)
  @Get()
  list() {
    return this.svc.list();
  }

  @RequiresPermission(PERMISSIONS.PRICEBOOK_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.PRICEBOOK_WRITE)
  @Post()
  create(@Body() dto: CreatePricebookDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.PRICEBOOK_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePricebookDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.PRICEBOOK_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  // ─── Entries ───

  @RequiresPermission(PERMISSIONS.PRICEBOOK_WRITE)
  @Post(':id/entries')
  setEntry(@Param('id') id: string, @Body() dto: SetEntryDto) {
    return this.svc.setEntry(id, dto);
  }

  @RequiresPermission(PERMISSIONS.PRICEBOOK_WRITE)
  @Delete('entries/:entryId')
  removeEntry(@Param('entryId') entryId: string) {
    return this.svc.removeEntry(entryId);
  }
}
