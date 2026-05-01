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
import { PersonService } from './person.service';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { QueryPersonDto } from './dto/query-person.dto';
import { MergePeopleDto } from './dto/merge-people.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('people')
@UseGuards(PermissionGuard)
@Controller('people')
export class PersonController {
  constructor(private readonly svc: PersonService) {}

  @RequiresPermission(PERMISSIONS.PERSON_READ)
  @Get()
  list(@Query() q: QueryPersonDto) {
    return this.svc.list(q);
  }

  @RequiresPermission(PERMISSIONS.PERSON_READ)
  @Get('duplicates')
  duplicates(@Query('email') email?: string, @Query('phone') phone?: string) {
    return this.svc.findDuplicates(email, phone);
  }

  @RequiresPermission(PERMISSIONS.PERSON_WRITE)
  @Post('merge')
  merge(@Body() dto: MergePeopleDto) {
    return this.svc.merge(dto);
  }

  @RequiresPermission(PERMISSIONS.PERSON_READ)
  @Get(':id')
  get(@Param('id') id: string) {
    return this.svc.get(id);
  }

  @RequiresPermission(PERMISSIONS.PERSON_WRITE)
  @Post()
  create(@Body() dto: CreatePersonDto) {
    return this.svc.create(dto);
  }

  @RequiresPermission(PERMISSIONS.PERSON_WRITE)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdatePersonDto) {
    return this.svc.update(id, dto);
  }

  @RequiresPermission(PERMISSIONS.PERSON_DELETE)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }
}
