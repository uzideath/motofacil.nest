// src/loan/loan.service.ts

import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import {
  CreateLoanDto,
  InterestType,
  PaymentFrequency,
  UpdateLoanDto,
} from './loan.dto';
import { addDays, addWeeks, addMonths } from 'date-fns';

@Injectable()
export class LoanService {
  constructor(private readonly prisma: PrismaService) { }

  /**
   * Crea un nuevo préstamo (loan), validando que:
   * - El usuario y la moto existan.
   * - No haya ya un préstamo activo/no archivado para la misma moto.
   */
  async create(dto: CreateLoanDto) {
    // 1. Validar existencia de usuario y moto
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('User does not exist');

    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: dto.motorcycleId },
    });
    if (!motorcycle) throw new NotFoundException('Motorcycle does not exist');

    // 2. Verificar que la moto esté libre (sin loans activos/no archivados)
    const existingLoan = await this.prisma.loan.findFirst({
      where: {
        motorcycleId: dto.motorcycleId,
        archived: false,
        status: { not: 'COMPLETED' },
      },
    });
    if (existingLoan) {
      throw new ConflictException(
        `La moto ${dto.motorcycleId} ya tiene un contrato activo: ${existingLoan.contractNumber}`
      );
    }

    // 3. Calcular montos y fechas
    const debtRemaining = dto.totalAmount - dto.downPayment;
    const installmentPaymentAmmount =
      dto.installmentPaymentAmmount ??
      parseFloat((debtRemaining / dto.installments).toFixed(2));

    const endDate: Date =
      dto.paymentFrequency === PaymentFrequency.DAILY
        ? addDays(new Date(), dto.installments)
        : dto.paymentFrequency === PaymentFrequency.WEEKLY
          ? addWeeks(new Date(), dto.installments)
          : dto.paymentFrequency === PaymentFrequency.BIWEEKLY
            ? addWeeks(new Date(), dto.installments * 2)
            : addMonths(new Date(), dto.installments);

    // 4. Generar número de contrato
    const totalLoans = await this.prisma.loan.count();
    const nextNumber = totalLoans + 1;
    const contractNumber = `C${String(nextNumber).padStart(6, '0')}`;

    // 5. Crear el préstamo en la base de datos
    return this.prisma.loan.create({
      data: {
        contractNumber,
        userId: dto.userId,
        motorcycleId: dto.motorcycleId,
        totalAmount: dto.totalAmount,
        downPayment: dto.downPayment,
        installments: dto.installments,
        interestRate: dto.interestRate,
        interestType: dto.interestType ?? InterestType.FIXED,
        paymentFrequency: dto.paymentFrequency ?? PaymentFrequency.DAILY,
        installmentPaymentAmmount,
        gpsInstallmentPayment: dto.gpsInstallmentPayment,
        paidInstallments: 0,
        remainingInstallments: dto.installments,
        totalPaid: dto.downPayment,
        debtRemaining,
        endDate,
      },
      include: {
        user: true,
        motorcycle: true,
      },
    });
  }

  /**
   * Devuelve todos los préstamos, incluyendo usuario, moto y pagos.
   */
  async findAll() {
    return this.prisma.loan.findMany({
      include: {
        user: true,
        motorcycle: true,
        payments: true,
      },
    });
  }

  /**
   * Busca un préstamo por ID, lanza NotFound si no existe.
   */
  async findOne(id: string) {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        user: true,
        motorcycle: true,
        payments: true,
      },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  /**
   * Actualiza un préstamo existente.
   */
  async update(id: string, dto: UpdateLoanDto) {
    await this.findOne(id);
    return this.prisma.loan.update({
      where: { id },
      data: dto,
    });
  }

  /**
   * Elimina un préstamo por ID.
   */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.loan.delete({
      where: { id },
    });
  }

  /**
   * Archiva un préstamo y todas sus cuotas relacionadas.
   */
  async archive(id: string): Promise<void> {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan) {
      throw new NotFoundException(`Loan with id ${id} not found`);
    }

    await this.prisma.loan.update({
      where: { id },
      data: {
        archived: true,
        payments: {
          updateMany: {
            where: { archived: false },
            data: { archived: true },
          },
        },
      },
    });
  }

  /**
   * Desarchiva un préstamo y todas sus cuotas relacionadas,
   * volviendo a marcarlas como activas.
   */
  async unarchive(id: string): Promise<void> {
    const loan = await this.prisma.loan.findUnique({ where: { id } });
    if (!loan) {
      throw new NotFoundException(`Loan with id ${id} not found`);
    }

    await this.prisma.loan.update({
      where: { id },
      data: {
        archived: false,
        payments: {
          updateMany: {
            where: { archived: true },
            data: { archived: false },
          },
        },
      },
    });
  }
}
