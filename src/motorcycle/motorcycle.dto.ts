import { PartialType } from '@nestjs/mapped-types';
import { IsNumber, IsString } from 'class-validator';

export class CreateMotorcycleDto {
    @IsString()
    brand: string;

    @IsString()
    model: string;

    @IsString()
    plate: string;

    @IsString()
    color: string

    @IsNumber()
    cc: number
}

export class UpdateMotorcycleDto extends PartialType(CreateMotorcycleDto) { }