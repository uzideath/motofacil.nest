import { Injectable, type OnModuleDestroy } from '@nestjs/common'
import * as JsReport from 'jsreport-core'
import type { CreateReceiptDto } from './dto'
import { templateHtml } from './template'

@Injectable()
export class ReceiptService implements OnModuleDestroy {
  private readonly jr = JsReport()

  private readonly init = this.jr
    .use(require('jsreport-handlebars')())
    .use(require('jsreport-chrome-pdf')({
      launchOptions: {
        executablePath: process.env.CHROME_BIN || '/usr/bin/chromium-browser',
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
      strategy: 'chrome-pool',
      numberOfWorkers: 1,
    }))

    .init()

  async generateReceipt(dto: CreateReceiptDto): Promise<Buffer> {
    await this.init

    const formattedData = {
      ...dto,
      formattedAmount: this.formatCurrency(dto.amount),
      formattedGps: this.formatCurrency(dto.gps || 0),
      formattedTotal: this.formatCurrency((dto.amount || 0) + (dto.gps || 0)),
      formattedDate: this.formatDate(dto.date),
      receiptNumber: this.generateReceiptNumber(dto.identification),
    }

    const { content } = await this.jr.render({
      template: {
        content: templateHtml,
        engine: 'handlebars',
        recipe: 'chrome-pdf',
        chrome: {
          printBackground: true,
          marginTop: '10mm',
          marginBottom: '10mm',
          marginLeft: '10mm',
          marginRight: '10mm',
          format: 'A4',
        }
      },
      data: formattedData,
    } as any)

    return content
  }

  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value)
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('es-DO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  private generateReceiptNumber(id: string): string {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const idPart = id.toString().slice(-4).padStart(4, '0')
    return `${year}${month}${day}-${idPart}`
  }

  async onModuleDestroy() {
    await this.jr.close()
  }
}
