import { Controller, Post, Body } from '@nestjs/common';
import { ReceiptService } from './receipt.service';
import { CreateReceiptDto } from './dto';

@Controller('receipt')
export class ReceiptController {
    constructor(private readonly receiptService: ReceiptService) { }

    @Post()
    async createReceipt(@Body() dto: CreateReceiptDto) {
        const base64 = await this.receiptService.generatePDF(dto);

        return {
            filename: 'recibo.pdf',
            mimeType: 'application/pdf',
            base64,
        };
    }
}
