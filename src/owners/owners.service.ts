import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';
import { Owners } from 'generated/prisma';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) { }

  async list(): Promise<Owners[]> {
    return this.prisma.owners.findMany();
  }

  async create(data: CreateOwnerDto): Promise<Owners> {
    const passwordHash = await bcrypt.hash(data.password, 10);

    return this.prisma.owners.create({
      data: {
        name: data.name,
        username: data.username,
        passwordHash,
        status: data.status || 'ACTIVE',
      },
    });
  }

  async findById(id: string): Promise<Owners | null> {
    return this.prisma.owners.findUnique({
      where: { id },
    });
  }

  async updateLastAccess(id: string): Promise<Owners> {
    return this.prisma.owners.update({
      where: { id },
      data: { lastAccess: new Date() },
    });
  }

  async update(id: string, data: UpdateOwnerDto): Promise<Owners> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Owner no encontrado');

    const updatedData: Partial<Owners> = {
      name: data.name,
      username: data.username,
      status: data.status,
    };

    if (data.password) {
      updatedData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.owners.update({
      where: { id },
      data: updatedData,
    });
  }

  async delete(id: string): Promise<Owners> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Owner no encontrado');

    return this.prisma.owners.delete({
      where: { id },
    });
  }
}
