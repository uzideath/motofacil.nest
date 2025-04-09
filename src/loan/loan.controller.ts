import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { LoanService } from './loan.service';
import { CreateLoanDto, UpdateLoanDto } from './loan.dto';


@Controller('loans')
export class LoanController {
    constructor(private readonly loanService: LoanService) { }

    @Post()
    create(@Body() dto: CreateLoanDto) {
        return this.loanService.create(dto);
    }

    @Get()
    findAll() {
        return this.loanService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.loanService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() dto: UpdateLoanDto) {
        return this.loanService.update(id, dto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.loanService.remove(id);
    }
}
