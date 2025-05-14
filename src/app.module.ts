import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoanModule } from './loan/loan.module';
import { UserModule } from './user/user.module';
import { InstallmentModule } from './installment/installment.module';
import { MotorcycleModule } from './motorcycle/motorcycle.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { OwnersModule } from './owners/owners.module';
import { ClosingModule } from './closing/closing.module';
import { ExpenseModule } from './expense/expense.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { ReceiptModule } from './receipt/receipt.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }),
    UserModule, LoanModule, InstallmentModule, MotorcycleModule, AuthModule, OwnersModule, ClosingModule, ExpenseModule, CloudinaryModule, ReceiptModule],
  controllers: [AppController],
  providers: [AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule { }
