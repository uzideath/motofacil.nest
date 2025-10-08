import { PartialType } from '@nestjs/mapped-types';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { PaymentMethod, VehicleType } from 'generated/prisma';
import { Type } from 'class-transformer';

export class CreateInstallmentDto {
  @IsUUID()
  loanId: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  gps: number;

  @IsString()
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  isLate?: boolean;

  @IsOptional()
  @IsDateString()
  latePaymentDate?: string;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  attachmentUrl?: string;

  @IsUUID()
  @IsOptional()
  createdById?: string;
}

export class FindInstallmentFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  loanId?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isLate?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  maxAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}

export class UpdateInstallmentDto extends PartialType(CreateInstallmentDto) { }
