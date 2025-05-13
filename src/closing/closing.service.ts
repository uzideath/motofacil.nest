import { Injectable, NotFoundException } from "@nestjs/common";
import { CashRegister, Expense, Installment, Loan, Motorcycle, Prisma, User } from "generated/prisma";
import { PrismaService } from "src/prisma.service";
import { CreateCashRegisterDto, FilterCashRegisterDto, FilterInstallmentsDto, GetResumenDto } from "./dto";
import { startOfDay, endOfDay, subDays } from "date-fns";
import { ResumenResponse } from "./types";

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
                expense: true
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
    ): Promise<{
        installments: (Installment & {
            loan: Loan & {
                user: Pick<User, 'id' | 'name'>
                motorcycle: Pick<Motorcycle, 'id' | 'plate'>
            }
        })[],
        expenses: Expense[]
    }> {
        const whereInstallments: Prisma.InstallmentWhereInput = {
            cashRegisterId: null,
        }

        if (filter.paymentMethod) {
            whereInstallments.paymentMethod = filter.paymentMethod
        }

        if (filter.startDate || filter.endDate) {
            whereInstallments.paymentDate = {}
            if (filter.startDate) {
                whereInstallments.paymentDate.gte = new Date(filter.startDate)
            }
            if (filter.endDate) {
                whereInstallments.paymentDate.lte = new Date(filter.endDate)
            }
        }

        const installments = await this.prisma.installment.findMany({
            where: whereInstallments,
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

        const whereExpenses: Prisma.ExpenseWhereInput = {
            cashRegisterId: null,
        }

        if (filter.startDate || filter.endDate) {
            whereExpenses.date = {}
            if (filter.startDate) {
                whereExpenses.date.gte = new Date(filter.startDate)
            }
            if (filter.endDate) {
                whereExpenses.date.lte = new Date(filter.endDate)
            }
        }

        const expenses = await this.prisma.expense.findMany({
            where: whereExpenses,
            orderBy: { date: 'asc' },
        })

        return { installments, expenses }
    }


    async summary(dto: GetResumenDto): Promise<ResumenResponse> {
        const baseDate = dto.date ? new Date(dto.date) : new Date()

        const todayStart = startOfDay(baseDate)
        const todayEnd = endOfDay(baseDate)

        const yesterdayStart = startOfDay(subDays(baseDate, 1))
        const yesterdayEnd = endOfDay(subDays(baseDate, 1))

        const [todayInstallments, yesterdayInstallments] = await Promise.all([
            this.prisma.installment.findMany({
                where: { paymentDate: { gte: todayStart, lte: todayEnd } }
            }),
            this.prisma.installment.findMany({
                where: { paymentDate: { gte: yesterdayStart, lte: yesterdayEnd } }
            })
        ])

        const sum = (arr: typeof todayInstallments) =>
            arr.reduce((acc, i) => acc + i.amount, 0)

        const totalIncome = sum(todayInstallments)
        const totalExpenses = 0 // podrías sumar aquí gastos si los tienes
        const balance = totalIncome - totalExpenses

        const sumByMethod = (method: string) =>
            todayInstallments
                .filter(i => i.paymentMethod === method)
                .reduce((acc, i) => acc + i.amount, 0)

        const paymentMethods = {
            cash: sumByMethod('CASH'),
            transfer: sumByMethod('TRANSACTION'),
            card: sumByMethod('CARD'),
            other: 0
        }

        const categories = {
            loanPayments: totalIncome, // en el futuro puedes dividir esto si agregas campo de categoría
            otherIncome: 0
        }

        const previousTotal = sum(yesterdayInstallments)
        const previousDayComparison = previousTotal > 0
            ? Math.round(((totalIncome - previousTotal) / previousTotal) * 100)
            : 100

        return {
            totalIncome,
            totalExpenses,
            balance,
            paymentMethods,
            categories,
            previousDayComparison
        }
    }
}