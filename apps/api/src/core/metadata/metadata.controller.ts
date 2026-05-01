import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { MetadataService } from './metadata.service';

@ApiBearerAuth()
@ApiTags('metadata')
@Controller('metadata')
export class MetadataController {
  constructor(private readonly meta: MetadataService) {}

  @Get()
  list() {
    return this.meta.listEntities();
  }

  @Get(':entityType')
  get(@Param('entityType') entityType: string) {
    return this.meta.getEntity(entityType);
  }
}
