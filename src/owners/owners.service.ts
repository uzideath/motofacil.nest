// src/owners/owners.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateOwnerDto } from './dto';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) { }

  async list() {
    return this.prisma.owners.findMany();
  }

  async create(data: CreateOwnerDto) {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.owners.create({
      data: {
        username: data.username,
        passwordHash,
        status: data.status || 'ACTIVE',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.owners.findUnique({
      where: { id },
    });
  }

  async updateLastAccess(id: string) {
    return this.prisma.owners.update({
      where: { id },
      data: { lastAccess: new Date() },
    });
  }
}
