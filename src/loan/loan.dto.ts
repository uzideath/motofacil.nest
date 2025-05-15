import { PartialType } from '@nestjs/mapped-types';
import {
  IsUUID,
  IsNumber,
  IsInt,
  IsEnum,
  Min,
  IsPositive,
  IsOptional,
} from 'class-validator';

export enum InterestType {
  FIXED = 'FIXED',
  COMPOUND = 'COMPOUND',
}

export enum PaymentFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  BIWEEKLY = 'BIWEEKLY',
  MONTHLY = 'MONTHLY',
}

export class CreateLoanDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  motorcycleId: string;

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsNumber()
  @Min(0)
  downPayment: number;

  @IsInt()
  @Min(1)
  installments: number;

  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsEnum(InterestType)
  @IsOptional()
  interestType?: InterestType;

  @IsEnum(PaymentFrequency)
  @IsOptional()
  paymentFrequency?: PaymentFrequency;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  installmentPaymentAmmount?: number;
}

export class UpdateLoanDto extends PartialType(CreateLoanDto) {}
