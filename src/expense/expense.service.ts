import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from 'src/prisma.service'
import { CreateExpenseDto } from './dto'

@Injectable()
export class ExpenseService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateExpenseDto) {
        return this.prisma.expense.create({
            data: {
                amount: dto.amount,
                date: new Date(dto.date),
                category: dto.category,
                paymentMethod: dto.paymentMethod,
                beneficiary: dto.beneficiary,
                reference: dto.reference,
                description: dto.description,
                attachments: dto.attachments ?? [],
                cashRegisterId: dto.cashRegisterId ?? null,
            },
        })
    }

    async findAll() {
        return this.prisma.expense.findMany({
            orderBy: { date: 'desc' },
            include: { cashRegister: true },
        })
    }

    async findByCashRegisterId(cashRegisterId: string) {
        return this.prisma.expense.findMany({
            where: { cashRegisterId },
            orderBy: { date: 'desc' },
        })
    }

    async delete(id: string) {
        const exists = await this.prisma.expense.findUnique({ where: { id } })
        if (!exists) throw new NotFoundException('Expense not found')

        return this.prisma.expense.delete({ where: { id } })
    }
}
