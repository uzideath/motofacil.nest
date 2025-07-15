import { Injectable } from '@nestjs/common';
import { CreateProviderDto } from './dto/create-provider.dto';
import { UpdateProviderDto } from './dto/update-provider.dto';
import { PrismaService } from 'src/prisma.service';

@Injectable()
export class ProvidersService {
  constructor(private readonly prismaService: PrismaService) { }
  /**
   * Creates a new provider.
   * @param createProviderDto - The data transfer object containing provider details.
   * @returns A message indicating the action performed.
   */
  async create(createProviderDto: CreateProviderDto) {
    return await this.prismaService.provider.create({
      data: createProviderDto,
    });
  }

  async findAll() {
    return await this.prismaService.provider.findMany()
  }

  findOne(id: number) {
    return `This action returns a #${id} provider`;
  }

  update(id: number, updateProviderDto: UpdateProviderDto) {
    return `This action updates a #${id} provider`;
  }

  remove(id: number) {
    return `This action removes a #${id} provider`;
  }
}
