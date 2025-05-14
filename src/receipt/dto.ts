import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateReceiptDto {
    @IsString()
    @IsNotEmpty()
    customerName: string;

    @IsString()
    @IsNotEmpty()
    customerId: string;

    @IsString()
    @IsNotEmpty()
    concept: string;

    @IsNumber()
    total: number;
}
