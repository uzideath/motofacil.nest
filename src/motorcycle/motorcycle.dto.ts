import { PartialType } from '@nestjs/mapped-types';
import { IsString } from 'class-validator';

export class CreateMotorcycleDto {
    @IsString()
    brand: string;

    @IsString()
    model: string;

    @IsString()
    plate: string;
}

export class UpdateMotorcycleDto extends PartialType(CreateMotorcycleDto) {}