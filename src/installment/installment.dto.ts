import { PartialType } from '@nestjs/mapped-types';
import { IsUUID, IsNumber, IsOptional, IsBoolean } from 'class-validator';

export class CreateInstallmentDto {
    @IsUUID()
    loanId: string;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsBoolean()
    isLate?: boolean;
}

export class UpdateInstallmentDto extends PartialType(CreateInstallmentDto) { }