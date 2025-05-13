import {
    Body,
    Controller,
    Post,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { RegisterDto, LoginDto } from './data/dto';
import { Request as Req } from 'express';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @Public()
    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.auth.register(dto.username, dto.password, dto.roles);
    }

    @Post('login')
    @Public()
    login(@Body() { username, password }: LoginDto) {
        return this.auth.login(username, password);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('USER', 'ADMIN')
    @Post('me')
    profile(@Request() req: Req) {
        return req.user;
    }

    // Example admin-only route
    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('ADMIN')
    @Post('admin-action')
    adminAction() {
        return { ok: true, msg: 'You’re an admin!' };
    }
}
