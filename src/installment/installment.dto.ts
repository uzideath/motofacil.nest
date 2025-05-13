import { PartialType } from '@nestjs/mapped-types';
import { IsUUID, IsNumber, IsOptional, IsBoolean, IsString } from 'class-validator';
import { PaymentMethod } from 'generated/prisma';

export class CreateInstallmentDto {
    @IsUUID()
    loanId: string;

    @IsNumber()
    amount: number;

    @IsString()
    paymentMethod: PaymentMethod;

    @IsOptional()
    @IsBoolean()
    isLate?: boolean;
}

export class UpdateInstallmentDto extends PartialType(CreateInstallmentDto) { }