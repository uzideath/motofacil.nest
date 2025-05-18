import { Controller, Post, HttpException, HttpStatus, Body } from "@nestjs/common"
import { ReceiptService } from "./receipt.service"
import type { CreateReceiptDto, SendReceiptDto } from "./dto"

@Controller("receipt")
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) { }

  @Post()
  async generate(@Body() dto: CreateReceiptDto) {
    try {
      const pdfBuffer = await this.receiptService.generateReceipt(dto)

      return pdfBuffer
    } catch (err) {
      console.log(err)
      throw new HttpException("No se pudo generar el recibo.", HttpStatus.INTERNAL_SERVER_ERROR)
    }
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
