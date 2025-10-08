import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService, ReportFilters } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('loans')
  async getLoanReport(@Query() filters: ReportFilters) {
    return this.reportsService.getLoanReport(filters);
  }

  @Get('payments')
  async getPaymentReport(@Query() filters: ReportFilters) {
    return this.reportsService.getPaymentReport(filters);
  }

  @Get('clients')
  async getClientReport(@Query() filters: ReportFilters) {
    return this.reportsService.getClientReport(filters);
  }

  @Get('vehicles')
  async getVehicleReport(@Query() filters: ReportFilters) {
    return this.reportsService.getVehicleReport(filters);
  }

  // Export endpoints can be added later with libraries like exceljs, pdfkit, etc.
  // @Get('loans/export/:format')
  // async exportLoanReport(@Param('format') format: string, @Query() filters: ReportFilters) {
  //   // Implementation for Excel/PDF/CSV export
  // }
}
