import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateInstallmentDto, UpdateInstallmentDto } from './installment.dto';
import { LoanStatus } from 'generated/prisma';

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
        paymentMethod: dto.paymentMethod,
        isLate: dto.isLate ?? false,
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

  async findAll() {
    return this.prisma.installment.findMany({
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

    return this.prisma.installment.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.installment.delete({
      where: { id },
    });
  }
}
