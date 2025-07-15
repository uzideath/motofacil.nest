import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ProvidersService {
  constructor(private readonly prismaService: PrismaService) { }

  /**
   * Creates a new provider.
   * @param createProviderDto - The data transfer object containing provider details.
   */
  async create(createProviderDto: CreateProviderDto) {
    return this.prismaService.provider.create({
      data: createProviderDto,
    });
  }

  /**
   * Returns all providers.
   */
  async findAll() {
    return this.prismaService.provider.findMany({
      include: {
        motorcycles: true,
        cashRegisters: {
          include: {
            createdBy: {
              select: {
                name: true,
                username: true
              }
            }
          }
        },
      }
    });
  }

  /**
   * Returns a single provider by ID.
   * @param id - The ID of the provider to retrieve.
   */
  async findOne(id: string) {
    const provider = await this.prismaService.provider.findUnique({
      where: { id },
      include: {
        motorcycles: true,
        cashRegisters: true,
      },
    });

    if (!provider) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }

    return provider;
  }

  /**
   * Updates a provider by ID.
   * @param id - The ID of the provider to update.
   * @param updateProviderDto - The data transfer object with updated fields.
   */
  async update(id: string, updateProviderDto: UpdateProviderDto) {
    const exists = await this.prismaService.provider.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }

    return this.prismaService.provider.update({
      where: { id },
      data: updateProviderDto,
    });
  }

  /**
   * Deletes a provider by ID.
   * @param id - The ID of the provider to delete.
   */
  async remove(id: string) {
    const exists = await this.prismaService.provider.findUnique({
      where: { id },
    });

    if (!exists) {
      throw new NotFoundException(`Provider with ID ${id} not found`);
    }

    return this.prismaService.provider.delete({
      where: { id },
    });
  }
}
