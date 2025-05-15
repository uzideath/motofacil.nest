import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma.service';
import { ClosingController } from './closing.controller';
import { ClosingService } from './closing.service';

@Module({
  providers: [PrismaService, ClosingService],
  controllers: [ClosingController],
})
export class ClosingModule {}
