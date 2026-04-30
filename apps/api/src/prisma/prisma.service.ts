import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    this.logger.log('connecting to database');
    await this.$connect();
  }

  async onModuleDestroy() {
    this.logger.log('disconnecting from database');
    await this.$disconnect();
  }
}
