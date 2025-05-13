import {
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    IsUUID,
    IsArray,
    IsDateString,
} from 'class-validator'
import { ExpenseCategory, PaymentMethod } from 'generated/prisma'


export class CreateExpenseDto {
    @IsNumber()
    amount: number

    @IsDateString()
    date: string

    @IsEnum(ExpenseCategory)
    category: ExpenseCategory

    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod

    @IsString()
    @IsNotEmpty()
    beneficiary: string

    @IsString()
    @IsOptional()
    reference?: string

    @IsString()
    @IsNotEmpty()
    description: string

    @IsArray()
    @IsOptional()
    attachments?: string[] // links o nombres de archivos

    @IsUUID()
    @IsOptional()
    cashRegisterId: string
}
