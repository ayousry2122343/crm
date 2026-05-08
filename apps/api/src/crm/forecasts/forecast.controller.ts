import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ForecastService } from './forecast.service';
import { GenerateForecastDto } from './dto/generate-forecast.dto';
import { UpdateForecastEntryDto } from './dto/update-forecast-entry.dto';
import { PermissionGuard } from '../../core/rbac/permission.guard';
import { RequiresPermission } from '../../core/rbac/requires-permission.decorator';
import { PERMISSIONS } from '../../core/rbac/permissions.constants';

@ApiBearerAuth()
@ApiTags('forecasts')
@UseGuards(PermissionGuard)
@Controller('forecasts')
export class ForecastController {
  constructor(private readonly svc: ForecastService) {}

  @RequiresPermission(PERMISSIONS.FORECAST_READ)
  @Get(':periodType/:date')
  getByPeriod(
    @Param('periodType') periodType: string,
    @Param('date') date: string,
    @Query('pipelineId') pipelineId?: string,
  ) {
    return this.svc.getByPeriod(periodType, date).catch(() =>
      this.svc.generateForecast({ periodType, date, pipelineId }),
    );
  }

  @RequiresPermission(PERMISSIONS.FORECAST_WRITE)
  @Post('generate')
  generate(@Body() dto: GenerateForecastDto) {
    return this.svc.generateForecast(dto);
  }

  @RequiresPermission(PERMISSIONS.FORECAST_WRITE)
  @Put('entry/:id')
  updateEntry(
    @Param('id') id: string,
    @Body() dto: UpdateForecastEntryDto,
  ) {
    return this.svc.updateEntry(id, dto);
  }

  @RequiresPermission(PERMISSIONS.FORECAST_WRITE)
  @Post(':periodId/snapshot')
  takeSnapshot(@Param('periodId') periodId: string) {
    return this.svc.takeSnapshot(periodId);
  }

  @RequiresPermission(PERMISSIONS.FORECAST_READ)
  @Get(':periodId/snapshots')
  getSnapshots(@Param('periodId') periodId: string) {
    return this.svc.getSnapshots(periodId);
  }
}
