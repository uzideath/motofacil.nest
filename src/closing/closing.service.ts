import { Injectable, NotFoundException } from "@nestjs/common";
import { CashRegister, Installment, Loan, Motorcycle, Prisma, User } from "generated/prisma";
import { PrismaService } from "src/prisma.service";
import { CreateCashRegisterDto, FilterCashRegisterDto, FilterInstallmentsDto } from "./dto";

@Injectable()
export class ClosingService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: CreateCashRegisterDto): Promise<CashRegister & { payments: Installment[] }> {
        const { cashInRegister, cashFromTransfers, cashFromCards, notes, installmentIds } = dto

        const installments = await this.prisma.installment.findMany({
            where: { id: { in: installmentIds } },
        })

        if (installments.length !== installmentIds.length) {
            throw new NotFoundException('Algunos pagos no fueron encontrados')
        }

        const cashRegister = await this.prisma.cashRegister.create({
            data: {
                cashInRegister,
                cashFromTransfers,
                cashFromCards,
                notes,
                payments: {
                    connect: installmentIds.map(id => ({ id })),
                },
            },
            include: { payments: true },
        })

        return cashRegister
    }

    async findAll(filter: FilterCashRegisterDto): Promise<(CashRegister & { payments: Installment[] })[]> {
        let dateRange: { gte: Date; lte: Date } | undefined

        if (filter.date) {
            const start = new Date(filter.date)
            start.setHours(0, 0, 0, 0)
            const end = new Date(filter.date)
            end.setHours(23, 59, 59, 999)
            dateRange = { gte: start, lte: end }
        }

        return this.prisma.cashRegister.findMany({
            where: {
                ...(dateRange && { date: dateRange }),
            },
            include: {
                payments: true,
            },
            orderBy: { date: 'desc' },
        })
    }

    async findOne(id: string): Promise<CashRegister & {
        payments: (Installment & {
            loan: {
                user: { id: string; name: string }
                motorcycle: { id: string; plate: string }
            }
        })[]
    }> {
        const cierre = await this.prisma.cashRegister.findUnique({
            where: { id },
            include: {
                payments: {
                    include: {
                        loan: {
                            include: {
                                user: { select: { id: true, name: true } },
                                motorcycle: { select: { id: true, plate: true } },
                            },
                        },
                    },
                },
            },
        })

        if (!cierre) {
            throw new NotFoundException('Cierre no encontrado')
        }

        return cierre
    }
    
    async getUnassignedPayments(
        filter: FilterInstallmentsDto
    ): Promise<(Installment & {
        loan: Loan & {
            user: Pick<User, 'id' | 'name'>
            motorcycle: Pick<Motorcycle, 'id' | 'plate'>
        }
    })[]> {
        const where: Prisma.InstallmentWhereInput = {
            cashRegisterId: null,
        }

        if (filter.paymentMethod) {
            where.paymentMethod = filter.paymentMethod
        }

        if (filter.startDate || filter.endDate) {
            where.paymentDate = {}
            if (filter.startDate) {
                where.paymentDate.gte = new Date(filter.startDate)
            }
            if (filter.endDate) {
                where.paymentDate.lte = new Date(filter.endDate)
            }
        }

        return this.prisma.installment.findMany({
            where,
            include: {
                loan: {
                    include: {
                        user: { select: { id: true, name: true } },
                        motorcycle: { select: { id: true, plate: true } },
                    },
                },
            },
            orderBy: { paymentDate: 'asc' },
        })
    }
}