export const templateHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Payment Receipt</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
          
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
            color: #333;
            line-height: 1.5;
            background-color: #fff;
          }
          
          .receipt {
            max-width: 800px;
            margin: 0 auto;
            padding: 40px;
            border: 1px solid #e0e0e0;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            border-radius: 8px;
          }
          
          .receipt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f0f0f0;
          }
          
          .logo-container {
            display: flex;
            align-items: center;
          }
          
          .logo {
            width: 120px;
            height: auto;
          }
          
          .company-name {
            margin-left: 15px;
            font-size: 24px;
            font-weight: 700;
            color:rgb(98, 98, 98);
          }
          
          .receipt-title {
            text-align: right;
            font-size: 28px;
            font-weight: 700;
            color:rgb(98, 98, 98);
            margin-bottom: 5px;
          }
          
          .receipt-number {
            text-align: right;
            font-size: 14px;
            color: #666;
          }
          
          .receipt-date {
            text-align: right;
            font-size: 14px;
            color: #666;
            margin-top: 5px;
          }
          
          .receipt-info {
            margin-bottom: 30px;
          }
          
          .receipt-info-title {
            font-size: 16px;
            font-weight: 600;
            color: #555;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
          }
          
          .customer-details {
            background-color: #f9fafb;
            padding: 20px;
            border-radius: 6px;
            margin-bottom: 30px;
          }
          
          .customer-name {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 5px;
          }
          
          .customer-id {
            font-size: 14px;
            color: #666;
          }
          
          .payment-details {
            margin-bottom: 30px;
          }
          
          .payment-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          
          .payment-table th {
            background-color: #f0f7ff;
            color:rgb(98, 98, 98);
            font-weight: 600;
            text-align: left;
            padding: 12px 15px;
            border-bottom: 2px solid #e0e0e0;
          }
          
          .payment-table td {
            padding: 12px 15px;
            border-bottom: 1px solid #e0e0e0;
          }
          
          .payment-table tr:last-child td {
            border-bottom: none;
          }
          
          .payment-concept {
            font-weight: 500;
            color: #333;
          }
          
          .payment-amount {
            font-weight: 600;
            text-align: right;
            color:rgb(98, 98, 98);
          }
          
          .receipt-total {
            display: flex;
            justify-content: flex-end;
            margin-top: 20px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
          }
          
          .total-container {
            background-color: #f0f7ff;
            padding: 15px 25px;
            border-radius: 6px;
            text-align: right;
            min-width: 200px;
          }
          
          .total-label {
            font-size: 16px;
            font-weight: 600;
            color: #555;
            margin-bottom: 5px;
          }
          
          .total-amount {
            font-size: 24px;
            font-weight: 700;
            color:rgb(98, 98, 98);
          }
          
          .receipt-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #f0f0f0;
            text-align: center;
            color: #666;
            font-size: 14px;
          }
          
          .thank-you {
            font-size: 18px;
            font-weight: 600;
            color:rgb(98, 98, 98);
            margin-bottom: 10px;
          }
          
          .footer-note {
            margin-top: 10px;
            font-size: 12px;
            color: #888;
          }
          
          .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 100px;
            color: rgba(37, 99, 235, 0.03);
            z-index: -1;
            font-weight: 700;
            letter-spacing: 5px;
            text-transform: uppercase;
          }
          
          @media print {
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            
            .receipt {
              box-shadow: none;
              border: none;
              padding: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="watermark">PAGADO</div>
          
          <div class="receipt-header">
            <div class="logo-container">
              <img class="logo" src="https://i.imgur.com/w9K9wWP.png" alt="Company Logo">
            </div>
            <div>
              <div class="receipt-title">RECIBO DE PAGO</div>
              <div class="receipt-number">Recibo #: MC-{{receiptNumber}}</div>
              <div class="receipt-date">Fecha: {{formattedDate}}</div>
            </div>
          </div>
          
          <div class="customer-details">
            <div class="receipt-info-title">Detalles del Cliente</div>
            <div class="customer-name">{{name}}</div>
            <div class="customer-id">ID: {{identification}}</div>
          </div>
          
          <div class="payment-details">
            <div class="receipt-info-title">Detalles del Pago</div>
<table class="payment-table">
  <thead>
    <tr>
      <th>Concepto</th>
      <th style="text-align: right;">Monto</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td class="payment-concept">{{concept}}</td>
      <td class="payment-amount">{{formattedAmount}}</td>
    </tr>
    <tr>
      <td class="payment-concept">GPS</td>
      <td class="payment-amount">{{formattedGps}}</td>
    </tr>
  </tbody>
</table>

          </div>
          
          <div class="receipt-total">
            <div class="total-container">
              <div class="total-label">Total Pagado</div>
              <div class="total-amount">{{formattedTotal}}</div>
            </div>
          </div>
          
          <div class="receipt-footer">
            <div class="thank-you">¡Gracias por su pago!</div>
            <p>Este recibo es comprobante oficial de su pago.</p>
            <p class="footer-note">Para cualquier consulta, por favor contacte a nuestro servicio al cliente.</p>
          </div>
        </div>
      </body>
      </html>
    `