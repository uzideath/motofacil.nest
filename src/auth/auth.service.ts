import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from 'generated/prisma';
import { PrismaService } from 'src/prisma.service';


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
    ) { }

    async validateUser(username: string, pass: string) {
        const user = await this.prisma.owners.findUnique({ where: { username } });
        if (!user) return null;
        const match = await bcrypt.compare(pass, user.passwordHash);
        if (!match) return null;
        const { passwordHash, ...safe } = user;
        return safe;
    }

    async login(username: string, password: string) {
        const user = await this.validateUser(username, password);
        if (!user) throw new UnauthorizedException('Invalid credentials');

        const payload: JwtPayload = {
            sub: user.id,
            username: user.username,
            roles: user.roles as string[],
        };
        return {
            access_token: await this.jwt.signAsync(payload),
            user,
        };
    }

    async register(
        username: string,
        password: string,
        roles: Role[] = ['USER'],
    ) {
        const salt = await bcrypt.genSalt();
        const passwordHash = await bcrypt.hash(password, salt);
        return this.prisma.owners.create({
            data: { username, passwordHash, roles },
        });
    }
}
