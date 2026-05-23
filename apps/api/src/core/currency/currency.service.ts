import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TenantContextService } from '../tenant/tenant-context.service';

@Injectable()
export class CurrencyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenant: TenantContextService,
  ) {}

  private requireWs(): string {
    const ws = this.tenant.getStore()?.workspaceId;
    if (!ws) throw new BadRequestException('no tenant context');
    return ws;
  }

  async convert(amount: number, from: string, to: string): Promise<number> {
    if (from === to) return amount;
    const workspaceId = this.requireWs();

    const rateRecord = await this.prisma.currencyRate.findFirst({
      where: { workspaceId, fromCurrency: from, toCurrency: to },
      orderBy: { effectiveDate: 'desc' },
    });

    if (rateRecord) {
      return amount * Number(rateRecord.rate);
    }

    const inverse = await this.prisma.currencyRate.findFirst({
      where: { workspaceId, fromCurrency: to, toCurrency: from },
      orderBy: { effectiveDate: 'desc' },
    });

    if (inverse) {
      return amount / Number(inverse.rate);
    }

    throw new BadRequestException(`No exchange rate found for ${from} → ${to}`);
  }

  async convertToBase(amount: number, currency: string): Promise<number> {
    const workspaceId = this.requireWs();
    const ws = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { primaryCurrency: true },
    });
    return this.convert(amount, currency, ws!.primaryCurrency);
  }

  async getLatestRates() {
    const workspaceId = this.requireWs();
    return this.prisma.currencyRate.findMany({
      where: { workspaceId },
      orderBy: { effectiveDate: 'desc' },
      distinct: ['fromCurrency', 'toCurrency'],
    });
  }

  async updateRate(from: string, to: string, rate: number) {
    const workspaceId = this.requireWs();
    const now = new Date();
    return this.prisma.currencyRate.upsert({
      where: {
        workspaceId_fromCurrency_toCurrency_effectiveDate: {
          workspaceId, fromCurrency: from, toCurrency: to, effectiveDate: now,
        },
      },
      create: { workspaceId, fromCurrency: from, toCurrency: to, rate, effectiveDate: now },
      update: { rate },
    });
  }

  async updateRates(rates: Array<{ from: string; to: string; rate: number }>) {
    return Promise.all(rates.map((r) => this.updateRate(r.from, r.to, r.rate)));
  }
}
