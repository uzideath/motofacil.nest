import { Body, Controller, Get, Param, Post, Put, Delete } from '@nestjs/common';
import { CreateExpenseDto } from './dto';
import { ExpenseService } from './expense.service';


@Controller('expense')
export class ExpenseController {
  constructor(private readonly service: ExpenseService) { }

  @Post()
  create(@Body() dto: CreateExpenseDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() dto: CreateExpenseDto) {
    return this.service.update(id, dto);
  }

  @Get('cash-register/:id')
  findByCashRegister(@Param('id') id: string) {
    return this.service.findByCashRegisterId(id);
  }


  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }

}
