import { PartialType } from '@nestjs/mapped-types';
import { IsUUID, IsNumber, IsInt, Min } from 'class-validator';

export class CreateLoanDto {
    @IsUUID()
    userId: string;

    @IsUUID()
    motorcycleId: string;

    @IsNumber()
    @Min(0)
    totalAmount: number;

    @IsInt()
    @Min(1)
    installments: number;
}

export class UpdateLoanDto extends PartialType(CreateLoanDto) { }