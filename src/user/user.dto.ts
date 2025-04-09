import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsInt, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    identification: string;

    @IsInt()
    age: number;

    @IsString()
    @IsNotEmpty()
    phone: string;

    @IsString()
    address: string;
}

export class UpdateUserDto extends PartialType(CreateUserDto) { }