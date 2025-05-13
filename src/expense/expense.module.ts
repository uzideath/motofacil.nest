import { Module } from '@nestjs/common';
import { ExpenseService } from './expense.service';
import { ExpenseController } from './expense.controller';
import { PrismaService } from 'src/prisma.service';

@Module({
    providers: [PrismaService, ExpenseService],
    controllers: [ExpenseController]
})
export class ExpenseModule { }
