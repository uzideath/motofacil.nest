import { Module } from '@nestjs/common';
import { OwnersService } from './owners.service';
import { OwnersController } from './owners.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
  providers: [PrismaService, OwnersService],
  controllers: [OwnersController]
})
export class OwnersModule { }
