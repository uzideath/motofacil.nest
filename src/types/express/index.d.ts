import { JwtPayload } from 'src/auth/auth.service';

declare module 'express' {
    interface Request {
        user: JwtPayload; // o puedes extender con más campos si tu JWT incluye más
    }
}
