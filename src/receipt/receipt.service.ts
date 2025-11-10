import { Injectable } from "@nestjs/common"
import * as puppeteer from "puppeteer"
import type { CreateReceiptDto } from "./dto"
import { templateHtml } from "./template"
import { WhatsappService } from "../whatsapp/whatsapp.service"
import { PrismaService } from "../prisma/prisma.service"
import { format, utcToZonedTime } from "date-fns-tz"
import { es } from "date-fns/locale"

@Injectable()
export class ReceiptService {
  constructor(
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService
  ) { }

  async generateReceipt(dto: any): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    })

    const page = await browser.newPage()
    const html = await this.fillTemplate(dto)

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

  private async fillTemplate(dto: CreateReceiptDto): Promise<string> {
    console.log("paymentDate en DTO:", dto.paymentDate);
    console.log("isLate:", dto.isLate);
    console.log("latePaymentDate:", dto.latePaymentDate);
    console.log("storeId received:", dto.storeId);
    
    // Fetch store information if storeId is provided
    let storeName = "MotoFácil";
    let storeNit = "";
    
    if (dto.storeId) {
      try {
        const store = await this.prisma.store.findUnique({
          where: { id: dto.storeId },
          select: { name: true, nit: true }
        });
        
        if (store) {
          storeName = store.name;
          storeNit = store.nit;
          console.log("Store found:", { name: storeName, nit: storeNit });
        } else {
          console.log("Store not found for ID:", dto.storeId);
        }
      } catch (error) {
        console.error("Error fetching store information:", error);
      }
    } else {
      console.log("No storeId provided in DTO");
    }
    
    // Determine the correct date to show:
    // - For late payments: use latePaymentDate (original due date)
    // - For on-time payments: use paymentDate (actual payment date)
    const displayDate = dto.isLate && dto.latePaymentDate 
      ? new Date(dto.latePaymentDate)
      : new Date(dto.paymentDate);

    // Calculate days since last payment (excluding Sundays)
    const daysSinceLastPayment = dto.lastPaymentDate 
      ? this.calculateDaysSinceLastPayment(dto.lastPaymentDate)
      : (dto.daysSinceLastPayment ?? null);

    // Format payment status information with fractional installments
    let paymentStatus = "";
    if (dto.remainingInstallments !== undefined && dto.paidInstallments !== undefined) {
      const totalInstallments = dto.totalInstallments || (dto.paidInstallments + dto.remainingInstallments);
      const paidFormatted = dto.paidInstallments % 1 === 0 
        ? dto.paidInstallments.toString() 
        : dto.paidInstallments.toFixed(2);
      const remainingFormatted = dto.remainingInstallments % 1 === 0 
        ? dto.remainingInstallments.toString() 
        : dto.remainingInstallments.toFixed(2);
      const totalFormatted = totalInstallments % 1 === 0 
        ? totalInstallments.toString() 
        : totalInstallments.toFixed(2);
      
      paymentStatus = `Cuotas pagadas: ${paidFormatted} de ${totalFormatted} | Cuotas pendientes: ${remainingFormatted}`;
      
      // Add debt breakdown if there's a partial installment
      if (dto.remainingInstallments < 1 && dto.remainingInstallments > 0) {
        const installmentAmount = dto.amount / (1 - dto.remainingInstallments); // Estimate installment amount
        const partialDebt = installmentAmount * dto.remainingInstallments;
        paymentStatus += ` | Deuda parcial: ${this.formatCurrency(partialDebt)}`;
      }
    }

    // Add days since last payment status
    let paymentDaysStatus = "";
    if (daysSinceLastPayment !== null) {
      if (daysSinceLastPayment === 0) {
        paymentDaysStatus = "Estado: Al día";
      } else if (daysSinceLastPayment === 1) {
        paymentDaysStatus = "Estado: Vence hoy";
      } else {
        paymentDaysStatus = `Estado: ${daysSinceLastPayment} días atrasado`;
      }
    }

    const data = {
      ...dto,
      storeName,
      storeNit,
      formattedAmount: this.formatCurrency(dto.amount),
      formattedGps: this.formatCurrency(dto.gps || 0),
      formattedTotal: this.formatCurrency((dto.amount || 0) + (dto.gps || 0)),
      formattedDate: this.formatDate(dto.date),
      receiptNumber: this.generateReceiptNumber(dto.receiptNumber),
      concept: dto.concept || "Servicio de transporte",
      formattedPaymentDate: this.formatDateOnly(displayDate), // Show closing date (latePaymentDate for late, paymentDate for on-time)
      formattedGeneratedDate: this.formatDate(new Date()), // Generated date (with time)
      notes: dto.notes || "Sin observaciones adicionales.",
      paymentStatus, // Add payment status string
      paymentDaysStatus, // Add days since last payment status
      daysSinceLastPayment: daysSinceLastPayment ?? 0, // Raw days count
    };

    return templateHtml
      .replace(/{{storeName}}/g, data.storeName)
      .replace(/{{storeNit}}/g, data.storeNit)
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
      .replace(/{{paymentStatus}}/g, data.paymentStatus)
      .replace(/{{paymentDaysStatus}}/g, data.paymentDaysStatus)
      .replace(/{{daysSinceLastPayment}}/g, String(data.daysSinceLastPayment)) 
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

  private calculateDaysSinceLastPayment(lastPaymentDate: string | Date): number {
    const timeZone = "America/Bogota"
    
    // Convert last payment date to Colombian timezone
    const lastPayment = typeof lastPaymentDate === "string" 
      ? new Date(lastPaymentDate) 
      : lastPaymentDate
    const start = utcToZonedTime(lastPayment, timeZone)
    
    // Get current date in Colombian timezone
    const now = new Date()
    const end = utcToZonedTime(now, timeZone)
    
    // Normalize to start of day for both dates
    const startDay = new Date(start.getFullYear(), start.getMonth(), start.getDate())
    const endDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
    
    let count = 0
    const cursor = new Date(startDay)
    
    while (cursor <= endDay) {
      // getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
      if (cursor.getDay() !== 0) {
        count++
      }
      cursor.setDate(cursor.getDate() + 1)
    }
    
    // Convert inclusive day count into a non-inclusive difference
    return Math.max(0, count - 1)
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
