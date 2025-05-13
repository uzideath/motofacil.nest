import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { CreateExpenseDto } from './dto';

@Controller('expense')
export class ExpenseController {
    constructor(private readonly service: ExpenseService) { }

    @Post()
    create(@Body() dto: CreateExpenseDto) {
        return this.service.create(dto)
    }

    @Get()
    findAll() {
        return this.service.findAll()
    }

    @Get('cash-register/:id')
    findByCashRegister(@Param('id') id: string) {
        return this.service.findByCashRegisterId(id)
    }
}
