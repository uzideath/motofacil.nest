import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as ExcelJS from 'exceljs';
import { stringify } from 'csv-stringify/sync';
import * as puppeteer from 'puppeteer';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  status?: string;
  search?: string;
}

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  // Loan Reports
  async getLoanReport(filters: ReportFilters) {
    const where: any = {};

    // Date filtering
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    // Status filtering
    if (filters.status && filters.status !== 'all') {
      where.status = filters.status;
    }

    // Search filtering
    if (filters.search) {
      where.OR = [
        { user: { name: { contains: filters.search, mode: 'insensitive' } } },
        { vehicle: { plate: { contains: filters.search, mode: 'insensitive' } } },
      ];
    }

    const loans = await this.prisma.loan.findMany({
      where,
      include: {
        user: { select: { id: true, name: true } },
        vehicle: { select: { id: true, brand: true, model: true, plate: true } },
        payments: {
          select: {
            id: true,
            paymentDate: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary statistics
    const total = loans.length;
    const active = loans.filter((l) => l.status === 'ACTIVE').length;
    const completed = loans.filter((l) => l.status === 'COMPLETED').length;
    const defaulted = loans.filter((l) => l.status === 'DEFAULTED').length;
    const totalAmount = loans.reduce((sum, l) => sum + Number(l.totalAmount), 0);
    const totalInterest = loans.reduce((sum, l) => {
      const principal = Number(l.totalAmount) - Number(l.downPayment);
      const interest = (principal * Number(l.interestRate)) / 100;
      return sum + interest;
    }, 0);

    // Format items for response
    const items = loans.map((loan) => {
      const paidInstallments = loan.paidInstallments;
      const progress = loan.installments > 0 ? (paidInstallments / loan.installments) * 100 : 0;

      return {
        id: loan.id,
        clientName: loan.user.name,
        motorcycle: `${loan.vehicle.brand} ${loan.vehicle.model}`,
        plate: loan.vehicle.plate,
        amount: Number(loan.totalAmount),
        interestRate: Number(loan.interestRate),
        interestType: loan.interestType,
        paymentFrequency: loan.paymentFrequency,
        installments: loan.installments,
        paidInstallments,
        startDate: loan.startDate,
        status: loan.status,
        progress: Math.round(progress),
      };
    });

    return {
      total,
      active,
      completed,
      defaulted,
      totalAmount,
      totalInterest,
      items,
    };
  }

  // Payment Reports
  async getPaymentReport(filters: ReportFilters) {
    const where: any = {};

    // Date filtering
    if (filters.startDate || filters.endDate) {
      where.paymentDate = {};
      if (filters.startDate) where.paymentDate.gte = new Date(filters.startDate);
      if (filters.endDate) where.paymentDate.lte = new Date(filters.endDate);
    }

    // Search filtering
    if (filters.search) {
      where.OR = [
        { loan: { user: { name: { contains: filters.search, mode: 'insensitive' } } } },
      ];
    }

    const payments = await this.prisma.installment.findMany({
      where,
      include: {
        loan: {
          include: {
            user: { select: { id: true, name: true } },
            vehicle: { select: { brand: true, model: true } },
          },
        },
      },
      orderBy: { paymentDate: 'desc' },
    });

    // Calculate summary statistics
    const total = payments.length;
    const onTime = payments.filter((p) => !p.isLate && p.paymentDate).length;
    const late = payments.filter((p) => p.isLate || p.latePaymentDate).length;
    const totalCollected = payments.reduce((sum, p) => sum + Number(p.amount), 0);
    
    // For pending, we'd need to query loans for unpaid installments
    const pendingCollection = 0; // This would require additional logic

    // Format items for response
    const items = payments.map((payment, index) => ({
      id: payment.id,
      loanId: payment.loanId,
      clientName: payment.loan.user.name,
      motorcycle: `${payment.loan.vehicle.brand} ${payment.loan.vehicle.model}`,
      amount: Number(payment.amount),
      dueDate: payment.paymentDate, // Using paymentDate as proxy
      paymentDate: payment.paymentDate,
      status: payment.isLate ? 'LATE' : 'PAID',
      installmentNumber: index + 1, // This is an approximation
    }));

    return {
      total,
      onTime,
      late,
      totalCollected,
      pendingCollection,
      items,
    };
  }

  // Client Reports
  async getClientReport(filters: ReportFilters) {
    const where: any = {};

    // Date filtering
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    // Search filtering
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { identification: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const clients = await this.prisma.user.findMany({
      where,
      include: {
        loans: {
          select: {
            id: true,
            status: true,
            totalAmount: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary statistics
    const total = clients.length;
    const active = clients.filter((c) => c.loans.some((l) => l.status === 'ACTIVE')).length;
    const inactive = clients.filter((c) => !c.loans.some((l) => l.status === 'ACTIVE')).length;
    const withDefaultedLoans = clients.filter((c) => c.loans.some((l) => l.status === 'DEFAULTED')).length;

    // Format items for response
    const items = clients.map((client) => {
      const activeLoans = client.loans.filter((l) => l.status === 'ACTIVE').length;
      const totalLoans = client.loans.length;
      const totalAmount = client.loans.reduce((sum, l) => sum + Number(l.totalAmount), 0);
      const status = activeLoans > 0 ? 'ACTIVE' : 'INACTIVE';

      return {
        id: client.id,
        name: client.name,
        document: client.identification,
        phone: client.phone,
        email: '', // Not available in schema
        address: client.address,
        activeLoans,
        totalLoans,
        totalAmount,
        status,
        joinDate: client.createdAt,
      };
    });

    return {
      total,
      active,
      inactive,
      withDefaultedLoans,
      items,
    };
  }

  // Vehicle Reports
  async getVehicleReport(filters: ReportFilters) {
    const where: any = {};

    // Date filtering
    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    // Search filtering
    if (filters.search) {
      where.OR = [
        { brand: { contains: filters.search, mode: 'insensitive' } },
        { model: { contains: filters.search, mode: 'insensitive' } },
        { plate: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const vehicles = await this.prisma.vehicle.findMany({
      where,
      include: {
        loans: {
          where: { status: 'ACTIVE' },
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate summary statistics
    const total = vehicles.length;
    const financed = vehicles.filter((v) => v.loans.length > 0).length;
    const available = vehicles.filter((v) => v.loans.length === 0).length;
    const totalValue = vehicles.reduce((sum, v) => sum + Number(v.price || 0), 0);

    // Format items for response
    const items = vehicles.map((vehicle) => {
      const activeLoan = vehicle.loans[0];
      
      return {
        id: vehicle.id,
        brand: vehicle.brand,
        model: vehicle.model,
        plate: vehicle.plate,
        color: vehicle.color,
        year: null, // Not available in schema
        price: Number(vehicle.price || 0),
        purchaseDate: vehicle.createdAt,
        status: activeLoan ? 'FINANCED' : 'AVAILABLE',
        clientName: activeLoan ? activeLoan.user.name : null,
      };
    });

    return {
      total,
      financed,
      available,
      totalValue,
      items,
    };
  }

  // Export functionality
  async exportReport(type: string, format: string, filters: ReportFilters) {
    // Get data based on type
    let data: any;
    let filename: string;
    let headers: string[];
    let rows: any[][];

    switch (type) {
      case 'loans':
        const loanReport = await this.getLoanReport(filters);
        data = loanReport.items;
        filename = `loans-report-${new Date().toISOString().split('T')[0]}`;
        headers = ['ID', 'Cliente', 'Vehículo', 'Placa', 'Monto', 'Tasa', 'Cuotas', 'Pagadas', 'Fecha Inicio', 'Estado'];
        rows = data.map((item: any) => [
          item.id,
          item.clientName,
          item.motorcycle,
          item.plate,
          item.amount,
          `${item.interestRate}%`,
          item.installments,
          item.paidInstallments,
          new Date(item.startDate).toLocaleDateString('es-CO'),
          item.status,
        ]);
        break;

      case 'payments':
        const paymentReport = await this.getPaymentReport(filters);
        data = paymentReport.items;
        filename = `payments-report-${new Date().toISOString().split('T')[0]}`;
        headers = ['ID', 'Cliente', 'Vehículo', 'Monto', 'Fecha Vencimiento', 'Fecha Pago', 'Estado', 'Cuota #'];
        rows = data.map((item: any) => [
          item.id,
          item.clientName,
          item.motorcycle,
          item.amount,
          item.dueDate ? new Date(item.dueDate).toLocaleDateString('es-CO') : 'N/A',
          item.paymentDate ? new Date(item.paymentDate).toLocaleDateString('es-CO') : 'N/A',
          item.status,
          item.installmentNumber,
        ]);
        break;

      case 'clients':
        const clientReport = await this.getClientReport(filters);
        data = clientReport.items;
        filename = `clients-report-${new Date().toISOString().split('T')[0]}`;
        headers = ['ID', 'Nombre', 'Documento', 'Teléfono', 'Dirección', 'Préstamos Activos', 'Total Préstamos', 'Monto Total', 'Estado'];
        rows = data.map((item: any) => [
          item.id,
          item.name,
          item.document,
          item.phone,
          item.address,
          item.activeLoans,
          item.totalLoans,
          item.totalAmount,
          item.status,
        ]);
        break;

      case 'vehicles':
        const vehicleReport = await this.getVehicleReport(filters);
        data = vehicleReport.items;
        filename = `vehicles-report-${new Date().toISOString().split('T')[0]}`;
        headers = ['ID', 'Marca', 'Modelo', 'Placa', 'Color', 'Precio', 'Fecha Compra', 'Estado', 'Cliente'];
        rows = data.map((item: any) => [
          item.id,
          item.brand,
          item.model,
          item.plate,
          item.color,
          item.price,
          new Date(item.purchaseDate).toLocaleDateString('es-CO'),
          item.status,
          item.clientName || 'N/A',
        ]);
        break;

      default:
        throw new Error('Invalid report type');
    }

    // Generate file based on format
    switch (format.toLowerCase()) {
      case 'excel':
        return this.generateExcel(filename, headers, rows);
      case 'csv':
        return this.generateCSV(filename, headers, rows);
      case 'pdf':
        return this.generatePDF(filename, headers, rows);
      default:
        throw new Error('Invalid format');
    }
  }

  private async generateExcel(filename: string, headers: string[], rows: any[][]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Reporte');

    // Add headers with styling
    worksheet.addRow(headers);
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3B82F6' },
    };
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    // Add data rows
    rows.forEach(row => worksheet.addRow(row));

    // Auto-fit columns
    worksheet.columns.forEach(column => {
      column.width = 15;
    });

    const buffer = await workbook.xlsx.writeBuffer();

    return {
      buffer: Buffer.from(buffer),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `${filename}.xlsx`,
    };
  }

  private async generateCSV(filename: string, headers: string[], rows: any[][]) {
    const csv = stringify([headers, ...rows], {
      delimiter: ',',
      quoted: true,
    });

    return {
      buffer: Buffer.from(csv, 'utf-8'),
      contentType: 'text/csv',
      filename: `${filename}.csv`,
    };
  }

  private async generatePDF(filename: string, headers: string[], rows: any[][]) {
    // Generate HTML table
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            margin: 20px;
          }
          h1 {
            color: #2563eb;
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
          }
          th {
            background-color: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            border: 1px solid #1e40af;
          }
          td {
            padding: 10px;
            border: 1px solid #ddd;
          }
          tr:nth-child(even) {
            background-color: #f9fafb;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            color: #6b7280;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>${filename.replace(/-/g, ' ').toUpperCase()}</h1>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>
                ${row.map(cell => `<td>${cell || ''}</td>`).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          Generado el ${new Date().toLocaleDateString('es-CO', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </div>
      </body>
      </html>
    `;

    // Use Puppeteer to generate PDF
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        landscape: true,
        margin: {
          top: '20px',
          right: '20px',
          bottom: '20px',
          left: '20px',
        },
        printBackground: true,
      });

      return {
        buffer: Buffer.from(pdfBuffer),
        contentType: 'application/pdf',
        filename: `${filename}.pdf`,
      };
    } finally {
      await browser.close();
    }
  }
}
