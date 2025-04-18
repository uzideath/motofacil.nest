import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LoanModule } from './loan/loan.module';
import { UserModule } from './user/user.module';
import { InstallmentModule } from './installment/installment.module';
import { MotorcycleModule } from './motorcycle/motorcycle.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }),
    UserModule, LoanModule, InstallmentModule, MotorcycleModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
