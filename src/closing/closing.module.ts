import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ClosingController } from './closing.controller';

@Module({
    providers: [PrismaService],
    controllers: [ClosingController]
})
export class ClosingModule { }
