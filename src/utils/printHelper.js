export const printLabelsHelper = (labels, orderInfo) => {
  if (!labels || labels.length === 0) {
    alert("No hay etiquetas para imprimir");
    return;
  }

  const printWindow = window.open('', '_blank', 'width=800,height=600');
  if (!printWindow) {
    alert("El navegador bloqueó la ventana emergente. Por favor permite popups.");
    return;
  }

  let labelsHtml = labels.map(l => {
    // Determine Order Data per Label (Support bulk print with mixed orders)
    // Prefer data in label object (l) if available, fallback to orderInfo
    const oCode = l.OrderCode || (orderInfo && (orderInfo.code || orderInfo.CodigoOrden)) || 'SIN CÓDIGO';
    const oClient = l.Cliente || (orderInfo && (orderInfo.client || orderInfo.Cliente)) || 'Cliente';
    const oDesc = l.OrderDesc || (orderInfo && (orderInfo.desc || orderInfo.DescripcionTrabajo)) || '';
    const oArea = l.OrderArea || (orderInfo && (orderInfo.area || orderInfo.AreaID)) || 'GEN';

    // QR
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(l.CodigoQR)}`;

    // Dates
    const genDate = new Date(l.FechaGeneracion).toLocaleDateString() + ' ' + new Date(l.FechaGeneracion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Bulto Info
    const bultoStr = `(${l.NumeroBulto}/${l.TotalBultos})`;
    const labelIdCode = l.CodigoEtiqueta || '';

    // Services List Render
    let servicesList = [];
    try {
      if (l.RelatedStatus) {
        servicesList = JSON.parse(l.RelatedStatus);
      }
    } catch (e) {
      console.error("Error parsing RelatedStatus in printHelper", e);
    }

    // If no related status found, fallback to current area
    if (servicesList.length === 0) {
      servicesList = [{ AreaID: oArea, Estado: 'En Proceso' }];
    }

    // Deduplicate by AreaID
    const uniqueServices = [];
    const seenAreas = new Set();
    servicesList.forEach(s => {
      if (!seenAreas.has(s.AreaID)) {
        seenAreas.add(s.AreaID);
        uniqueServices.push(s);
      }
    });

    const servicesHtml = uniqueServices.map(s => {
      const statusUpper = (s.Estado || '').toUpperCase();
      // Logic for checkmark: Finished, Ready, or matches current area (visual feedback)
      const isDone = ['PRONTO', 'FINALIZADO', 'OK', 'AGREGADO'].includes(statusUpper) || s.AreaID === oArea;
      const icon = isDone ? '&#10004;' : '&minus;';
      return `<li style="list-style:none; margin-bottom:5px; font-weight:bold; font-size:14px;"><span style="display:inline-block; width:20px; font-weight:bold;">${icon}</span> ${s.AreaID}</li>`;
    }).join('');

    return `
        <div class="label-container" style="border: 2px solid black; margin: 0; page-break-after: always; box-sizing: border-box; width: 4in; height: 6in; position: relative; font-family: Arial, sans-serif;">
          <!-- HEADER -->
          <div style="border-bottom: 2px solid black; padding: 10px; height: 15%;">
            <div style="display:flex; justify-content: space-between; align-items: flex-start;">
                <div style="width: 65%;">
                    <div style="font-weight: bold; font-size: 14px;">CLIENTE: ${(oClient || '').substring(0, 25)}</div>
                    <div style="font-size: 12px; margin-top:4px;">TRABAJO: ${(oDesc || '').substring(0, 35)}</div>
                </div>
                <div style="width: 35%; text-align: right;">
                    <div style="font-weight: bold; font-size: 14px;">ÁREA: ${oArea}</div>
                    <div style="font-size: 10px; margin-top:4px;">${genDate}</div>
                </div>
            </div>
          </div>
          <!-- BODY -->
          <div style="display: flex; height: 85%;">
            <!-- LEFT -->
            <div style="width: 60%; padding: 10px; text-align: center; display: flex; flex-direction: column; justify-content: center; align-items: center;">
                <img src="${qrUrl}" style="width: 180px; height: 180px; object-fit: contain; margin-bottom: 10px;">
                <div style="font-size: ${oCode.toString().length > 8 ? '24px' : '38px'}; font-weight: 900; line-height: 1;">ORDEN: ${oCode}</div>
                <div style="font-size: 24px; font-weight: bold; margin-top: 5px;">BULTO ${bultoStr}</div>
                ${labelIdCode ? `<div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #000; font-family: monospace;">${labelIdCode}</div>` : ''}
                <div style="font-size: 12px; margin-top: 15px;">Destino: <strong>${(l.nextService || l.NextService || 'LOGISTICA').toUpperCase()}</strong></div>
            </div>
            <!-- RIGHT -->
            <div style="width: 40%; border-left: 2px solid black; padding: 10px;">
                <div style="font-weight: 900; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px;">SERVICIOS</div>
                <ul style="padding: 0; margin: 0;">
                    ${servicesHtml}
                </ul>
            </div>
          </div>
        </div>
      `;
  }).join('');

  printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Etiquetas</title>
            <style>
              @page { size: 4in 6in; margin: 0; }
              body { font-family: sans-serif; margin: 0; padding: 0; }
              .label-container { width: 4in; height: 6in; }
              @media print { .label-container { border: none; } }
            </style>
          </head>
          <body>${labelsHtml}</body>
        </html>
    `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
};
