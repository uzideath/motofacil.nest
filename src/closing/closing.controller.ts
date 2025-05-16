import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ClosingService } from './closing.service';
import {
  CreateCashRegisterDto,
  FilterCashRegisterDto,
  FilterInstallmentsDto,
  GetResumenDto,
  FindOneCashRegisterResponseDto,
} from './dto';
import {
  CashRegister,
  Installment,
  Expense,
  PaymentMethod,
  ExpenseCategory,
} from 'generated/prisma';

@Controller('closing')
export class ClosingController {
  constructor(private readonly closingService: ClosingService) { }

  @Post()
  create(
    @Body() dto: CreateCashRegisterDto,
  ): Promise<CashRegister & { payments: Installment[] }> {
    return this.closingService.create(dto);
  }

  @Get()
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
  findOne(@Param('id') id: string): Promise<FindOneCashRegisterResponseDto> {
    return this.closingService.findOne(id);
  }

  @Get('available-payments')
  getUnassignedPayments(
    @Query() filter: FilterInstallmentsDto,
  ): ReturnType<ClosingService['getUnassignedPayments']> {
    return this.closingService.getUnassignedPayments(filter);
  }

  @Get('summary')
  getResumen(@Query() query: GetResumenDto): ReturnType<ClosingService['summary']> {
    return this.closingService.summary(query);
  }
}
