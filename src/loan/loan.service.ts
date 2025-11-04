import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateLoanDto,
  InterestType,
  PaymentFrequency,
  UpdateLoanDto,
} from './loan.dto';
import { addDays, addWeeks, addMonths, differenceInDays, differenceInWeeks, differenceInMonths } from 'date-fns';
import { BaseStoreService } from 'src/lib/base-store.service';
import { Loan, User, Vehicle } from 'src/prisma/generated/client';

type LoanWithRelations = Loan & {
  user: User;
  vehicle: Vehicle;
  payments: Installment[];
};

type LoanStatus = LoanWithRelations & {
  expectedInstallments: number;
  installmentsPending: number;
  installmentsRemaining: number;
  isUpToDate: boolean;
  daysLate: number;
  lastPaymentDate: Date | null;
  daysSinceLastPayment: number | null;
};

@Injectable()
export class LoanService extends BaseStoreService {
  constructor(protected readonly prisma: PrismaService) {
    super(prisma);
  }

  /**
   * Add business days (Monday-Saturday, excluding Sundays) to a date
   * @param startDate - The starting date
   * @param daysToAdd - Number of business days to add
   * @returns The calculated end date
   */
  private addBusinessDays(startDate: Date, daysToAdd: number): Date {
    let currentDate = new Date(startDate);
    let addedDays = 0;

    while (addedDays < daysToAdd) {
      currentDate = addDays(currentDate, 1);
      
      // Check if it's not Sunday (0 = Sunday, 6 = Saturday)
      if (currentDate.getDay() !== 0) {
        addedDays++;
      }
    }

    return currentDate;
  }

