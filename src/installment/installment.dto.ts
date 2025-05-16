import { PartialType } from '@nestjs/mapped-types';
import {
  IsUUID,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsString,
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

  @IsUUID()
  @IsOptional()
  createdById?: string;
}

export class UpdateInstallmentDto extends PartialType(CreateInstallmentDto) { }
