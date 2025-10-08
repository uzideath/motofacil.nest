import { Controller, Get, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) { }

  @Get()
  getDashboardData(@Query('dateRange') dateRange?: string) {
    return this.service.getDashboardData(dateRange);
  }
}
