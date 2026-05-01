import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SearchService } from './search.service';

@ApiBearerAuth()
@ApiTags('search')
@Controller('search')
export class SearchController {
  constructor(private readonly svc: SearchService) {}

  @Get()
  search(
    @Query('q') q: string,
    @Query('types') types?: string,
    @Query('limit') limit?: string,
  ) {
    const typeList = types
      ? types.split(',').map((s) => s.trim()).filter(Boolean)
      : undefined;
    const cap = limit ? Number.parseInt(limit, 10) : 10;
    return this.svc.search(q ?? '', typeList, Number.isFinite(cap) ? cap : 10);
  }
}
