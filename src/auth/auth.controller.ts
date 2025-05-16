import {
  Body,
  Controller,
  Post,
  UseGuards,
  Request,
  ForbiddenException,
  Get,
  Param,
} from '@nestjs/common';
import { AuthService, JwtPayload } from './auth.service';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt.guard';
import { RolesGuard } from './guards/roles.guard';
import { RegisterDto, LoginDto } from './data/dto';
import { Request as Req } from 'express';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/user';
import { CurrentRole } from './decorators/role';
import { IsOwner } from './decorators/owner';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) { }


  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto.name, dto.username, dto.password, dto.roles);
  }

  @Public()
  @Post('login')
  login(@Body() { username, password }: LoginDto) {
    return this.auth.login(username, password);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('USER', 'ADMIN')
  @Post('me')
  profile(@Request() req: Req) {
    return req.user;
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() body: { refresh_token: string }) {
    if (!body.refresh_token) {
      throw new ForbiddenException('Refresh token requerido');
    }
    return this.auth.refresh(body.refresh_token);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@CurrentUser() user: JwtPayload) {
    return this.auth.logout(user.sub);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('admin-action')
  adminAction() {
    return { ok: true, msg: 'You’re an admin!' };
  }

  @Post('test-role')
  @UseGuards(JwtAuthGuard)
  testRole(@CurrentRole() role: string) {
    return { role };
  }

  @Get('profile/:id')
  @UseGuards(JwtAuthGuard)
  @IsOwner('id')
  getProfile(@Param('id') id: string) {
    return { msg: `Accediendo al perfil del owner ${id}` };
  }
}
