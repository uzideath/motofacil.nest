import { Type } from "class-transformer"
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator"
import { ExpenseCategory, PaymentMethod } from "generated/prisma"

export class OwnerDto {
  @IsUUID()
  id: string

  @IsString()
  username: string
}

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

  @IsUUID()
  providerId: string 

  @IsArray()
  @IsUUID("all", { each: true })
  installmentIds: string[]

  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  expenseIds?: string[]

  @IsUUID()
  createdById: string

  @IsOptional()
  @IsDateString()
  date?: string
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
  type?: "income" | "expense" | "all"
}

export class FilterCashRegisterDto {
  @IsOptional()
  @IsString()
  date?: string // ISO format, ej. '2025-05-13'
}

export class FilterInstallmentsDto {
  @IsOptional()
  @IsString()
  startDate?: string

  @IsOptional()
  @IsString()
  endDate?: string

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod
}

export class FindOneCashRegisterResponseDto {
  @IsUUID()
  id: string

  @IsDateString()
  date: string

  @IsNumber()
  cashInRegister: number

  @IsNumber()
  cashFromTransfers: number

  @IsNumber()
  cashFromCards: number

  @IsOptional()
  @IsString()
  notes?: string

  @IsDateString()
  createdAt: string

  @IsDateString()
  updatedAt: string

  @ValidateNested()
  @Type(() => OwnerDto)
  @IsOptional()
  createdBy?: OwnerDto

  @ValidateNested({ each: true })
  @Type(() => CashRegisterInstallmentDto)
  payments: CashRegisterInstallmentDto[]

  @ValidateNested({ each: true })
  @Type(() => CashRegisterExpenseDto)
  expense: CashRegisterExpenseDto[]
}

export class UserDto {
  @IsUUID()
  id: string

  @IsString()
  name: string
}

export class MotorcycleDto {
  @IsUUID()
  id: string

  @IsString()
  plate: string
}

export class LoanDto {
  @ValidateNested()
  @Type(() => UserDto)
  user: UserDto

  @ValidateNested()
  @Type(() => MotorcycleDto)
  motorcycle: MotorcycleDto
}

export class CashRegisterInstallmentDto {
  @IsUUID()
  id: string

  @IsNumber()
  amount: number

  @IsNumber()
  totalAmount: number

  @IsNumber()
  gpsAmount: number

  @IsDateString()
  paymentDate: string

  @ValidateNested()
  @Type(() => LoanDto)
  loan: LoanDto

  @ValidateNested()
  @Type(() => OwnerDto)
  @IsOptional()
  createdBy?: OwnerDto
}

export class CashRegisterExpenseDto {
  @IsUUID()
  id: string

  @IsNumber()
  amount: number

  @IsDateString()
  date: string

  @IsEnum(ExpenseCategory)
  category: ExpenseCategory

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod

  @IsString()
  beneficiary: string

  @IsString()
  @IsOptional()
  reference?: string

  @IsString()
  description: string

  @IsArray()
  @IsOptional()
  attachmentUrl?: string

  @IsDateString()
  createdAt: string

  @IsDateString()
  updatedAt: string

  @ValidateNested()
  @Type(() => OwnerDto)
  @IsOptional()
  createdBy?: OwnerDto
}

export class PrintClosingDto {
  @IsUUID()
  id: string
}
