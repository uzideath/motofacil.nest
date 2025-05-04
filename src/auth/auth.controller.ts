import {
    Body,
    Controller,
    Post,
    UseGuards,
    Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Roles } from './roles.decorator';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { RegisterDto, LoginDto } from './data/dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly auth: AuthService) { }

    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.auth.register(dto.username, dto.password, dto.roles);
    }

    @Post('login')
    login(@Body() { username, password }: LoginDto) {
        return this.auth.login(username, password);
    }

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Roles('USER', 'ADMIN')
    @Post('me')
    profile(@Request() req) {
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
