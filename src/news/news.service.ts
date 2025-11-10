import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsDto, UpdateNewsDto, QueryNewsDto, NewsType, NewsCategory } from './dto';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new news item
   * - For LOAN_SPECIFIC: requires loanId
   * - For STORE_WIDE: affects all loans in the store
   * - Auto-calculates installments if autoCalculateInstallments is true
   */
  async create(dto: CreateNewsDto, createdById: string) {
    // Validate loan-specific news
    if (dto.type === NewsType.LOAN_SPECIFIC && !dto.loanId) {
      throw new BadRequestException('loanId is required for LOAN_SPECIFIC news');
    }

    // Validate store-wide news
    if (dto.type === NewsType.STORE_WIDE && dto.loanId) {
      throw new BadRequestException('loanId should not be provided for STORE_WIDE news');
    }

    // Verify loan exists and belongs to the store
    if (dto.loanId) {
      const loan = await this.prisma.loan.findUnique({
        where: { id: dto.loanId },
        select: { id: true, storeId: true },
      });

      if (!loan) {
        throw new NotFoundException('Loan not found');
      }

      if (loan.storeId !== dto.storeId) {
        throw new ForbiddenException('Loan does not belong to the specified store');
      }
    }

    // Auto-calculate installments if enabled
    let installmentsToSubtract = dto.installmentsToSubtract || 0;
    let amountToSubtract = 0;
    
    if (dto.autoCalculateInstallments && dto.daysUnavailable && dto.loanId) {
      const result = await this.calculateInstallmentsAndAmount(
        dto.loanId,
        dto.daysUnavailable,
      );
      installmentsToSubtract = result.installments;
      amountToSubtract = result.amount;

      // Update the loan's total amount by subtracting the calculated amount
      const loan = await this.prisma.loan.findUnique({
        where: { id: dto.loanId },
        select: { 
          totalAmount: true, 
          debtRemaining: true,
          remainingInstallments: true,
        },
      });

      if (loan) {
        const newTotalAmount = loan.totalAmount - amountToSubtract;
        const newDebtRemaining = loan.debtRemaining - amountToSubtract;
        const newRemainingInstallments = Math.max(0, loan.remainingInstallments - installmentsToSubtract);
        
        await this.prisma.loan.update({
          where: { id: dto.loanId },
          data: { 
            totalAmount: newTotalAmount,
            debtRemaining: newDebtRemaining,
            remainingInstallments: newRemainingInstallments,
          },
        });
      }
    }

    // Create the news
    const news = await this.prisma.news.create({
      data: {
        type: dto.type,
        category: dto.category,
        title: dto.title,
        description: dto.description,
        notes: dto.notes,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        isActive: dto.isActive ?? true,
        autoCalculateInstallments: dto.autoCalculateInstallments ?? false,
        daysUnavailable: dto.daysUnavailable,
        installmentsToSubtract,
        store: {
          connect: { id: dto.storeId },
        },
        loan: dto.loanId ? {
          connect: { id: dto.loanId },
        } : undefined,
        createdBy: {
          connect: { id: createdById },
        },
      },
      include: {
        loan: {
          include: {
            user: true,
            vehicle: true,
          },
        },
        store: true,
        createdBy: true,
      },
    });

    return news;
  }

  /**
   * Calculate how many installments and amount should be subtracted based on days unavailable
   * Returns both the number of installments and the total amount to subtract from the loan
   */
  private async calculateInstallmentsAndAmount(
    loanId: string,
    daysUnavailable: number,
  ): Promise<{ installments: number; amount: number }> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: { 
        paymentFrequency: true,
        installmentPaymentAmmount: true,
        gpsInstallmentPayment: true,
      },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Calculate daily cost (installment + GPS fee)
    const dailyCost = loan.installmentPaymentAmmount + loan.gpsInstallmentPayment;

    // Calculate based on payment frequency
    let installmentsToSubtract = 0;
    let amountToSubtract = 0;

    switch (loan.paymentFrequency) {
      case 'DAILY':
        // For daily payments: 1 day = 1 installment
        installmentsToSubtract = daysUnavailable;
        amountToSubtract = dailyCost * daysUnavailable;
        break;
      case 'WEEKLY':
        // For weekly payments: 7 days = 1 installment
        installmentsToSubtract = Math.floor(daysUnavailable / 7);
        amountToSubtract = dailyCost * daysUnavailable;
        break;
      case 'BIWEEKLY':
        // For biweekly payments: 14 days = 1 installment
        installmentsToSubtract = Math.floor(daysUnavailable / 14);
        amountToSubtract = dailyCost * daysUnavailable;
        break;
      case 'MONTHLY':
        // For monthly payments: 30 days = 1 installment
        installmentsToSubtract = Math.floor(daysUnavailable / 30);
        amountToSubtract = dailyCost * daysUnavailable;
        break;
      default:
        installmentsToSubtract = daysUnavailable;
        amountToSubtract = dailyCost * daysUnavailable;
    }

    return {
      installments: installmentsToSubtract,
      amount: amountToSubtract,
    };
  }

  /**
   * Find all news items with filters
   */
  async findAll(query: QueryNewsDto) {
    const page = parseInt(query.page || '1', 10);
    const limit = parseInt(query.limit || '50', 10);
    const skip = (page - 1) * limit;

    const where: {
      type?: NewsType;
      category?: NewsCategory;
      loanId?: string;
      storeId?: string;
      isActive?: boolean;
    } = {};

    if (query.type) {
      where.type = query.type;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.loanId) {
      where.loanId = query.loanId;
    }

    if (query.storeId) {
      where.storeId = query.storeId;
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const [news, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        include: {
          loan: {
            include: {
              user: true,
              vehicle: true,
            },
          },
          store: true,
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.news.count({ where }),
    ]);

    return {
      data: news,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Find a single news item by ID
   */
  async findOne(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: {
        loan: {
          include: {
            user: true,
            vehicle: true,
          },
        },
        store: true,
        createdBy: true,
      },
    });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    return news;
  }

  /**
   * Get active news for a specific loan
   */
  async getActiveLoanNews(loanId: string) {
    return this.prisma.news.findMany({
      where: {
        loanId,
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      include: {
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get active store-wide news
   */
  async getActiveStoreNews(storeId: string) {
    return this.prisma.news.findMany({
      where: {
        storeId,
        type: NewsType.STORE_WIDE,
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gte: new Date() } },
        ],
      },
      include: {
        createdBy: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update a news item
   */
  async update(id: string, dto: UpdateNewsDto) {
    const existingNews = await this.prisma.news.findUnique({
      where: { id },
    });

    if (!existingNews) {
      throw new NotFoundException('News not found');
    }

    // Recalculate installments and amount if days unavailable changed
    let installmentsToSubtract = dto.installmentsToSubtract;
    let amountToSubtract = 0;
    
    if (
      dto.autoCalculateInstallments &&
      dto.daysUnavailable &&
      existingNews.loanId
    ) {
      const result = await this.calculateInstallmentsAndAmount(
        existingNews.loanId,
        dto.daysUnavailable,
      );
      installmentsToSubtract = result.installments;
      amountToSubtract = result.amount;

      // If this is an update and the days changed, we need to adjust the loan
      // First, reverse the old amount (if it existed)
      if (existingNews.daysUnavailable && existingNews.autoCalculateInstallments) {
        const oldResult = await this.calculateInstallmentsAndAmount(
          existingNews.loanId,
          existingNews.daysUnavailable,
        );
        
        // Add back the old amount
        const loan = await this.prisma.loan.findUnique({
          where: { id: existingNews.loanId },
          select: { 
            totalAmount: true, 
            debtRemaining: true,
            remainingInstallments: true,
          },
        });

        if (loan) {
          // Add back old amount and subtract new amount
          const netAmountChange = amountToSubtract - oldResult.amount;
          const netInstallmentsChange = installmentsToSubtract - oldResult.installments;
          
          const newTotalAmount = loan.totalAmount - netAmountChange;
          const newDebtRemaining = loan.debtRemaining - netAmountChange;
          const newRemainingInstallments = Math.max(0, loan.remainingInstallments - netInstallmentsChange);
          
          await this.prisma.loan.update({
            where: { id: existingNews.loanId },
            data: { 
              totalAmount: newTotalAmount,
              debtRemaining: newDebtRemaining,
              remainingInstallments: newRemainingInstallments,
            },
          });
        }
      } else {
        // This is a new auto-calculation, just subtract the amount
        const loan = await this.prisma.loan.findUnique({
          where: { id: existingNews.loanId },
          select: { 
            totalAmount: true, 
            debtRemaining: true,
            remainingInstallments: true,
          },
        });

        if (loan) {
          const newTotalAmount = loan.totalAmount - amountToSubtract;
          const newDebtRemaining = loan.debtRemaining - amountToSubtract;
          const newRemainingInstallments = Math.max(0, loan.remainingInstallments - installmentsToSubtract);
          
          await this.prisma.loan.update({
            where: { id: existingNews.loanId },
            data: { 
              totalAmount: newTotalAmount,
              debtRemaining: newDebtRemaining,
              remainingInstallments: newRemainingInstallments,
            },
          });
        }
      }
    }

    const updateData: {
      type?: NewsType;
      category?: NewsCategory;
      title?: string;
      description?: string;
      notes?: string;
      startDate?: Date | string;
      endDate?: Date | string;
      isActive?: boolean;
      autoCalculateInstallments?: boolean;
      daysUnavailable?: number;
      installmentsToSubtract?: number;
    } = { ...dto };
    
    if (dto.startDate) {
      updateData.startDate = new Date(dto.startDate);
    }
    if (dto.endDate) {
      updateData.endDate = new Date(dto.endDate);
    }
    if (installmentsToSubtract !== undefined) {
      updateData.installmentsToSubtract = installmentsToSubtract;
    }

    return this.prisma.news.update({
      where: { id },
      data: updateData,
      include: {
        loan: {
          include: {
            user: true,
            vehicle: true,
          },
        },
        store: true,
        createdBy: true,
      },
    });
  }

  /**
   * Delete a news item
   * If the news had auto-calculated amounts, restore them to the loan
   */
  async remove(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
    });

    if (!news) {
      throw new NotFoundException('News not found');
    }

    // If this news had auto-calculated amounts, restore them to the loan
    if (news.loanId && news.autoCalculateInstallments && news.daysUnavailable) {
      const result = await this.calculateInstallmentsAndAmount(
        news.loanId,
        news.daysUnavailable,
      );

      const loan = await this.prisma.loan.findUnique({
        where: { id: news.loanId },
        select: { 
          totalAmount: true, 
          debtRemaining: true,
          remainingInstallments: true,
        },
      });

      if (loan) {
        // Add back the amount that was subtracted
        const newTotalAmount = loan.totalAmount + result.amount;
        const newDebtRemaining = loan.debtRemaining + result.amount;
        const newRemainingInstallments = loan.remainingInstallments + result.installments;
        
        await this.prisma.loan.update({
          where: { id: news.loanId },
          data: { 
            totalAmount: newTotalAmount,
            debtRemaining: newDebtRemaining,
            remainingInstallments: newRemainingInstallments,
          },
        });
      }
    }

    return this.prisma.news.delete({
      where: { id },
    });
  }

  /**
   * Get total installments to subtract for a loan (sum of all active news)
   */
  async getTotalInstallmentsToSubtract(loanId: string): Promise<number> {
    const activeNews = await this.prisma.news.findMany({
      where: {
        loanId,
        isActive: true,
        installmentsToSubtract: { not: null },
      },
      select: {
        installmentsToSubtract: true,
      },
    });

    return activeNews.reduce((sum, news) => sum + (news.installmentsToSubtract || 0), 0);
  }
}
