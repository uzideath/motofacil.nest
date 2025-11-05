import { Module } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { ReceiptController } from './receipt.controller';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [WhatsappModule, PrismaModule],
  providers: [ReceiptService],
  controllers: [ReceiptController],
})
export class ReceiptModule { }
