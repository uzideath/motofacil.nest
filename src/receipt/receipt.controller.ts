import { Controller, Post, HttpException, HttpStatus, Body, Res } from "@nestjs/common"
import { ReceiptService } from "./receipt.service"
import type { CreateReceiptDto, SendReceiptDto } from "./dto"
import { Response } from "express";

@Controller("receipt")
export class ReceiptController {
  constructor(private readonly receiptService: ReceiptService) { }

  @Post()
  async generate(
    @Body() dto: any,
    @Res({ passthrough: true }) res: Response
  ): Promise<Buffer> {
    console.log("✅ DTO recibido:", dto);
    try {
      const pdfBuffer = await this.receiptService.generateReceipt(dto);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `inline; filename=receipt-${Date.now()}.pdf`
      );

      return pdfBuffer;
    } catch (err) {
      console.error("❌ Error en generación:", err);
      throw new HttpException(
        "No se pudo generar el recibo.",
        HttpStatus.INTERNAL_SERVER_ERROR
      );
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