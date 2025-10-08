import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { CashFlowReportService } from '../services/report.service';
import { CashFlowStatementDto, ForecastDto } from '../dto/report.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '../../../generated/prisma';

@Controller('cash-flow/reports')
@UseGuards()
export class CashFlowReportController {
  constructor(private readonly reportService: CashFlowReportService) {}

  @Post('cash-flow-statement')
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  generateCashFlowStatement(@Body() dto: CashFlowStatementDto) {
    return this.reportService.generateCashFlowStatement(dto);
  }

  @Post('forecast')
  @Roles(Role.ADMIN, Role.MODERATOR, Role.USER)
  generateForecast(@Body() dto: ForecastDto) {
    return this.reportService.generateForecast(dto);
  }
}
