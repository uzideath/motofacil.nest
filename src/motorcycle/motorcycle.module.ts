import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { MotorcycleController } from './motorcycle.controller';
import { MotorcycleService } from './motorcycle.service';

@Module({
    controllers: [MotorcycleController],
    providers: [MotorcycleService, PrismaService],
})
export class MotorcycleModule { }
