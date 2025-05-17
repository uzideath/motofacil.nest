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
      font-size: 13px;
      color: #000;
      background-color: #fff;
      width: 80mm;
    }

    .receipt {
      width: 100%;
    }

    .header, .footer {
      text-align: center;
      margin-bottom: 10px;
    }

    .title {
      font-size: 16px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .info {
      font-size: 12px;
      margin-bottom: 4px;
    }

    .section {
      margin-top: 10px;
      margin-bottom: 10px;
    }

    .label {
      font-weight: bold;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 5px;
    }

    .table th, .table td {
      text-align: left;
      padding: 4px 0;
      font-size: 13px;
      border-bottom: 1px dashed #000;
    }

    .right {
      text-align: right;
    }

    .total {
      font-size: 14px;
      font-weight: bold;
      text-align: right;
      margin-top: 8px;
      border-top: 1px solid #000;
      padding-top: 5px;
    }

    .thank-you {
      font-weight: bold;
      font-size: 14px;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <div class="title">RECIBO DE PAGO</div>
      <div class="info">Recibo #: MC-{{receiptNumber}}</div>
      <div class="info">Fecha: {{formattedDate}}</div>
    </div>

    <div class="section">
      <div class="label">Cliente:</div>
      <div>{{name}}</div>
      <div>Contrato #: {{identification}}</div>
    </div>

    <div class="section">
      <div class="label">Detalle del Pago</div>
      <table class="table">
        <tr>
          <td>Concepto</td>
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
      <div><span class="label">Generado:</span> {{generatedDate}}</div>
    </div>

    <div class="total">TOTAL: {{formattedTotal}}</div>

    <div class="footer">
      <div class="thank-you">¡Gracias por su pago!</div>
      <div>Este recibo es comprobante oficial.</div>
    </div>
  </div>
</body>
</html>
`;
