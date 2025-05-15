import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as Handlebars from 'handlebars';
import * as puppeteer from 'puppeteer';
import { CreateReceiptDto } from './dto';

@Injectable()
export class ReceiptService {
  async generatePDF(data: CreateReceiptDto): Promise<string> {
    // Cargar plantilla HTML
    const templatePath = path.join(
      __dirname,
      'templates',
      'receipt-template.html',
    );
    const html = fs.readFileSync(templatePath, 'utf8');
    const template = Handlebars.compile(html);

    // Rellenar plantilla con datos
    const filled = template({
      ...data,
      date: new Date().toLocaleDateString('es-CO'),
    });

    // Crear PDF con Puppeteer
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(filled, { waitUntil: 'networkidle0' });

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
    });

    await browser.close();

    // Convertir a base64
    const base64 = Buffer.from(pdfUint8Array).toString('base64');
    return base64;
  }
}
