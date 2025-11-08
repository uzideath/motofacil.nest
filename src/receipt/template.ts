export const templateHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Recibo</title>
  <style>
    @page {
      size: 80mm auto;
      margin: 5mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: sans-serif;
      font-size: 18px;
      color: #000;
      background-color: #fff;
      width: 80mm;
    }

    .receipt {
      width: 100%;
    }

    .header {
      text-align: center;
      margin-bottom: 12px;
    }

    .logo {
      width: 120px;
      height: auto;
      margin: 0 auto 10px;
    }

    .title {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 6px;
    }

    .info {
      font-size: 18px;
      margin-bottom: 4px;
    }

    .section {
      margin-top: 14px;
      margin-bottom: 14px;
    }

    .label {
      font-weight: bold;
      margin-bottom: 2px;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 6px;
    }

    .table th, .table td {
      text-align: left;
      padding: 6px 0;
      font-size: 18px;
      border-bottom: 1px dashed #000;
    }

    .right {
      text-align: right;
    }

    .total {
      font-size: 20px;
      font-weight: bold;
      text-align: right;
      margin-top: 12px;
      border-top: 1px solid #000;
      padding-top: 6px;
    }

    .notes {
      margin-top: 12px;
      font-size: 17px;
    }

    .thank-you {
      font-weight: bold;
      font-size: 18px;
      margin-top: 14px;
    }

    .footer {
      text-align: center;
      margin-top: 20px;
      font-size: 17px;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <img class="logo" src="https://i.imgur.com/i1CS4S9.png" alt="Logo">
      <div class="title">{{storeName}}</div>
      <div class="info">NIT: {{storeNit}}</div>
      <div class="title">RECIBO DE PAGO</div>
      <div class="info">Recibo #: MC-{{receiptNumber}}</div>
      <div><span class="label">Generado:</span> {{generatedDate}}</div>
    </div>

    <div class="section">
      <div class="label">Cliente:</div>
      <div>{{name}}</div>
      <div>Placa #: <strong>{{identification}}</strong></div>
    </div>

    <div class="section">
      <div class="label">Detalle del Pago</div>
      <table class="table">
        <tr>
          <td>{{concept}}</td>
          <td class="right">{{formattedAmount}}</td>
        </tr>
        <tr>
          <td>GPS</td>
          <td class="right">{{formattedGps}}</td>
        </tr>
      </table>
    </div>

    <div class="section">
      <div><span class="label">Fecha de Pago:</span> {{paymentDate}}</div>
    </div>

    <div class="total">TOTAL: {{formattedTotal}}</div>

    <div class="section" style="margin-top: 10px; padding: 8px; background-color: #f5f5f5; border-radius: 4px;">
      <div class="label" style="font-size: 16px; margin-bottom: 4px;">Estado de Cuotas:</div>
      <div style="font-size: 17px; margin-bottom: 6px;">{{paymentStatus}}</div>
      <div style="font-size: 17px; font-weight: bold; margin-top: 6px;">{{paymentDaysStatus}}</div>
      <div style="font-size: 16px; margin-top: 4px; color: #666;">Días desde última cuota: {{daysSinceLastPayment}}</div>
    </div>

    <div class="notes">
      <div class="label">Notas:</div>
      <div>{{notes}}</div>
    </div>

    <div class="footer">
      <div class="thank-you">¡Gracias por su pago!</div>
      <div>Este recibo es comprobante oficial.</div>
    </div>
  </div>
</body>
</html>
`;
