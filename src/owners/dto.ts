import { IsString, IsOptional } from 'class-validator';

export class CreateOwnerDto {
    @IsString()
    username: string;

    @IsString()
    password: string;

    @IsOptional()
    @IsString()
    status?: string;
}
