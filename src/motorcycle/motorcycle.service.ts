import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { CreateMotorcycleDto, UpdateMotorcycleDto } from './motorcycle.dto';

@Injectable()
export class MotorcycleService {
  constructor(private readonly prisma: PrismaService) {}

  create(dto: CreateMotorcycleDto) {
    return this.prisma.motorcycle.create({ data: dto });
  }

  findAll() {
    return this.prisma.motorcycle.findMany();
  }

  async findOne(id: string) {
    const moto = await this.prisma.motorcycle.findUnique({ where: { id } });
    if (!moto) throw new NotFoundException('Motorcycle not found');
    return moto;
  }

  async update(id: string, dto: UpdateMotorcycleDto) {
    await this.findOne(id);
    return this.prisma.motorcycle.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.motorcycle.delete({ where: { id } });
  }
}
