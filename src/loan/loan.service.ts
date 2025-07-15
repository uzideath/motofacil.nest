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

  async create(dto: CreateLoanDto) {

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('User does not exist');

    const motorcycle = await this.prisma.motorcycle.findUnique({
      where: { id: dto.motorcycleId },
    });
    if (!motorcycle) throw new NotFoundException('Motorcycle does not exist');

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


    /**
     * Calculate the remaining debt and installment payment amount.
     */
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

    const totalLoans = await this.prisma.loan.count();
    const nextNumber = totalLoans + 1;
    const contractNumber = `C${String(nextNumber).padStart(6, '0')}`;

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


  async findAll() {
    return this.prisma.loan.findMany({
      include: {
        user: true,
        motorcycle: true,
        payments: true,
      },
    });
  }


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

  async update(id: string, dto: UpdateLoanDto) {
    await this.findOne(id);
    return this.prisma.loan.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.loan.delete({
      where: { id },
    });
  }


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
