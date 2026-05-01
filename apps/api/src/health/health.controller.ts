import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../core/auth/jwt.guard';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health(): { status: string; uptime: number; timestamp: string } {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
