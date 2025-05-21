import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateInstallmentDto, FindInstallmentFiltersDto, UpdateInstallmentDto } from './installment.dto';
import { LoanStatus, Prisma } from 'generated/prisma';
import { toColombiaMidnightUtc, toColombiaEndOfDayUtc, toColombiaUtc } from 'src/lib/dates';
import { addDays } from 'date-fns';
import { zonedTimeToUtc } from 'date-fns-tz';

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
        latePaymentDate: dto.latePaymentDate ? toColombiaUtc(dto.latePaymentDate) : null,
        paymentDate: toColombiaUtc(new Date()),
        notes: dto.notes,
        paymentMethod: dto.paymentMethod,
        isLate: dto.isLate ?? false,
        attachmentUrl: dto.attachmentUrl,
        createdAt: toColombiaUtc(new Date()),
        updatedAt: toColombiaUtc(new Date()),
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
            // payments: true,
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
      orderBy: [
        { paymentDate: 'desc' },
        { createdAt: 'desc' }
      ],
    });
  }

  async findAllRaw(): Promise<Installment[]> {
    return this.prisma.installment.findMany({
      include: {
        loan: {
          include: {
            user: true,
            motorcycle: true,
          },
        },
        createdBy: true,
      },
    })
  }


  async findOne(id: string) {
    const record = await this.prisma.installment.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            user: true,
            motorcycle: true,
          }
        },
        createdBy: true,
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
        paymentDate: rest.PaymentDate ? toColombiaUtc(rest.PaymentDate) : undefined,
        latePaymentDate: rest.latePaymentDate ? toColombiaUtc(rest.latePaymentDate) : undefined,
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


async migrateInstallmentDates(): Promise<{ updated: number }> {
  const installments = await this.prisma.installment.findMany({
    select: { id: true, paymentDate: true }
  })

  let updatedCount = 0

  for (const installment of installments) {
    const currentPaymentDate = new Date(installment.paymentDate)

    // Suponemos que la fecha guardada era en hora Colombia, pero mal interpretada como UTC
    const correctedUtc = zonedTimeToUtc(currentPaymentDate, 'America/Bogota')

    // Solo actualizamos si hay diferencia real
    if (correctedUtc.toISOString() !== currentPaymentDate.toISOString()) {
      await this.prisma.installment.update({
        where: { id: installment.id },
        data: {
          paymentDate: correctedUtc,
        },
      })
      updatedCount++
    }
  }

  return { updated: updatedCount }
}

}
