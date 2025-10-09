import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import * as bcrypt from 'bcrypt';
import { CreateOwnerDto, UpdateOwnerDto } from './dto';
import { Owners } from 'generated/prisma';
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
        roles: true,
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
    const defaultPermissions = data.roles && data.roles.length > 0
      ? DEFAULT_PERMISSIONS[data.roles[0] as 'ADMIN' | 'MODERATOR' | 'USER'] || {}
      : DEFAULT_PERMISSIONS.USER;

    return this.prisma.owners.create({
      data: {
        name: data.name,
        username: data.username,
        passwordHash,
        roles: (data.roles || ['USER']) as any,
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
        roles: true,
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
      roles: data.roles,
    };

    if (data.password) {
      updatedData.passwordHash = await bcrypt.hash(data.password, 10);
    }

    // If roles are being updated, optionally update permissions to match the new role
    if (data.roles && data.roles.length > 0) {
      const primaryRole = data.roles[0] as 'ADMIN' | 'MODERATOR' | 'USER';
      // Only update permissions if they don't exist or if explicitly requested
      if (!existing.permissions || data.updatePermissions) {
        updatedData.permissions = DEFAULT_PERMISSIONS[primaryRole];
      }
    }

    // If permissions are provided directly
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
    if (owner.roles.includes('ADMIN')) {
      return DEFAULT_PERMISSIONS.ADMIN;
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
