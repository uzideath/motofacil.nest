import { Role } from 'generated/prisma';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  ArrayNotEmpty,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';

class LoginDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}

class RegisterDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Role, { each: true })
  @Type(() => String) // Optional: ensures each value is treated as a string
  roles?: Role[];
}

export { LoginDto, RegisterDto };
