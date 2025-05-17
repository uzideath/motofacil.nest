import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  IsDateString,
} from 'class-validator';
import { ExpenseCategory, PaymentMethod, Providers } from 'generated/prisma';

export class CreateExpenseDto {
  @IsNumber()
  amount: number;

  @IsDateString()
  date: string;

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  beneficiary: string;

  @IsString()
  @IsOptional()
  reference?: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  provider: Providers;

  @IsString()
  @IsOptional()
  attachmentUrl?: string

  @IsUUID()
  @IsOptional()
  cashRegisterId: string;

  @IsUUID()
  createdById: string;
}

export class FindExpenseFiltersDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
