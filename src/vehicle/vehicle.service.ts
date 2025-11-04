import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto, FindVehicleFiltersDto } from './vehicle.dto';
import { Prisma } from 'generated/prisma';

@Injectable()
export class VehicleService {
  constructor(private readonly prisma: PrismaService) { }

  create(dto: CreateVehicleDto, storeId: string) {
    const { storeId: _, providerId, ...data } = dto;
    return this.prisma.vehicle.create({ 
      data: {
        ...data,
        store: { connect: { id: storeId } },
        provider: { connect: { id: providerId } },
      } 
    });
  }

  async findAll(filters: FindVehicleFiltersDto = {}) {
    const {
      search,
      providerId,
      vehicleType,
      brand,
      plate,
      minPrice,
      maxPrice,
      page = 1,
      limit = 50,
    } = filters;

    const where: Prisma.VehicleWhereInput = {};

    // Search filter (searches across multiple fields)
    if (search) {
      where.OR = [
        { plate: { contains: search, mode: 'insensitive' } },
        { brand: { contains: search, mode: 'insensitive' } },
        { model: { contains: search, mode: 'insensitive' } },
        { engine: { contains: search, mode: 'insensitive' } },
        { chassis: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Specific filters
    if (providerId) {
      where.providerId = providerId;
    }

    if (vehicleType) {
      where.vehicleType = vehicleType;
    }

    if (brand) {
      where.brand = { contains: brand, mode: 'insensitive' };
    }

    if (plate) {
      where.plate = { contains: plate, mode: 'insensitive' };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }

    const skip = (page - 1) * limit;

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        where,
        include: {
          provider: true,
          loans: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.vehicle.count({ where }),
    ]);

    return {
      data: vehicles,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ 
      where: { id },
      include: {
        provider: true,
        loans: {
          include: {
            user: true,
          },
        },
      },
    });
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    await this.findOne(id);
    return this.prisma.vehicle.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.vehicle.delete({ where: { id } });
  }
}
