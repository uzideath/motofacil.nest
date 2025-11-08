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
    if (dto.autoCalculateInstallments && dto.daysUnavailable) {
      installmentsToSubtract = await this.calculateInstallmentsToSubtract(
        dto.loanId!,
        dto.daysUnavailable,
      );
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
        storeId: dto.storeId,
        loanId: dto.loanId,
        createdById,
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
   * Calculate how many installments should be subtracted based on days unavailable
   * Logic: Each day unavailable = 1 installment (for daily payment frequency)
   * This can be adjusted based on the loan's payment frequency
   */
  private async calculateInstallmentsToSubtract(
    loanId: string,
    daysUnavailable: number,
  ): Promise<number> {
    const loan = await this.prisma.loan.findUnique({
      where: { id: loanId },
      select: { paymentFrequency: true },
    });

    if (!loan) {
      throw new NotFoundException('Loan not found');
    }

    // Calculate based on payment frequency
    let installmentsToSubtract = 0;

    switch (loan.paymentFrequency) {
      case 'DAILY':
        // For daily payments: 1 day = 1 installment
        installmentsToSubtract = daysUnavailable;
        break;
      case 'WEEKLY':
        // For weekly payments: 7 days = 1 installment
        installmentsToSubtract = Math.floor(daysUnavailable / 7);
        break;
      case 'BIWEEKLY':
        // For biweekly payments: 14 days = 1 installment
        installmentsToSubtract = Math.floor(daysUnavailable / 14);
        break;
      case 'MONTHLY':
        // For monthly payments: 30 days = 1 installment
        installmentsToSubtract = Math.floor(daysUnavailable / 30);
        break;
      default:
        installmentsToSubtract = daysUnavailable;
    }

    return installmentsToSubtract;
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

    // Recalculate installments if days unavailable changed
    let installmentsToSubtract = dto.installmentsToSubtract;
    if (
      dto.autoCalculateInstallments &&
      dto.daysUnavailable &&
      existingNews.loanId
    ) {
      installmentsToSubtract = await this.calculateInstallmentsToSubtract(
        existingNews.loanId,
        dto.daysUnavailable,
      );
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
   */
  async remove(id: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
    });

    if (!news) {
      throw new NotFoundException('News not found');
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
