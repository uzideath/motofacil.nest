import { PartialType } from '@nestjs/mapped-types';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
  IsDateString,
} from 'class-validator';
import { PaymentMethod } from 'generated/prisma';

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
  PaymentDate?: string;

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
}

export class UpdateInstallmentDto extends PartialType(CreateInstallmentDto) { }
