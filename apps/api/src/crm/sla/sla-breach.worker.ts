import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { SLAService } from './sla.service';

@Injectable()
export class SLABreachWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SLABreachWorker.name);
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly slaService: SLAService) {}

  onModuleInit() {
    const intervalMs = parseInt(process.env.SLA_CHECK_INTERVAL_MS ?? '60000', 10);
    this.intervalId = setInterval(() => void this.tick(), intervalMs);
    this.logger.log(`SLA breach checker started (interval=${intervalMs}ms)`);
  }

  onModuleDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }

  async tick() {
    try {
      await this.slaService.checkBreaches();
    } catch (err) {
      this.logger.error(`SLA breach check failed: ${err}`);
    }
  }
}
