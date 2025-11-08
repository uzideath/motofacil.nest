import { Body, Controller, Get, Param, Post, Put, Delete, Query } from '@nestjs/common';
import { CreateExpenseDto, FindExpenseFiltersDto } from './dto';
import { ExpenseService } from './expense.service';
import { LogAction, ActionType } from '../lib/decorators/log-action.decorator';


@Controller('expense')
export class ExpenseController {
  constructor(private readonly service: ExpenseService) { }

  @Post()
  @LogAction(ActionType.CREATE, 'Expense')
  create(@Body() dto: CreateExpenseDto) {
    return this.service.create(dto);
  }

  @Get()
  @LogAction(ActionType.QUERY, 'Expense')
  findAll(@Query() filters: FindExpenseFiltersDto) {
    return this.service.findAll(filters);
  }


  @Put(':id')
  @LogAction(ActionType.UPDATE, 'Expense')
  update(@Param('id') id: string, @Body() dto: CreateExpenseDto) {
    return this.service.update(id, dto);
  }

  @Get('cash-register/:id')
  @LogAction(ActionType.QUERY, 'Expense', 'Find by cash register')
  findByCashRegister(@Param('id') id: string) {
    return this.service.findByCashRegisterId(id);
  }


  @Delete(':id')
  @LogAction(ActionType.DELETE, 'Expense')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

}
