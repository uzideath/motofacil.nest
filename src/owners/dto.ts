import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { PermissionsMap } from '../permissions/permissions.types';
import { UserRole } from 'src/prisma/generated/client';

export class CreateOwnerDto {
    @IsString()
    name: string;

    @IsString()
    username: string;

    @IsString()
    password: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;

    @IsOptional()
    @IsString()
    storeId?: string;

    @IsOptional()
    permissions?: PermissionsMap;

    @IsOptional()
    @IsString()
    status?: string;
}

export class UpdateOwnerDto extends PartialType(CreateOwnerDto) {}
