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
      <div class="title">{{storeName}}</div>
      <div class="info">NIT: {{storeNit}}</div>
      <div class="title">RECIBO DE PAGO</div>
      <div class="info">Recibo #: MC-{{receiptNumber}}</div>
      <div><span class="label">Generado:</span> {{generatedDate}}</div>
    </div>

    <div class="section">
      <div>PLACA: <strong>{{identification}}</strong></div>
      <div><span class="label">FECHA:</span> {{paymentDate}}</div>
      <div><span class="label">CLIENTE:</span> {{name}}</div>
      <div><span class="label">COD CONTRATO:</span> {{concept}}</div>
      <div><span class="label">MEDIO DE PAGO:</span> {{paymentMethod}}</div>
    </div>

    <div class="section" style="margin-top: 12px; padding: 10px; background-color: #f8f9fa; border: 2px solid #dee2e6; border-radius: 6px;">
      <div style="text-align: center; font-size: 19px; font-weight: bold; margin-bottom: 8px; padding: 6px; border-radius: 4px; background-color: #fff;">
        ::{{paymentTypeLabel}}::
      </div>
      
      <div style="border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px;">
        <div style="font-size: 17px; margin-bottom: 4px;">
          <span class="label">VALOR PAGADO:</span>
          <span style="float: right; font-weight: bold;">{{formattedAmount}}</span>
        </div>
        <div style="font-size: 17px; margin-bottom: 4px;">
          <span class="label">VALOR GPS:</span>
          <span style="float: right; font-weight: bold;">{{formattedGps}}</span>
        </div>
        <div style="font-size: 18px; margin-bottom: 8px; padding-top: 4px; border-top: 1px solid #000;">
          <span class="label">TOTAL:</span>
          <span style="float: right; font-weight: bold;">{{formattedTotal}}</span>
        </div>
      </div>

      <div style="border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px;">
        <div style="font-size: 17px; margin-bottom: 4px;">{{paymentStatus}}</div>
        <div style="font-size: 17px; font-weight: bold; margin-bottom: 4px;">{{cuotasRestanteInfo}}</div>
      </div>

      <div style="border-top: 1px dashed #000; padding-top: 8px; margin-top: 8px;">
        <div style="font-size: 17px; font-weight: bold; margin-bottom: 4px;">{{paymentDaysStatus}}</div>
      </div>

      <div style="margin-top: 10px; padding: 8px; background-color: #e9ecef; border-radius: 4px; text-align: center;">
        <div style="font-size: 16px; line-height: 1.4;">{{messageBottom}}</div>
      </div>
    </div>

    <div class="footer">
      <div class="thank-you">¡Gracias por su pago!</div>
      <div style="margin-top: 6px; font-size: 16px;">Usuario: {{notes}}</div>
    </div>
  </div>
</body>
</html>
`;
