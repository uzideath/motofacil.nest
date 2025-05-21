import { Controller, Post, HttpException, HttpStatus, Body, Res, Header } from "@nestjs/common"
import { ReceiptService } from "./receipt.service"
import type { CreateReceiptDto, SendReceiptDto } from "./dto"
import { Response } from "express";

@Controller("receipt")
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) { }

  @Post()
  @Header('Content-Type', 'application/pdf')
  @Header('Content-Disposition', `inline; filename=receipt.pdf`)
  async generate(@Body() dto: CreateReceiptDto): Promise<Buffer> {
    return this.receiptService.generateReceipt(dto)
  }


  @Post("whatsapp")
  async sendViaWhatsapp(@Body() dto: SendReceiptDto) {
    try {
      const { phoneNumber, caption, ...receiptData } = dto;

      // Generate and send the PDF receipt as an attachment via WhatsApp
      const result = await this.receiptService.sendReceiptViaWhatsapp(
        phoneNumber,
        receiptData,
        caption
      );

      if (!result.success) {
        throw new HttpException(
          result.error || "No se pudo enviar el recibo por WhatsApp.",
          HttpStatus.INTERNAL_SERVER_ERROR
        );
      }

      return {
        success: true,
        messageId: result.messageId,
        message: "Recibo PDF enviado exitosamente como adjunto por WhatsApp.",
      };
    } catch (err) {
      console.log(err);
      throw new HttpException(
        "No se pudo enviar el recibo por WhatsApp.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}