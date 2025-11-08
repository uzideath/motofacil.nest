import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
} from '@nestjs/common';
import { LoanService } from './loan.service';
import { CreateLoanDto, UpdateLoanDto, UpdateLoanDatesDto } from './loan.dto';
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';

@Controller('loans')
export class LoanController {
  constructor(private readonly loanService: LoanService) { }

  @Post()
  @LogAction(ActionType.CREATE, 'Loan')
  create(@Body() dto: CreateLoanDto) {
    return this.loanService.create(dto);
  }

  @Get()
  @LogAction(ActionType.QUERY, 'Loan')
  findAll() {
    return this.loanService.findAll();
  }

  @Get('with-status')
  @LogAction(ActionType.QUERY, 'Loan', 'Query loans with status')
  findAllWithStatus() {
    return this.loanService.findAllWithStatus();
  }

  @Get(':id')
  @LogAction(ActionType.QUERY, 'Loan')
  findOne(@Param('id') id: string) {
    return this.loanService.findOne(id);
  }

  @Get(':id/status')
  @LogAction(ActionType.QUERY, 'Loan', 'Get loan status')
  getLoanStatus(@Param('id') id: string) {
    return this.loanService.getLoanStatus(id);
  }

  @Patch(':id')
  @LogAction(ActionType.UPDATE, 'Loan')
  update(@Param('id') id: string, @Body() dto: UpdateLoanDto) {
    return this.loanService.update(id, dto);
  }

  @Put(':id/recalculate')
  @LogAction(ActionType.CUSTOM, 'Loan', 'Recalculate installments')
  async recalculateInstallments(@Param('id') id: string) {
    return this.loanService.recalculateInstallments(id);
  }

  @Put(':id/dates')
  @LogAction(ActionType.UPDATE, 'Loan', 'Update loan dates')
  async updateLoanDates(
    @Param('id') id: string,
    @Body() body: UpdateLoanDatesDto
  ) {
    return this.loanService.updateLoanDates(id, body.startDate, body.endDate);
  }

  @Post(':id/archive')
  @LogAction(ActionType.ARCHIVE, 'Loan')
  async archiveLoan(@Param('id') id: string): Promise<{ ok: boolean }> {
    await this.loanService.archive(id);
    return { ok: true };
  }


  @Post(':id/unarchive')
  @LogAction(ActionType.RESTORE, 'Loan')
  async unarchiveLoan(@Param('id') id: string): Promise<{ ok: boolean }> {
    await this.loanService.unarchive(id);
    return { ok: true };
  }

  @Delete(':id')
  @LogAction(ActionType.DELETE, 'Loan')
  remove(@Param('id') id: string) {
    return this.loanService.remove(id);
  }
}
