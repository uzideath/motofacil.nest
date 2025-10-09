import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsArray, IsBoolean } from 'class-validator';
import { PermissionsMap } from '../permissions/permissions.types';

export class CreateOwnerDto {
    @IsString()
    name: string;

    @IsString()
    username: string;

    @IsString()
    password: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    roles?: string[];

    @IsOptional()
    permissions?: PermissionsMap;

    @IsOptional()
    @IsString()
    status?: string;
}

export class UpdateOwnerDto extends PartialType(CreateOwnerDto) {
    @IsOptional()
    @IsBoolean()
    updatePermissions?: boolean; // Flag to update permissions when roles change
}
