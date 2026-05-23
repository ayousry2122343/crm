import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PermissionGuard } from '../rbac/permission.guard';
import { RequiresPermission } from '../rbac/requires-permission.decorator';
import { PERMISSIONS } from '../rbac/permissions.constants';
import { CurrencyService } from './currency.service';
import { SUPPORTED_CURRENCIES } from './currency-seed';

@ApiBearerAuth()
@ApiTags('currency')
@UseGuards(PermissionGuard)
@Controller('currency')
export class CurrencyController {
  constructor(private readonly svc: CurrencyService) {}

  @RequiresPermission(PERMISSIONS.WORKSPACE_ADMIN)
  @Get('rates')
  getRates() {
    return this.svc.getLatestRates();
  }

  @RequiresPermission(PERMISSIONS.WORKSPACE_ADMIN)
  @Post('rates')
  updateRates(@Body() body: { rates: Array<{ from: string; to: string; rate: number }> }) {
    return this.svc.updateRates(body.rates);
  }

  @Post('convert')
  convert(@Body() body: { amount: number; from: string; to: string }) {
    return this.svc.convert(body.amount, body.from, body.to);
  }

  @Get('supported')
  getSupportedCurrencies() {
    return SUPPORTED_CURRENCIES;
  }
}
