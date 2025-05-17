import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsString } from 'class-validator';

export class CreateMotorcycleDto {
  @IsString()
  provider: string;

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

  @IsString()
  color: string;

  @IsNumber()
  cc: number;

  @IsNumber()
  gps: number;
}

export class UpdateMotorcycleDto extends PartialType(CreateMotorcycleDto) { }
