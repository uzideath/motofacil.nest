export const templateHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Payment Receipt</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    @page {
      size: A4;
      margin: 0;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    html, body {
      font-family: 'Inter', sans-serif;
      color: #333;
      background-color: #fff;
      width: 100%;
      height: 100%;
    }

    body {
      padding: 0;
      margin: 0;
    }

    .receipt {
      width: 100%;
      height: 100vh;
      padding: 30mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .receipt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #ccc;
      padding-bottom: 15px;
      margin-bottom: 30px;
    }

    .logo {
      width: 100px;
      height: auto;
    }

    .receipt-title {
      font-size: 28px;
      font-weight: 700;
      text-align: right;
      color: #222;
    }

    .receipt-number,
    .receipt-date {
      font-size: 16px;
      color: #444;
      text-align: right;
      margin-top: 4px;
    }

    .receipt-info-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 10px;
      text-transform: uppercase;
      color: #444;
    }

    .customer-details {
      background-color: #f0f0f0;
      padding: 16px;
      border-radius: 6px;
      margin-bottom: 25px;
    }

    .customer-name {
      font-size: 18px;
      font-weight: 600;
    }

    .customer-id {
      font-size: 14px;
      color: #555;
      margin-top: 4px;
    }

    .payment-details {
      margin-bottom: 25px;
    }

    .payment-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }

    .payment-table th,
    .payment-table td {
      font-size: 16px;
      padding: 10px;
      border-bottom: 1px solid #bbb;
    }

    .payment-table th {
      background-color: #d8ecff;
      font-weight: 700;
      text-align: left;
    }

    .payment-amount {
      text-align: right;
      font-weight: 600;
      color: #222;
    }

    .receipt-total {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 2px solid #ccc;
    }

    .total-container {
      background-color: #d8ecff;
      padding: 15px 20px;
      border-radius: 6px;
      min-width: 200px;
      text-align: right;
    }

    .total-label {
      font-size: 14px;
      font-weight: 600;
      color: #444;
    }

    .total-amount {
      font-size: 22px;
      font-weight: 700;
      color: #222;
      margin-top: 5px;
    }

    .receipt-footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #555;
    }

    .thank-you {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #222;
    }

    .footer-note {
      font-size: 12px;
      color: #888;
    }

    .watermark {
      display: none;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .receipt {
        padding: 30mm;
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
      <div class="customer-id">Contrato #: {{identification}}</div>
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

      <div style="margin-top: 20px; font-size: 14px; color: #444;">
        <p><strong>Fecha del Pago:</strong> {{paymentDate}}</p>
        <p><strong>Fecha de Generación:</strong> {{generatedDate}}</p>
      </div>
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
