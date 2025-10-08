import { Controller, Get, Query, UseGuards, Param, Res, StreamableFile } from '@nestjs/common';
import { ReportsService, ReportFilters } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { Response } from 'express';
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('loans')
  @LogAction(ActionType.QUERY, 'Report', 'Loan report')
  async getLoanReport(@Query() filters: ReportFilters) {
    return this.reportsService.getLoanReport(filters);
  }

  @Get('payments')
  @LogAction(ActionType.QUERY, 'Report', 'Payment report')
  async getPaymentReport(@Query() filters: ReportFilters) {
    return this.reportsService.getPaymentReport(filters);
  }

  @Get('clients')
  @LogAction(ActionType.QUERY, 'Report', 'Client report')
  async getClientReport(@Query() filters: ReportFilters) {
    return this.reportsService.getClientReport(filters);
  }

  @Get('vehicles')
  @LogAction(ActionType.QUERY, 'Report', 'Vehicle report')
  async getVehicleReport(@Query() filters: ReportFilters) {
    return this.reportsService.getVehicleReport(filters);
  }

  // Export endpoints
  @Get('export/:type/:format')
  @LogAction(ActionType.EXPORT, 'Report')
  async exportReport(
    @Param('type') type: string,
    @Param('format') format: string,
    @Query() filters: ReportFilters,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.reportsService.exportReport(type, format, filters);
    
    res.set({
      'Content-Type': result.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    
    return new StreamableFile(result.buffer);
  }
}
