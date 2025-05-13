import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator'
import { PaymentMethod } from 'generated/prisma'

export class CreateCashRegisterDto {
    @IsNumber()
    cashInRegister: number

    @IsNumber()
    cashFromTransfers: number

    @IsNumber()
    cashFromCards: number

    @IsOptional()
    @IsString()
    notes?: string

    @IsArray()
    installmentIds: string[]
}

export class GetResumenDto {
    @IsOptional()
    @IsDateString()
    date?: string
}
export class GetTransaccionesDto {
    @IsOptional()
    @IsString()
    search?: string

    @IsOptional()
    @IsString()
    type?: 'income' | 'expense' | 'all'
}

export class FilterCashRegisterDto {
    @IsOptional()
    @IsString()
    date?: string // ISO format, ej. '2025-05-13'
}

export class FilterInstallmentsDto {
    @IsOptional()
    @IsString()
    startDate?: string // ISO: "2025-05-01"

    @IsOptional()
    @IsString()
    endDate?: string // ISO: "2025-05-10"

    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod
}

