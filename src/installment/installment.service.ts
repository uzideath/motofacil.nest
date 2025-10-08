import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateInstallmentDto, FindInstallmentFiltersDto, UpdateInstallmentDto } from './installment.dto';
import { LoanStatus, Prisma } from 'generated/prisma';
import { toColombiaMidnightUtc, toColombiaEndOfDayUtc, toColombiaUtc } from 'src/lib/dates';
import { addDays, subHours } from 'date-fns';
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

    const installment = await this.prisma.installment.create({
      data: {
        loanId: dto.loanId,
        amount: dto.amount,
        gps: dto.gps,
        paymentDate: dto.paymentDate ? toColombiaUtc(dto.paymentDate) : toColombiaUtc(new Date()), // Actual payment date from form, or now if not provided
        latePaymentDate: dto.latePaymentDate ? toColombiaUtc(dto.latePaymentDate) : null, // Original due date (if late)
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

  async findAll(filters: FindInstallmentFiltersDto) {
    const { 
      startDate, 
      endDate, 
      plate, 
      userId, 
      loanId, 
      vehicleType, 
      paymentMethod, 
      isLate,
      minAmount,
      maxAmount,
      page = 1, 
      limit = 50 
    } = filters;
    
    const where: Prisma.InstallmentWhereInput = {};

    // Date filters
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

    // Amount filters
    if (minAmount !== undefined || maxAmount !== undefined) {
      where.amount = {};
      if (minAmount !== undefined) {
        where.amount.gte = minAmount;
      }
      if (maxAmount !== undefined) {
        where.amount.lte = maxAmount;
      }
    }

    // Payment method filter
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    // Late payment filter
    if (isLate !== undefined) {
      where.isLate = isLate;
    }

    // Loan filters
    if (loanId || userId || plate || vehicleType) {
      where.loan = {};
      
      if (loanId) {
        where.loan.id = loanId;
      }
      
      if (userId) {
        where.loan.userId = userId;
      }

      if (plate || vehicleType) {
        where.loan.vehicle = {};
        
        if (plate) {
          where.loan.vehicle.plate = {
            contains: plate,
            mode: 'insensitive',
          };
        }
        
        if (vehicleType) {
          where.loan.vehicle.vehicleType = vehicleType;
        }
      }
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.installment.findMany({
        where,
        include: {
          loan: {
            include: {
              user: true,
              vehicle: {
                include: {
                  provider: true,
                }
              }
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
        skip,
        take: limit,
      }),
      this.prisma.installment.count({ where }),
    ]);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAllRaw(): Promise<Installment[]> {
    return this.prisma.installment.findMany({
      include: {
        loan: {
          include: {
            user: true,
            vehicle: {
              include: {
                provider: true,
              }
            }
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
            vehicle: true,
          }
        },
        createdBy: true,
      },
    });

    if (!record) throw new NotFoundException('Installment not found');
    return record;
  }


  async update(id: string, dto: UpdateInstallmentDto) {
    console.log('📅 Received update DTO:', {
      id,
      paymentDate: dto.paymentDate,
      latePaymentDate: dto.latePaymentDate,
      fullDto: dto
    });

    await this.findOne(id);

    const { loanId, createdById, paymentDate, latePaymentDate, ...rest } = dto;

    const updateData: any = {
      ...rest,
      updatedAt: toColombiaUtc(new Date()),
    };

    // Handle paymentDate - convert to Colombia UTC if provided
    if (paymentDate !== undefined) {
      updateData.paymentDate = toColombiaUtc(paymentDate);
      console.log('📅 Converting paymentDate:', {
        original: paymentDate,
        converted: updateData.paymentDate
      });
    }

    // Handle latePaymentDate - convert to Colombia UTC if provided, null if explicitly null
    if (latePaymentDate !== undefined) {
      updateData.latePaymentDate = latePaymentDate ? toColombiaUtc(latePaymentDate) : null;
    }

    // Handle createdBy relationship if provided
    if (createdById) {
      updateData.createdBy = { connect: { id: createdById } };
    }

    console.log('📅 Final update data:', updateData);

    return this.prisma.installment.update({
      where: { id },
      data: updateData,
    });

  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.installment.delete({
      where: { id },
    });
  }
}
