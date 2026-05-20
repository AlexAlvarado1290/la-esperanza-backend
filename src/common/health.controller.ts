import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Public } from './decorators/public.decorator';

@ApiExcludeController()
@Public()
@Controller('health')
export class HealthController {
  @Public()
  @Get()
  health() {
    return { status: 'ok', uptime: process.uptime(), now: new Date().toISOString() };
  }
}