  async create(dto: CreateLoanDto) {

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });
    if (!user) throw new NotFoundException('User does not exist');

    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: dto.vehicleId },
    });
    if (!vehicle) throw new NotFoundException('Vehicle does not exist');

    const existingLoan = await this.prisma.loan.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        archived: false,
        status: { not: 'COMPLETED' },
      },
    });
    if (existingLoan) {
      throw new ConflictException(
        `El vehículo ${dto.vehicleId} ya tiene un contrato activo: ${existingLoan.contractNumber}`
      );
    }


    /**
     * Calculate the remaining debt and installment payment amount.
     */
    const debtRemaining = dto.totalAmount - dto.downPayment;
    const installmentPaymentAmmount =
      dto.installmentPaymentAmmount ??
      parseFloat((debtRemaining / dto.installments).toFixed(2));

    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const paymentFrequency = dto.paymentFrequency ?? PaymentFrequency.DAILY;

    // Calculate endDate: use provided endDate or calculate based on startDate
    // Default to 540 business days (18 months, Monday-Saturday, excluding Sundays)
    const endDate: Date = dto.endDate 
      ? new Date(dto.endDate)
      : paymentFrequency === PaymentFrequency.DAILY
        ? this.addBusinessDays(startDate, 540) // 540 business days ahead (Mon-Sat)
        : paymentFrequency === PaymentFrequency.WEEKLY
          ? addWeeks(startDate, dto.installments)
          : paymentFrequency === PaymentFrequency.BIWEEKLY
            ? addWeeks(startDate, dto.installments * 2)
            : addMonths(startDate, dto.installments);

    const totalLoans = await this.prisma.loan.count();
    const nextNumber = totalLoans + 1;
    const contractNumber = `C${String(nextNumber).padStart(6, '0')}`;

    return this.prisma.loan.create({
      data: {
        contractNumber,
        store: { connect: { id: dto.storeId! } },
        user: { connect: { id: dto.userId } },
        vehicle: { connect: { id: dto.vehicleId } },
        totalAmount: dto.totalAmount,
        downPayment: dto.downPayment,
        installments: dto.installments,
        interestRate: dto.interestRate,
        interestType: dto.interestType ?? InterestType.FIXED,
        paymentFrequency,
        installmentPaymentAmmount,
        gpsInstallmentPayment: dto.gpsInstallmentPayment,
        paidInstallments: 0,
        remainingInstallments: dto.installments,
        totalPaid: dto.downPayment,
        debtRemaining,
        startDate,
        endDate,
      },
      include: {
        user: true,
        vehicle: true,
      },
    });
  }


  async findAll(userStoreId: string | null): Promise<any[]> {
    const loans = await this.prisma.loan.findMany({
      where: this.storeFilter(userStoreId),
      include: {
        user: true,
        vehicle: true,
        payments: true,
      },
    });

    // Get archived loan count for each vehicle
    const loansWithVehicleInfo = await Promise.all(
      loans.map(async (loan) => {
        const archivedCount = await this.prisma.loan.count({
          where: {
            vehicleId: loan.vehicleId,
            archived: true,
          },
        });

        return {
          ...loan,
          vehicle: {
            ...loan.vehicle,
            archivedLoansCount: archivedCount,
          },
        };
      })
    );

    return loansWithVehicleInfo;
  }


  async findOne(id: string, userStoreId: string | null): Promise<LoanWithRelations> {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        user: true,
        vehicle: true,
        payments: true,
      },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    
    // Validate store access
    this.validateStoreAccess(loan, userStoreId);
    
    return loan;
  }

  // Internal method for finding loans without store validation
  private async findOneInternal(id: string): Promise<LoanWithRelations> {
    const loan = await this.prisma.loan.findUnique({
      where: { id },
      include: {
        user: true,
        vehicle: true,
        payments: true,
      },
    });
    if (!loan) throw new NotFoundException('Loan not found');
    return loan;
  }

  async update(id: string, dto: UpdateLoanDto, userStoreId: string | null): Promise<Loan> {
    await this.findOne(id, userStoreId);
    
    // If startDate or endDate is being updated, recalculate endDate if needed
    let updateData: any = { ...dto };
    
    if (dto.startDate && !dto.endDate && dto.installments && dto.paymentFrequency) {
      const startDate = new Date(dto.startDate);
      const paymentFrequency = dto.paymentFrequency;
      const installments = dto.installments;
      
      // Default to 540 business days (Monday-Saturday) if payment frequency is DAILY
      const endDate: Date =
        paymentFrequency === PaymentFrequency.DAILY
          ? this.addBusinessDays(startDate, 540) // 540 business days ahead (Mon-Sat)
          : paymentFrequency === PaymentFrequency.WEEKLY
            ? addWeeks(startDate, installments)
            : paymentFrequency === PaymentFrequency.BIWEEKLY
              ? addWeeks(startDate, installments * 2)
              : addMonths(startDate, installments);
      
      updateData.endDate = endDate;
    } else if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }
    
    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    
    return this.prisma.loan.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Recalculate and update loan installments based on current date
   * This syncs the loan's expected installments with actual time elapsed
   */
  async recalculateInstallments(id: string): Promise<LoanWithRelations> {
    const loan = await this.findOneInternal(id);
    
    const expectedInstallments = this.calculateExpectedInstallments(loan);
    const installmentsRemaining = loan.installments - loan.paidInstallments;
    
    // Update the loan with recalculated values
    const updated = await this.prisma.loan.update({
      where: { id },
      data: {
        remainingInstallments: installmentsRemaining,
        // Optional: update status based on payment progress
        status: loan.paidInstallments >= loan.installments 
          ? 'COMPLETED' 
          : loan.paidInstallments >= expectedInstallments 
            ? 'ACTIVE' 
            : 'PENDING',
      },
      include: {
        user: true,
        vehicle: true,
        payments: true,
      },
    });
    
    return updated;
  }

  /**
   * Update loan with new start/end dates and recalculate all time-based fields
   */
  async updateLoanDates(
    id: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<LoanWithRelations> {
    const loan = await this.findOneInternal(id);
    
    const newStartDate = startDate ? new Date(startDate) : new Date(loan.startDate);
    let newEndDate: Date;
    
    if (endDate) {
      newEndDate = new Date(endDate);
    } else {
      // Recalculate end date based on new start date
      // Default to 540 business days (Monday-Saturday) if payment frequency is DAILY
      const paymentFrequency = loan.paymentFrequency as PaymentFrequency;
      newEndDate =
        paymentFrequency === PaymentFrequency.DAILY
          ? this.addBusinessDays(newStartDate, 540) // 540 business days ahead (Mon-Sat)
          : paymentFrequency === PaymentFrequency.WEEKLY
            ? addWeeks(newStartDate, loan.installments)
            : paymentFrequency === PaymentFrequency.BIWEEKLY
              ? addWeeks(newStartDate, loan.installments * 2)
              : addMonths(newStartDate, loan.installments);
    }
    
    // Update the loan with new dates
    const updated = await this.prisma.loan.update({
      where: { id },
      data: {
        startDate: newStartDate,
        endDate: newEndDate,
      },
      include: {
        user: true,
        vehicle: true,
        payments: true,
      },
    });
    
    // Recalculate installments after date update
    return this.recalculateInstallments(id);
  }

  async remove(id: string, userStoreId: string | null) {
    await this.findOne(id, userStoreId);
    
    // Delete associated installments first
    await this.prisma.installment.deleteMany({
      where: { loanId: id },
    });
    
    // Then delete the loan
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

  /**
   * Calculate how many installments should have been paid based on time elapsed
   * since the loan start date
   */
  private calculateExpectedInstallments(loan: Loan): number {
    const now = new Date();
    const startDate = new Date(loan.startDate);
    
    // If start date is in the future, no installments are expected yet
    if (startDate > now) {
      return 0;
    }

    let periodsElapsed = 0;

    switch (loan.paymentFrequency) {
      case PaymentFrequency.DAILY:
        periodsElapsed = differenceInDays(now, startDate);
        break;
      case PaymentFrequency.WEEKLY:
        periodsElapsed = differenceInWeeks(now, startDate);
        break;
      case PaymentFrequency.BIWEEKLY:
        periodsElapsed = Math.floor(differenceInWeeks(now, startDate) / 2);
        break;
      case PaymentFrequency.MONTHLY:
        periodsElapsed = differenceInMonths(now, startDate);
        break;
      default:
        periodsElapsed = 0;
    }

    // Can't expect more installments than the total
    return Math.min(periodsElapsed, loan.installments);
  }

  /**
   * Get the last payment date from a loan's payments
   */
  private getLastPaymentDate(loan: LoanWithRelations): Date | null {
    if (!loan.payments || loan.payments.length === 0) {
      return null;
    }

    // Find the most recent payment by paymentDate
    const sortedPayments = [...loan.payments].sort((a, b) => {
      return new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime();
    });

    return sortedPayments[0]?.paymentDate || null;
  }

  /**
   * Calculate days since last payment
   */
  private calculateDaysSinceLastPayment(lastPaymentDate: Date | null): number | null {
    if (!lastPaymentDate) {
      return null;
    }

    return differenceInDays(new Date(), new Date(lastPaymentDate));
  }

  /**
   * Get loan status with calculated expected installments
   */
  async getLoanStatus(id: string, userStoreId: string | null): Promise<LoanStatus> {
    const loan = await this.findOne(id, userStoreId);
    
    const expectedInstallments = this.calculateExpectedInstallments(loan);
    const installmentsPaid = loan.paidInstallments;
    const installmentsPending = expectedInstallments - installmentsPaid;
    const installmentsRemaining = loan.installments - installmentsPaid;
    const lastPaymentDate = this.getLastPaymentDate(loan);
    const daysSinceLastPayment = this.calculateDaysSinceLastPayment(lastPaymentDate);
    
    return {
      ...loan,
      expectedInstallments,
      installmentsPending, // How many they should have paid but haven't
      installmentsRemaining, // Total remaining until loan is complete
      isUpToDate: installmentsPaid >= expectedInstallments,
      daysLate: installmentsPending > 0 ? installmentsPending : 0,
      lastPaymentDate,
      daysSinceLastPayment,
    };
  }

  /**
   * Get all loans with their calculated status
   */
  async findAllWithStatus(userStoreId: string | null): Promise<LoanStatus[]> {
    const loans = await this.findAll(userStoreId);
    
    return loans.map(loan => {
      const expectedInstallments = this.calculateExpectedInstallments(loan);
      const installmentsPaid = loan.paidInstallments;
      const installmentsPending = expectedInstallments - installmentsPaid;
      const installmentsRemaining = loan.installments - installmentsPaid;
      const lastPaymentDate = this.getLastPaymentDate(loan);
      const daysSinceLastPayment = this.calculateDaysSinceLastPayment(lastPaymentDate);
      
      return {
        ...loan,
        expectedInstallments,
        installmentsPending,
        installmentsRemaining,
        isUpToDate: installmentsPaid >= expectedInstallments,
        daysLate: installmentsPending > 0 ? installmentsPending : 0,
        lastPaymentDate,
        daysSinceLastPayment,
      };
    });
  }
}
