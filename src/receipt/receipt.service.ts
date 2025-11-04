import { Injectable } from "@nestjs/common"
import * as puppeteer from "puppeteer"
import type { CreateReceiptDto } from "./dto"
import { templateHtml } from "./template"
import { WhatsappService } from "../whatsapp/whatsapp.service"
import { format, utcToZonedTime } from "date-fns-tz"
import { es } from "date-fns/locale"

@Injectable()
export class ReceiptService {
  constructor(private readonly whatsappService: WhatsappService) { }

  async generateReceipt(dto: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()
    const html = this.fillTemplate(dto)

    await page.setContent(html, { waitUntil: "networkidle0" })

    const pdfBuffer = await page.pdf({
      width: "80mm",
      printBackground: true,
      margin: { top: "5mm", bottom: "5mm", left: "5mm", right: "5mm" },
      preferCSSPageSize: true,
    })


    await browser.close()
    return Buffer.from(pdfBuffer)
  }

  private fillTemplate(dto: CreateReceiptDto): string {
    console.log("paymentDate en DTO:", dto.paymentDate);
    console.log("isLate:", dto.isLate);
    console.log("latePaymentDate:", dto.latePaymentDate);
    
    // Determine the correct date to show:
    // - For late payments: use latePaymentDate (original due date)
    // - For on-time payments: use paymentDate (actual payment date)
    const displayDate = dto.isLate && dto.latePaymentDate 
      ? new Date(dto.latePaymentDate)
      : new Date(dto.paymentDate);

    const data = {
      ...dto,
      formattedAmount: this.formatCurrency(dto.amount),
      formattedGps: this.formatCurrency(dto.gps || 0),
      formattedTotal: this.formatCurrency((dto.amount || 0) + (dto.gps || 0)),
      formattedDate: this.formatDate(dto.date),
      receiptNumber: this.generateReceiptNumber(dto.receiptNumber),
      concept: dto.concept || "Servicio de transporte",
      formattedPaymentDate: this.formatDateOnly(displayDate), // Show closing date (latePaymentDate for late, paymentDate for on-time)
      formattedGeneratedDate: this.formatDate(new Date()), // Generated date (with time)
      notes: dto.notes || "Sin observaciones adicionales." 
    };

    return templateHtml
      .replace(/{{name}}/g, data.name)
      .replace(/{{identification}}/g, data.identification)
      .replace(/{{concept}}/g, data.concept)
      .replace(/{{formattedAmount}}/g, data.formattedAmount)
      .replace(/{{formattedGps}}/g, data.formattedGps)
      .replace(/{{formattedTotal}}/g, data.formattedTotal)
      .replace(/{{formattedDate}}/g, data.formattedDate)
      .replace(/{{receiptNumber}}/g, data.receiptNumber)
      .replace(/{{paymentDate}}/g, data.formattedPaymentDate)
      .replace(/{{generatedDate}}/g, data.formattedGeneratedDate)
      .replace(/{{notes}}/g, data.notes) 
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(value)
  }

  private formatDate(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return "—"
    const timeZone = "America/Bogota"

    const raw = typeof dateInput === "string" ? dateInput : dateInput.toISOString()
    const utcDate = new Date(raw.endsWith("Z") ? raw : `${raw}Z`)
    const zoned = utcToZonedTime(utcDate, timeZone)

    return format(zoned, "dd 'de' MMMM 'de' yyyy, hh:mm aaaa", { timeZone })
  }

  private formatDateOnly(dateInput: string | Date | null | undefined): string {
    if (!dateInput) return "—"
    
    // Parse UTC date and format as date only (no time, no timezone conversion)
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth()
    const day = date.getUTCDate()
    
    // Create a local date with the UTC components to avoid timezone shift
    const localDate = new Date(year, month, day)
    
    return format(localDate, "dd 'de' MMMM 'de' yyyy", { locale: es })
  }



  private generateReceiptNumber(uuid: string): string {
    const cleanId = uuid.replace(/-/g, "")
    const lastFive = cleanId.slice(-5)
    return lastFive.toUpperCase()
  }

  async sendReceiptViaWhatsapp(
    storeId: string,
    phoneNumber: string,
    dto: CreateReceiptDto,
    caption?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const pdfBuffer = await this.generateReceipt(dto)

      // Always send as PDF with fixed caption and filename
      const fileName = `Recibo_${this.generateReceiptNumber(dto.receiptNumber)}.pdf`
      const base64 = pdfBuffer.toString("base64")

      return await this.whatsappService.sendMediaBase64(storeId, {
        number: phoneNumber,
        mediatype: "document",
        mimetype: "application/pdf",
        caption: caption || `Recibo #${this.generateReceiptNumber(dto.receiptNumber)}`,
        media: base64,
        fileName,
      })
    } catch (error) {
      return {
        success: false,
        error: `Failed to send receipt via WhatsApp: ${error.message}`,
      }
    }
  }
}
