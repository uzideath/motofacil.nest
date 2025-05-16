import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateExpenseDto, FindExpenseFiltersDto } from './dto';
import { toColombiaEndOfDayUtc, toColombiaMidnightUtc } from 'src/lib/dates';
import { Prisma } from 'generated/prisma';



@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateExpenseDto) {
    return this.prisma.expense.create({
      data: {
        amount: dto.amount,
        date: toColombiaMidnightUtc(dto.date),
        category: dto.category,
        paymentMethod: dto.paymentMethod,
        beneficiary: dto.beneficiary,
        reference: dto.reference,
        description: dto.description,
        attachments: dto.attachments ?? [],
        cashRegisterId: dto.cashRegisterId ?? null,
        createdById: dto.createdById,
      },
    });
  }


  async findAll(filters: FindExpenseFiltersDto): Promise<Expense[]> {
    const { startDate, endDate } = filters;
    const where: Prisma.ExpenseWhereInput = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = toColombiaMidnightUtc(startDate);
      if (endDate) where.date.lte = toColombiaEndOfDayUtc(endDate);
    }

    return this.prisma.expense.findMany({
      where,
      orderBy: { date: 'desc' },
      include: {
        cashRegister: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
    });
  }
  async findByCashRegisterId(cashRegisterId: string) {
    return this.prisma.expense.findMany({
      where: { cashRegisterId },
      orderBy: { date: 'desc' },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });
  }


  async update(id: string, dto: CreateExpenseDto) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });
    if (!expense) throw new NotFoundException('Expense not found');

    if (expense.cashRegisterId) {
      throw new Error('Cannot update an expense that is already associated with a cash register');
    }

    return this.prisma.expense.update({
      where: { id },
      data: {
        amount: dto.amount,
        date: toColombiaMidnightUtc(dto.date),
        category: dto.category,
        paymentMethod: dto.paymentMethod,
        beneficiary: dto.beneficiary,
        reference: dto.reference,
        description: dto.description,
        attachments: dto.attachments ?? [],
        cashRegisterId: dto.cashRegisterId ?? null,
      },
    });
  }


  async delete(id: string) {
    const expense = await this.prisma.expense.findUnique({ where: { id } });

    if (!expense) {
      throw new NotFoundException('Expense not found');
    }

    if (expense.cashRegisterId) {
      throw new ForbiddenException(
        'No se puede eliminar un gasto que ya está asociado a un cierre de caja.'
      );
    }

    return this.prisma.expense.delete({ where: { id } });
  }

}
