import { IsString, IsNumber, IsDateString, IsOptional, IsNotEmpty, Matches } from 'class-validator';

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

export class SendReceiptWhatsappDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "Phone number must be between 10 and 15 digits, optionally starting with +",
  })
  phoneNumber: string

  @IsNotEmpty()
  receipt: CreateReceiptDto

  @IsOptional()
  @IsString()
  message?: string
}

export class SendReceiptDto extends CreateReceiptDto {
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: "Phone number must be between 10 and 15 digits, optionally starting with +",
  })
  phoneNumber: string

  @IsOptional()
  @IsString()
  caption?: string
}
