import { Module } from '@nestjs/common';
import { InstallmentService } from './installment.service';
import { InstallmentController } from './installment.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [InstallmentService, PrismaService],
  controllers: [InstallmentController],
})
export class InstallmentModule {}
