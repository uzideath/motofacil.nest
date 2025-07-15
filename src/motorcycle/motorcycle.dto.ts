import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateMotorcycleDto {
  @IsUUID()
  providerId: string; // 👈 relación con Provider

  @IsString()
  brand: string;

  @IsString()
  model: string;

  @IsString()
  plate: string;

  @IsString()
  engine: string;

  @IsString()
  chassis: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsNumber()
  cc?: number;

  @IsOptional()
  @IsNumber()
  gps?: number;
}

export class UpdateMotorcycleDto extends PartialType(CreateMotorcycleDto) { }
