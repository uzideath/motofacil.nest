export const templateHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8"/>
        <title>Payment Receipt</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@page {
  size: 80mm auto;
  margin: 0;
}

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: 'Inter', sans-serif;
    color: #333;
    line-height: 1.4;
    background-color: #fff;
    padding: 0;
    margin: 0;
    width: 80mm;
  }

.receipt {
  width: 100%;
  max-width: none;
  padding: 10px 12px;
  margin: 0 auto;
}


  .receipt-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
    border-bottom: 1px solid #eee;
    padding-bottom: 10px;
  }

  .logo {
    width: 80px;
    height: auto;
  }

  .receipt-title {
    font-size: 18px;
    font-weight: 700;
    text-align: right;
    color: #444;
  }

  .receipt-number, .receipt-date {
    font-size: 12px;
    color: #666;
    text-align: right;
  }

  .receipt-info-title {
    font-size: 12px;
    font-weight: 600;
    margin-bottom: 5px;
    text-transform: uppercase;
    color: #555;
  }

  .customer-details {
    background-color: #f5f5f5;
    padding: 10px;
    border-radius: 4px;
    margin-bottom: 15px;
  }

  .customer-name {
    font-size: 14px;
    font-weight: 600;
  }

  .customer-id {
    font-size: 12px;
    color: #666;
  }

  .payment-details {
    margin-bottom: 15px;
  }

  .payment-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
  }

  .payment-table th, .payment-table td {
    font-size: 12px;
    padding: 6px;
    border-bottom: 1px solid #ddd;
  }

  .payment-table th {
    background-color: #e0f0ff;
    font-weight: 600;
  }

  .payment-amount {
    text-align: right;
    font-weight: 600;
    color: #444;
  }

  .receipt-total {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid #eee;
  }

  .total-container {
    background-color: #e0f0ff;
    padding: 10px 15px;
    border-radius: 4px;
    min-width: 150px;
    text-align: right;
  }

  .total-label {
    font-size: 12px;
    font-weight: 600;
    color: #555;
  }

  .total-amount {
    font-size: 16px;
    font-weight: 700;
    color: #444;
  }

  .receipt-footer {
    margin-top: 20px;
    text-align: center;
    font-size: 10px;
    color: #777;
  }

  .thank-you {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 5px;
    color: #444;
  }

  .footer-note {
    font-size: 10px;
    color: #999;
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