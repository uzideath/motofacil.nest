import { Module } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { ReceiptController } from './receipt.controller';
import { WhatsappService } from 'src/whatsapp/whatsapp.service';

@Module({
  providers: [WhatsappService, ReceiptService],
  controllers: [ReceiptController],
})
export class ReceiptModule { }
