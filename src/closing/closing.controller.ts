import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ClosingService } from "./closing.service";
import { CreateCashRegisterDto, FilterCashRegisterDto, FilterInstallmentsDto } from "./dto";
import { CashRegister, Installment } from "generated/prisma";

@Controller('closing')
export class ClosingController {
    constructor(private readonly closingService: ClosingService) { }

    @Post()
    create(
        @Body() dto: CreateCashRegisterDto
    ): Promise<CashRegister & { payments: Installment[] }> {
        return this.closingService.create(dto)
    }

    @Get()
    findAll(
        @Query() filter: FilterCashRegisterDto
    ): Promise<(CashRegister & { payments: Installment[] })[]> {
        return this.closingService.findAll(filter)
    }

    @Get(':id')
    findOne(
        @Param('id') id: string
    ): Promise<CashRegister & {
        payments: (Installment & {
            loan: {
                user: { id: string; name: string }
                motorcycle: { id: string; plate: string }
            }
        })[]
    }> {
        return this.closingService.findOne(id)
    }

    @Get('available-payments')
    getUnassignedPayments(
        @Query() filter: FilterInstallmentsDto
    ): ReturnType<ClosingService['getUnassignedPayments']> {
        return this.closingService.getUnassignedPayments(filter)
    }
}