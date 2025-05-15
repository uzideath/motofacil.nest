import {
  Controller,
  Post,
  Body,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ReceiptService } from './receipt.service';
import { Public } from 'src/auth/decorators/public.decorator';
import { CreateReceiptDto } from './dto';


@Controller('receipt')
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) { }

  @Post()
  async generate(@Body() dto: CreateReceiptDto, @Res() res: Response) {
    try {
      const pdfBuffer = await this.receiptService.generateReceipt(dto);

      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${Date.now()}.pdf"`,
        'Content-Length': pdfBuffer.length,
      });

      res.send(pdfBuffer);
    } catch (err) {
      console.log(err)
      throw new HttpException(
        'No se pudo generar el recibo.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
