import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';
import { Owners, UserRole } from 'generated/prisma';
import { PermissionsMap, DEFAULT_PERMISSIONS } from '../permissions/permissions.types';

@Injectable()
export class OwnersService {
  constructor(private readonly prisma: PrismaService) { }

  async list() {
    return this.prisma.owners.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        status: true,
        permissions: true,
        createdAt: true,
        updatedAt: true,
        lastAccess: true,
      },
    });
  }

  async create(data: CreateOwnerDto): Promise<Owners> {
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Get default permissions based on role
    const defaultPermissions = data.role
      ? DEFAULT_PERMISSIONS[data.role]
      : DEFAULT_PERMISSIONS[UserRole.EMPLOYEE];

    return this.prisma.owners.create({
      data: {
        name: data.name,
        username: data.username,
        passwordHash,
        role: data.role || UserRole.EMPLOYEE,
        storeId: data.storeId || null,
        permissions: data.permissions || defaultPermissions as any,
        status: data.status || 'ACTIVE',
      },
    });
  }

  async findById(id: string): Promise<Owners | null> {
    return this.prisma.owners.findUnique({
      where: { id },
    });
  }

  async findByIdWithPermissions(id: string) {
    return this.prisma.owners.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        permissions: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        lastAccess: true,
      },
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

    const updatedData: any = {
      name: data.name,
      username: data.username,
      status: data.status,
      role: data.role,
    };

    if (data.password) {
      updatedData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    // If role is being updated, update permissions to match the new role
    if (data.role) {
      updatedData.permissions = DEFAULT_PERMISSIONS[data.role];
    }

    // If permissions are provided directly, they override the role defaults
    if (data.permissions) {
      updatedData.permissions = data.permissions;
    }

    return this.prisma.owners.update({
      where: { id },
      data: updatedData,
    });
  }

  async updatePermissions(id: string, permissions: PermissionsMap): Promise<Owners> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Owner no encontrado');

    return this.prisma.owners.update({
      where: { id },
      data: {
        permissions: permissions as any,
        updatedAt: new Date(),
      },
    });
  }

  async getOwnerPermissions(id: string): Promise<PermissionsMap> {
    const owner = await this.findById(id);
    if (!owner) throw new NotFoundException('Owner no encontrado');

    // If owner is ADMIN, return full permissions
    if (owner.role === UserRole.ADMIN) {
      return DEFAULT_PERMISSIONS[UserRole.ADMIN];
    }

    return (owner.permissions as PermissionsMap) || {};
  }

  async delete(id: string): Promise<Owners> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundException('Owner no encontrado');

    return this.prisma.owners.delete({
      where: { id },
    });
  }
}
