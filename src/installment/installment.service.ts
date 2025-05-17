import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateInstallmentDto, FindInstallmentFiltersDto, UpdateInstallmentDto } from './installment.dto';
import { LoanStatus, Prisma } from 'generated/prisma';
import { toColombiaMidnightUtc, toColombiaEndOfDayUtc } from 'src/lib/dates';
import { addDays } from 'date-fns';

@Injectable()
export class InstallmentService {
  constructor(private readonly prisma: PrismaService) { }

  async create(dto: CreateInstallmentDto) {
    const loan = await this.prisma.loan.findUnique({
      where: { id: dto.loanId },
    });

    if (!loan) throw new NotFoundException('Loan not found');

    if (
      loan.status === LoanStatus.COMPLETED ||
      loan.status === LoanStatus.DEFAULTED
    ) {
      throw new BadRequestException(
        `Loan status is ${loan.status}. No more payments allowed.`,
      );
    }

    if (dto.amount > loan.debtRemaining) {
      throw new BadRequestException('Payment amount exceeds remaining debt.');
    }

    // Crear cuota
    const installment = await this.prisma.installment.create({
      data: {
        loanId: dto.loanId,
        amount: dto.amount,
        gps: dto.gps,
        latePaymentDate: dto.latePaymentDate,
        notes: dto.notes,
        paymentMethod: dto.paymentMethod,
        isLate: dto.isLate ?? false,
        attachmentUrl: dto.attachmentUrl,
        createdById: dto.createdById,
      },
    });

    const updatedPaid = loan.paidInstallments + 1;
    const updatedRemaining = loan.remainingInstallments - 1;
    const updatedTotalPaid = loan.totalPaid + dto.amount;
    const updatedDebt = loan.debtRemaining - dto.amount;

    const newStatus =
      updatedRemaining <= 0 && updatedDebt <= 0
        ? LoanStatus.COMPLETED
        : LoanStatus.ACTIVE;

    await this.prisma.loan.update({
      where: { id: loan.id },
      data: {
        paidInstallments: updatedPaid,
        remainingInstallments: updatedRemaining,
        totalPaid: updatedTotalPaid,
        debtRemaining: updatedDebt,
        status: newStatus,
      },
    });

    return installment;
  }

  async findAll(filters: FindInstallmentFiltersDto): Promise<Installment[]> {
    const { startDate, endDate } = filters;
    const where: Prisma.InstallmentWhereInput = {};

    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) {
        where.paymentDate.gte = toColombiaMidnightUtc(startDate);
      }
      if (endDate) {
        const extendedEndDate = addDays(new Date(endDate), 1);
        where.paymentDate.lte = toColombiaEndOfDayUtc(extendedEndDate);
      }
    }

    return this.prisma.installment.findMany({
      where,
      include: {
        loan: {
          include: {
            user: true,
            motorcycle: true,
            payments: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            name: true,
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });
  }


  async findOne(id: string) {
    const record = await this.prisma.installment.findUnique({
      where: { id },
      include: {
        loan: true,
        createdBy: {
          select: {
            id: true,
            username: true,
          },
        },
      },
    });

    if (!record) throw new NotFoundException('Installment not found');
    return record;
  }


  async update(id: string, dto: UpdateInstallmentDto) {
    await this.findOne(id);

    const { loanId, createdById, ...rest } = dto;

    return this.prisma.installment.update({
      where: { id },
      data: {
        ...rest,
        ...(createdById ? { createdBy: { connect: { id: createdById } } } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.installment.delete({
      where: { id },
    });
  }
}
