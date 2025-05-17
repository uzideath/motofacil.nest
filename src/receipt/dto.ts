import { IsString, IsNumber, IsDateString, IsOptional } from 'class-validator';

export class CreateReceiptDto {
  @IsString()
  name: string;

  @IsString()
  identification: string;

  @IsString()
  concept: string;

  @IsNumber()
  amount: number;

  @IsNumber()
  gps: number

  @IsNumber()
  total: number;

  @IsDateString()
  date: string;

  @IsDateString()
  @IsOptional()
  latePaymentDate?: string;

  @IsString()
  receiptNumber: string;
}
