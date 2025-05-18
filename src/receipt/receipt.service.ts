import { Injectable } from "@nestjs/common"
import * as puppeteer from "puppeteer"
import type { CreateReceiptDto } from "./dto"
import { templateHtml } from "./template"
import { WhatsappService } from "../whatsapp/whatsapp.service"
import * as fs from "fs"
import * as path from "path"

@Injectable()
export class ReceiptService {
  constructor(private readonly whatsappService: WhatsappService) { }

  async generateReceipt(dto: CreateReceiptDto): Promise<Buffer> {
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
    const paymentDate = dto.latePaymentDate ? new Date(dto.latePaymentDate) : new Date()

    const data = {
      ...dto,
      formattedAmount: this.formatCurrency(dto.amount),
      formattedGps: this.formatCurrency(dto.gps || 0),
      formattedTotal: this.formatCurrency((dto.amount || 0) + (dto.gps || 0)),
      formattedDate: this.formatDate(dto.date),
      receiptNumber: this.generateReceiptNumber(dto.receiptNumber),
      concept: dto.concept || "Servicio de transporte",
      formattedPaymentDate: this.formatDate(paymentDate),
      formattedGeneratedDate: this.formatDate(new Date()),
    }

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
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput
    return new Intl.DateTimeFormat("es-DO", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date)
  }

  private generateReceiptNumber(uuid: string): string {
    const cleanId = uuid.replace(/-/g, "")
    const lastFive = cleanId.slice(-5)
    return lastFive.toUpperCase()
  }

  async sendReceiptViaWhatsapp(
    phoneNumber: string,
    dto: CreateReceiptDto,
    caption?: string,
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Generate the receipt PDF using your existing method
      const pdfBuffer = await this.generateReceipt(dto)

      // Create a temporary file to store the PDF
      const tempDir = "temp"
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true })
      }

      // Generate a unique filename
      const filename = `receipt-${Date.now()}.pdf`
      const filePath = path.join(tempDir, filename)

      // Write the PDF buffer to the file
      fs.writeFileSync(filePath, pdfBuffer)

      // Default caption if none provided
      const defaultCaption = `Recibo #${this.generateReceiptNumber(dto.receiptNumber)}`

      // Send the PDF as an attachment via WhatsApp
      const result = await this.whatsappService.sendAttachment(phoneNumber, filePath, caption || defaultCaption)

      // Clean up the temporary file
      fs.unlinkSync(filePath)

      return result
    } catch (error) {
      return {
        success: false,
        error: `Failed to send receipt via WhatsApp: ${error.message}`,
      }
    }
  }
}
