import { Body, Controller, Get, Param, Post, Query, Res, HttpException, HttpStatus } from '@nestjs/common';
import { ClosingService } from './closing.service';
import {
  CreateCashRegisterDto,
  FilterCashRegisterDto,
  FilterInstallmentsDto,
  GetResumenDto,
  FindOneCashRegisterResponseDto,
  PrintClosingDto,
} from './dto';
import {
  CashRegister,
  Installment,
  Expense,
  PaymentMethod,
  ExpenseCategory,
} from 'generated/prisma';
import { Response } from 'express';
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';

@Controller('closing')
export class ClosingController {
  constructor(private readonly closingService: ClosingService) { }

  @Post()
  @LogAction(ActionType.CREATE, 'Closing')
  create(
    @Body() dto: CreateCashRegisterDto,
  ): Promise<CashRegister & { payments: Installment[] }> {
    return this.closingService.create(dto);
  }

  @Get()
  @LogAction(ActionType.QUERY, 'Closing')
  findAll(
    @Query() filter: FilterCashRegisterDto,
  ): Promise<(
    CashRegister & {
      payments: Installment[];
      expense: Expense[];
      createdBy: { id: string; username: string } | null;
    }
  )[]> {
    return this.closingService.findAll(filter);
  }

  @Get('search/:id')
  @LogAction(ActionType.QUERY, 'Closing')
  findOne(@Param('id') id: string): Promise<FindOneCashRegisterResponseDto> {
    return this.closingService.findOne(id);
  }

  @Get('available-payments')
  @LogAction(ActionType.QUERY, 'Closing', 'Get unassigned payments')
  getUnassignedPayments(
    @Query() filter: FilterInstallmentsDto,
  ): ReturnType<ClosingService['getUnassignedPayments']> {
    return this.closingService.getUnassignedPayments(filter);
  }

  @Get('summary')
  @LogAction(ActionType.QUERY, 'Closing', 'Get closing summary')
  getResumen(@Query() query: GetResumenDto): ReturnType<ClosingService['summary']> {
    return this.closingService.summary(query);
  }

  @Get('print/:id')
  @LogAction(ActionType.EXPORT, 'Closing', 'Print closing PDF')
  async printClosing(@Param('id') id: string, @Res() res: Response) {
    try {
      const pdfBuffer = await this.closingService.printClosing(id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename=closing-${id}.pdf`);
      
      return res.send(pdfBuffer);
    } catch (err) {
      console.error(err);
      throw new HttpException('No se pudo generar el PDF del cierre.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
