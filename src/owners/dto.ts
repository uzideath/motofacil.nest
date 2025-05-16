import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional } from 'class-validator';

export class CreateOwnerDto {
    @IsString()
    name: string;

    @IsString()
    username: string;

    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    status?: string;
}

export class UpdateOwnerDto extends PartialType(CreateOwnerDto) { }