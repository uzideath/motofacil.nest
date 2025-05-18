import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from 'generated/prisma';
import { PrismaService } from 'src/prisma.service';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  username: string;
  roles: string[];
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) { }

  async validateUser(username: string, pass: string) {
    const user = await this.prisma.owners.findUnique({ where: { username } });
    if (!user) return null;

    const match = await bcrypt.compare(pass, user.passwordHash);
    if (!match) return null;

    const { passwordHash, refreshToken, ...safe } = user;
    return safe;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) throw new UnauthorizedException('Credenciales inválidas');

    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      roles: user.roles as string[],
    };

    const access_token = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    const refresh_token = await this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    const hashedRT = await bcrypt.hash(refresh_token, 10);

    await this.prisma.owners.update({
      where: { id: user.id },
      data: {
        lastAccess: new Date(),
        refreshToken: hashedRT,
      },
    });

    return {
      access_token,
      refresh_token,
      user,
    };
  }

  async register(name: string, username: string, password: string, roles: Role[] = ['USER']) {
    const passwordHash = await bcrypt.hash(password, 10);
    return this.prisma.owners.create({
      data: {
        name,
        username,
        passwordHash,
        roles,
        status: 'ACTIVE',
      },
    });
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;

    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
    } catch (e) {
      throw new ForbiddenException('Refresh token inválido o expirado');
    }

    const user = await this.prisma.owners.findUnique({
      where: { id: payload.sub },
    });

    if (!user || !user.refreshToken) {
      throw new ForbiddenException('Token no registrado');
    }

    const tokenMatches = await bcrypt.compare(refreshToken, user.refreshToken);
    if (!tokenMatches) {
      throw new ForbiddenException('Token inválido');
    }

    // Crear nuevo payload sin 'exp'
    const newPayload: JwtPayload = {
      sub: payload.sub,
      username: payload.username,
      roles: payload.roles,
    };

    // Nuevo access token
    const newAccessToken = await this.jwt.signAsync(newPayload, {
      secret: this.config.get('JWT_ACCESS_SECRET'),
      expiresIn: this.config.get('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    // Nuevo refresh token
    const newRefreshToken = await this.jwt.signAsync(newPayload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    const hashedNewRefreshToken = await bcrypt.hash(newRefreshToken, 10);

    // Guardar nuevo refresh token hasheado
    await this.prisma.owners.update({
      where: { id: payload.sub },
      data: { refreshToken: hashedNewRefreshToken },
    });

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }


  async logout(userId: string) {
    return this.prisma.owners.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }
}
