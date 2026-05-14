import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Configuración visual compartida
const COLOR_PRIMARY = [30, 58, 138]; // blue-900
const COLOR_SECONDARY = [100, 116, 139]; // slate-500
const COLOR_BORDER = [226, 232, 240]; // slate-200

export const generarPdfFacturaDGI = (doc, detalles) => {
    const pdf = new jsPDF({ format: 'a4' });
    const esUYU = doc.MonIdMoneda === 1;
    const monedaStr = esUYU ? 'Peso Uruguayo' : 'Dólar estadounidense';
    const fmtNum = (n) => new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    // Fuente y estilos base
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);

    // ==========================================
    // LOGO Y DATOS EMPRESA (IZQUIERDA)
    // ==========================================
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(48);
    pdf.text("user", 15, 30);

    // Cuadritos CMYK abajo de 'user'
    pdf.setFillColor(0, 174, 239); // Cyan
    pdf.rect(15, 35, 12, 4, 'F');
    pdf.setFillColor(236, 0, 140); // Magenta
    pdf.rect(29, 35, 12, 4, 'F');
    pdf.setFillColor(255, 242, 0); // Yellow
    pdf.rect(43, 35, 12, 4, 'F');
    pdf.setFillColor(0, 0, 0); // Black
    pdf.rect(57, 35, 12, 4, 'F');

    pdf.setFontSize(14);
    pdf.text("Centro de Impresión Digital", 15, 45);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.text("LALINDE MORALES HECTOR ARTIGAS,", 15, 50);
    pdf.text("LALINDE FALERO FELIPE Y OTROS", 15, 54);

    pdf.setFontSize(10);
    pdf.text("VILARDEBO 2031", 15, 60);
    pdf.text("MONTEVIDEO", 15, 64);
    pdf.text("TEL:", 15, 68);

    // ==========================================
    // CAJAS SUPERIORES (DERECHA)
    // ==========================================
    const rightX = 100;
    const boxW = 95;
    pdf.setLineWidth(0.4);

    // Caja 1: RUC | TIPO
    pdf.rect(rightX, 15, boxW, 10);
    pdf.line(rightX, 20, rightX + boxW, 20); // Horizontal mid
    pdf.line(rightX + boxW / 2, 15, rightX + boxW / 2, 25); // Vertical split
    pdf.setFontSize(8);
    pdf.text("RUC", rightX + boxW / 4, 19, { align: 'center' });
    pdf.text("TIPO DE DOCUMENTO", rightX + boxW * 0.75, 19, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text("218973270018", rightX + boxW / 4, 24, { align: 'center' });
    pdf.text(doc.DocTipo || "e-Factura", rightX + boxW * 0.75, 24, { align: 'center' });

    // Caja 2: SERIE | NUMERO | FORMA
    pdf.rect(rightX, 28, boxW, 10);
    pdf.line(rightX, 33, rightX + boxW, 33);
    pdf.line(rightX + boxW / 3, 28, rightX + boxW / 3, 38);
    pdf.line(rightX + boxW * 0.66, 28, rightX + boxW * 0.66, 38);
    pdf.setFontSize(8);
    pdf.text("SERIE", rightX + boxW / 6, 32, { align: 'center' });
    pdf.text("NUMERO", rightX + boxW / 2, 32, { align: 'center' });
    pdf.text("FORMA DE PAGO", rightX + boxW * 0.83, 32, { align: 'center' });
    pdf.setFontSize(10);
    pdf.text(doc.DocSerie || "A", rightX + boxW / 6, 37, { align: 'center' });
    pdf.text(doc.DocNumero ? String(doc.DocNumero) : "BORRADOR", rightX + boxW / 2, 37, { align: 'center' });
    pdf.text(doc.DocPagado ? "Contado" : "Crédito", rightX + boxW * 0.83, 37, { align: 'center' });

    // Caja 3: RUC COMPRADOR
    let rucComprador = "CONSUMIDOR FINAL";
    if (String(doc.DocTipo || "").includes("TICKET")) {
        rucComprador = doc.DocCliDocumento ? String(doc.DocCliDocumento) : "CONSUMIDOR FINAL";
    } else {
        rucComprador = doc.DocCliDocumento ? String(doc.DocCliDocumento) : (doc.CliRUT ? String(doc.CliRUT) : (doc.StringIDCliente ? String(doc.StringIDCliente).trim() : "CONSUMIDOR FINAL"));
    }

    pdf.rect(rightX, 41, boxW, 12);
    pdf.setFontSize(8);
    pdf.text("RUC COMPRADOR", rightX + boxW / 2, 45, { align: 'center' });
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(rucComprador, rightX + boxW / 2, 51, { align: 'center' });
    pdf.setFont('helvetica', 'normal');

    // ==========================================
    // CAJAS MEDIAS
    // ==========================================
    const midY = 75;

    // Caja 4: FECHA | MONEDA (Izquierda)
    pdf.rect(15, midY, 80, 10);
    pdf.line(15, midY + 5, 95, midY + 5);
    pdf.line(55, midY, 55, midY + 10);
    pdf.setFontSize(8);
    pdf.text("FECHA", 35, midY + 4, { align: 'center' });
    pdf.text("MONEDA", 75, midY + 4, { align: 'center' });
    pdf.setFontSize(9);
    const fechaEmision = doc.DocFechaEmision ? new Date(doc.DocFechaEmision).toLocaleDateString('es-UY') : new Date().toLocaleDateString('es-UY');
    pdf.text(fechaEmision, 35, midY + 9, { align: 'center' });
    pdf.text(monedaStr, 75, midY + 9, { align: 'center' });

    // Caja 5: DATOS DEL CLIENTE (Derecha)
    pdf.rect(rightX, 56, boxW, 30);
    pdf.line(rightX, 61, rightX + boxW, 61);
    pdf.setFontSize(8);
    pdf.text("DATOS DEL CLIENTE", rightX + boxW / 2, 60, { align: 'center' });
    pdf.setFontSize(9);

    const nombreCli = doc.DocCliNombre || doc.CliNombreFantasia || doc.CliRazonSocial || 'CONSUMIDOR FINAL';
    const nfantasia = doc.StringIDCliente ? String(doc.StringIDCliente).trim() : '';
    const direccion = doc.DocCliDireccion || doc.CliDireccion || '';
    const ciudad = doc.DocCliCiudad || '';
    pdf.text(`CLIENTE: ${nombreCli}`, rightX + 2, 65);
    pdf.text(`NOMBRE FANTASÍA: ${nfantasia}`, rightX + 2, 70);
    pdf.text(`DIRECCIÓN: ${direccion}`, rightX + 2, 75);
    pdf.text(`CIUDAD: ${ciudad}`, rightX + 2, 80);

    // ==========================================
    // TABLA DE DETALLES
    // ==========================================
    const startY = 95;

    // Format data for table
    let tableBody = [];
    if (detalles && detalles.length > 0) {
        tableBody = detalles.map((d, index) => {
            const isHeader = d.isHeader || (d.DcdCantidad == null && d.DcdSubtotal == null && d.DcdNomItem && d.DcdNomItem.startsWith('Orden:'));
            const isSubtotal = d.isSubtotal || (d.DcdNomItem && d.DcdNomItem.startsWith('SUBTOTAL ORDEN'));

            if (isHeader) {
                return [
                    '',
                    { content: d.DcdNomItem, colSpan: 7, styles: { fontStyle: 'bold', fillColor: [245, 245, 245], textColor: [79, 70, 229] } }
                ];
            }

            if (isSubtotal) {
                return [
                    '',
                    { content: d.DcdNomItem, styles: { fontStyle: 'bold', halign: 'right' } },
                    '',
                    '',
                    '',
                    '',
                    '',
                    { content: fmtNum(d.DcdSubtotal), styles: { fontStyle: 'bold' } }
                ];
            }

            const pUnitario = d.DcdPrecioUnitario ? Number(d.DcdPrecioUnitario) : (Number(d.DcdSubtotal) / Number(d.DcdCantidad));
            const descBruto = Number(d.DcdTotalDescuentos || 0);
            const originalSub = pUnitario * Number(d.DcdCantidad);

            let descuentoStr = d.DcdDescuentoStr || '';
            if (!descuentoStr && descBruto > 0.01) {
                const pct = (descBruto / originalSub) * 100;
                descuentoStr = `${fmtNum(descBruto)} (${fmtNum(pct)}%)`;
            }

            const puNeto = pUnitario - (descBruto / Number(d.DcdCantidad));

            return [
                index + 1, // Codigo generico si no hay
                d.DcdNomItem + (d.DcdDscItem ? `\n${d.DcdDscItem}` : ''),
                '22%', // IVA
                fmtNum(pUnitario), // P. Unitario
                fmtNum(d.DcdCantidad), // Cantidad
                descuentoStr, // Descuentos
                fmtNum(puNeto), // P.U. Neto
                fmtNum(d.DcdSubtotal) // Importe
            ];
        });
    } else {
        const servSub = doc.DocTotal || doc.DocSubtotal;
        tableBody = [['1', 'Servicios', '22%', fmtNum(servSub), '1', '', fmtNum(servSub), fmtNum(servSub)]];
    }

    autoTable(pdf, {
        startY: startY,
        head: [['Código', 'Descripción', 'IVA', 'P. Unitario', 'Cantidad', 'Descuentos', 'P.U. Neto', 'Importe']],
        body: tableBody,
        theme: 'grid',
        headStyles: {
            fillColor: [255, 255, 255],
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.4,
            fontStyle: 'normal',
            halign: 'center',
            fontSize: 8,
            cellPadding: 1.5
        },
        styles: {
            font: 'helvetica',
            fontSize: 8,
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.4,
            cellPadding: 1.5,
            valign: 'middle'
        },
        columnStyles: {
            0: { cellWidth: 20, halign: 'left' },
            1: { cellWidth: 'auto', halign: 'left' },
            2: { cellWidth: 12, halign: 'right' },
            3: { cellWidth: 20, halign: 'right' },
            4: { cellWidth: 18, halign: 'right' },
            5: { cellWidth: 20, halign: 'right' },
            6: { cellWidth: 20, halign: 'right' },
            7: { cellWidth: 22, halign: 'right' }
        },
        margin: { left: 15, right: 15 }
    });

    // ==========================================
    // TOTALES (FOOTER)
    // ==========================================
    const finalY = pdf.lastAutoTable.finalY + 10;

    pdf.setFontSize(9);
    pdf.text("Gravado 22%", 150, finalY);
    pdf.text(fmtNum(doc.DocSubtotal), 195, finalY, { align: 'right' });

    pdf.text("IVA 22%", 150, finalY + 5);
    pdf.text(fmtNum(doc.DocImpuestos), 195, finalY + 5, { align: 'right' });

    pdf.text("Total", 150, finalY + 10);
    pdf.text(fmtNum(doc.DocTotal), 195, finalY + 10, { align: 'right' });

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text("TOTAL:", 150, finalY + 18);
    pdf.text(fmtNum(doc.DocTotal), 195, finalY + 18, { align: 'right' });

    // Observaciones
    if (doc.DocObservaciones) {
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        pdf.text("Observaciones:", 15, finalY);
        pdf.setFont('helvetica', 'normal');

        // Multi-line text for observations to fit within width 120
        const obsLines = pdf.splitTextToSize(doc.DocObservaciones, 120);
        pdf.text(obsLines, 15, finalY + 5);
    }

    // Marca de agua para BORRADOR
    if (doc.CfeEstado === 'PENDIENTE') {
        pdf.setFontSize(40);
        pdf.setTextColor(200, 200, 200);
        pdf.text("BORRADOR", 105, 250, { align: 'center', angle: 45 });
    }

    // Descargar
    const safeNum = doc.DocNumero || 'Borrador';
    pdf.save(`Factura_${doc.DocSerie || 'A'}_${safeNum}.pdf`);
};

export const generarPdfEstadoCuenta = (cliente, cuentas, secciones, planes) => {
    const pdf = new jsPDF({ format: 'a4' });
    const fmtNum = (n) => new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    const fmtFecha = (dateString) => new Date(dateString).toLocaleDateString('es-UY', { timeZone: 'UTC' });

    // Fuente y estilos base
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(...COLOR_PRIMARY);

    // Título
    pdf.text("ESTADO DE CUENTA", 14, 20);

    // Datos Cliente
    pdf.setFontSize(14);
    pdf.text(cliente.Nombre || 'Cliente Consumidor', 14, 30);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...COLOR_SECONDARY);
    if (cliente.NombreFantasia) pdf.text(cliente.NombreFantasia, 14, 35);
    pdf.text(`ID: ${cliente.CliIdCliente} | RUT/CI: ${cliente.CodCliente || '-'}`, 14, 40);
    pdf.text(`Generado: ${new Date().toLocaleDateString('es-UY')} ${new Date().toLocaleTimeString('es-UY')}`, 14, 45);

    let currentY = 55;

    // Iterar todas las cuentas y generar tabla por cada una
    const TIPOS_MONETARIOS = ['USD', 'UYU', 'ARS', 'EUR', 'PYG', 'BRL', 'CORRIENTE', 'CREDITO', 'DEBITO', 'CAJA', 'DINERO_USD', 'DINERO_UYU'];

    cuentas.forEach(c => {
        // Control de salto de página antes de imprimir la cabecera de la nueva cuenta
        if (currentY > 260) {
            pdf.addPage();
            currentY = 20;
        }

        const sec = secciones[c.CueIdCuenta];
        const movs = sec?.movs || [];
        // Saldo de arrastre: suma de todos los movimientos ANTERIORES al período filtrado.
        // Si no hay filtro de fecha, el backend devuelve 0.
        const arrastre = Number(sec?.saldoArrastre ?? 0);
        const saldo = Number(c.CueSaldoActual || 0);

        const esRecurso = c.ProIdProducto != null || !TIPOS_MONETARIOS.includes(c.CueTipo?.toUpperCase());
        const unidadLabel = c.UniSimbolo || c.UnidadLabel || c.CueTipo;
        const saldoStr = esRecurso
            ? `${fmtNum(saldo)} ${unidadLabel}`
            : `${c.MonSimbolo || '$'} ${fmtNum(saldo)}`;

        // Header de la cuenta
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(0, 0, 0);
        pdf.text(`Cuenta: ${c.UnidadLabel || c.CueTipo} - Saldo Actual: ${saldoStr}`, 14, currentY);
        currentY += 6;

        if (movs.length === 0) {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(10);
            pdf.setTextColor(...COLOR_SECONDARY);
            pdf.text("Sin movimientos en el período seleccionado.", 14, currentY);
            currentY += 15;
            return;
        }

        // Si hay arrastre, mostramos una fila de saldo inicial del período
        if (arrastre !== 0) {
            pdf.setFont('helvetica', 'italic');
            pdf.setFontSize(8);
            pdf.setTextColor(...COLOR_SECONDARY);
            const arrastreStr = esRecurso
                ? `${fmtNum(arrastre)} ${unidadLabel}`
                : `${c.MonSimbolo || '$'} ${fmtNum(arrastre)}`;
            pdf.text(`Saldo arrastrado al inicio del período: ${arrastreStr}`, 14, currentY);
            currentY += 5;
        }

        // Body de la tabla — calculamos saldos inicial/final acumulando desde el arrastre
        // Procesamos en orden cronológico (ASC) para acumular correctamente
        const movsAsc = [...movs].reverse();
        let runningSaldo = arrastre;

        const tableBody = movsAsc.map(m => {
            const importe = Number(m.MovImporte);
            const isCredit = ['PAGO', 'ANTICIPO', 'NOTA_CREDITO', 'AJUSTE_POS', 'DEVOLUCION', 'SALDO_INICIAL'].includes(m.MovTipo);
            const importeNumStr = fmtNum(Math.abs(importe));

            const importeStr = esRecurso
                ? `${isCredit ? '+' : '-'}${importeNumStr} ${unidadLabel}`
                : `${isCredit ? '+' : '-'}${importeNumStr}`;

            // Saldo antes de este movimiento
            const saldoAntesNum = runningSaldo;
            runningSaldo += importe;
            const saldoDespuesNum = runningSaldo;

            const saldoIniStr = esRecurso
                ? `${fmtNum(saldoAntesNum)} ${unidadLabel}`
                : `${fmtNum(saldoAntesNum)}`;

            const saldoFinStr = esRecurso
                ? `${fmtNum(saldoDespuesNum)} ${unidadLabel}`
                : `${fmtNum(saldoDespuesNum)}`;

            return [
                fmtFecha(m.MovFecha),
                m.MovTipo,
                m.MovConcepto || '-',
                saldoIniStr,
                importeStr,
                saldoFinStr
            ];
        });

        autoTable(pdf, {
            startY: currentY,
            head: [['Fecha', 'Tipo', 'Concepto', 'Saldo Inicial', 'Importe', 'Saldo Final']],
            body: tableBody,
            theme: 'grid',
            headStyles: {
                fillColor: COLOR_PRIMARY,
                textColor: [255, 255, 255],
                fontStyle: 'bold'
            },
            styles: {
                font: 'helvetica',
                fontSize: 8,
                cellPadding: 3
            },
            columnStyles: {
                0: { cellWidth: 20 },
                1: { cellWidth: 25 },
                2: { cellWidth: 'auto' },
                3: { cellWidth: 28, halign: 'right' },
                4: { cellWidth: 28, halign: 'right' },
                5: { cellWidth: 28, halign: 'right' }
            }
        });

        currentY = pdf.lastAutoTable.finalY + 15;
    });

    // Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLOR_SECONDARY);
    pdf.text("Documento generado por Macrosoft Sistema", 105, 280, { align: 'center' });

    pdf.save(`Estado_Cuenta_${cliente.Nombre.replace(/\s+/g, '_')}.pdf`);
};

export const generarPdfPrefactura = (ciclo, movs, excluidos, cuenta, cliente, esFinal = false) => {
    const pdf = new jsPDF({ format: 'a4' });
    const fmtNum = (n) => new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    const fmtFecha = (dateString) => new Date(dateString).toLocaleDateString('es-UY', { timeZone: 'UTC' });
    const monedaStr = cuenta?.MonSimbolo || '$';

    // Fuente y estilos base
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.setTextColor(...COLOR_PRIMARY);

    // Cabecera Empresa
    pdf.text("MACROSOFT S.A.", 14, 20);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.setTextColor(...COLOR_SECONDARY);
    pdf.text("RUT: 211111110015", 14, 26);
    pdf.text("Bulevar Artigas 1234, Montevideo", 14, 31);

    // Tipo Documento y Número
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(...COLOR_PRIMARY);
    pdf.text(esFinal ? "FACTURA DE SERVICIOS" : "PRE-FACTURA (BORRADOR)", 120, 20);

    pdf.setFontSize(11);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`CICLO: ${ciclo.CicIdCiclo}`, 120, 28);

    // Fechas y datos
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const fechaEmision = new Date().toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' });
    pdf.text(`Emitido: ${fechaEmision}`, 120, 34);
    pdf.text(`Desde: ${fmtFecha(ciclo.CicFechaInicio)}  Hasta: ${fmtFecha(ciclo.CicFechaCierre)}`, 120, 40);

    // Línea separadora
    pdf.setDrawColor(...COLOR_BORDER);
    pdf.line(14, 45, 196, 45);

    // Datos Cliente
    pdf.setFont('helvetica', 'bold');
    pdf.text("CLIENTE:", 14, 52);
    pdf.setFont('helvetica', 'normal');

    const nombreCli = cliente.NombreFantasia || cliente.Nombre || 'CONSUMIDOR FINAL';
    const idCli = cliente.CodCliente || cliente.CliIdCliente;
    pdf.text(`${nombreCli} [${idCli}]`, 35, 52);

    if (cliente.CioRuc) {
        pdf.text(`RUT/CI: ${cliente.CioRuc}`, 14, 58);
    }
    pdf.text(`Cuenta: ${cuenta.UnidadLabel || cuenta.CueTipo}`, 120, 52);

    // Tabla de Detalles
    const movsIncluidos = movs.filter(m => !excluidos.has(m.MovIdMovimiento));
    let totalOrdenes = 0;
    let totalPagos = 0;

    const tableBody = movsIncluidos.flatMap(m => {
        const importe = Number(m.MovImporte);
        const esOrden = m.MovTipo === 'ORDEN';

        if (importe < 0) totalOrdenes += Math.abs(importe);
        if (importe > 0) totalPagos += Math.abs(importe);

        if (esOrden) {
            const descPct = Number(m.OrdDescuentoAplicado || 0);

            if (m.DetallesJSON) {
                try {
                    const detalles = JSON.parse(m.DetallesJSON);
                    return detalles.map(d => {
                        const cant = Number(d.Cantidad || 1);
                        const precioTotal = Number(d.Subtotal || 0);
                        const precioUnitario = Number(d.PrecioUnitario || 0);

                        // Linea 1: Codigo de Articulo y Descripcion
                        const artDesc = d.Descripcion || d.LogPrecioAplicado || 'Servicio/Material';
                        const linea1 = `[${d.CodArticulo || 'S/C'}] - ${artDesc}`;

                        // Sublinea: Orden y Trabajo y Subfamilia
                        const subFamilia = m.ProSubFamilia ? `[${m.ProCodStock} - ${m.ProSubFamilia}] ` : '';
                        const linea2 = `Orden: ${m.OrdCodigoOrden || 'S/N'} | ${m.OrdNombreTrabajo || 'Sin trabajo'} | ${subFamilia}`.trim();

                        const desc = linea2 ? `${linea1}\n${linea2}` : linea1;

                        return [
                            desc,
                            fmtNum(cant),
                            fmtNum(precioUnitario),
                            descPct.toString(),
                            'IVA Ventas (22%)',
                            `${monedaStr} ${fmtNum(precioTotal)}`
                        ];
                    });
                } catch (e) {
                    console.error("Error parsing DetallesJSON", e);
                }
            }

            // Fallback si no hay detalles guardados
            const linea1 = `${m.OrdCodigoOrden || 'S/N'} - ${m.OrdNombreTrabajo || 'Sin trabajo'}`;
            const subFamilia = m.ProSubFamilia ? `[${m.ProCodStock} - ${m.ProSubFamilia}] ` : '';
            const linea2 = `${subFamilia}${m.OrdMaterialPlanilla || ''}`.trim();
            const desc = linea2 ? `${linea1}\n${linea2}` : linea1;

            const cant = Number(m.OrdCantidad || 1);
            const precioTotal = Math.abs(importe);
            const precioUnitario = precioTotal / cant;

            return [[
                desc,
                fmtNum(cant),
                fmtNum(precioUnitario),
                descPct.toString(),
                'IVA Ventas (22%)',
                `${monedaStr} ${fmtNum(precioTotal)}`
            ]];
        } else {
            // No mostrar pagos ni abonos en el cuerpo de la factura
            if (importe >= 0) return [];

            // Para otros cargos que no son ORDEN (ej: VTA_CAJA, Ajustes de débito)
            return [[
                m.MovConcepto || m.MovTipo,
                '1',
                fmtNum(Math.abs(importe)),
                '-',
                'IVA Ventas (22%)',
                `${monedaStr} ${fmtNum(Math.abs(importe))}`
            ]];
        }
    });

    if (tableBody.length === 0) {
        tableBody.push(['Sin movimientos', '-', '-', '-', '-', `${monedaStr} 0,00`]);
    }

    const totalAFacturar = totalOrdenes - totalPagos;

    autoTable(pdf, {
        startY: 65,
        head: [['DESCRIPCIÓN', 'CANTIDAD', 'PRECIO UNITARIO', 'DESC.%', 'IMPUESTOS', 'PRECIO TOTAL']],
        body: tableBody,
        theme: 'plain',
        headStyles: {
            fillColor: [248, 250, 252], // slate-50
            textColor: [15, 23, 42], // slate-900
            fontStyle: 'bold',
            lineColor: COLOR_BORDER,
            lineWidth: { bottom: 0.5 }
        },
        styles: {
            font: 'helvetica',
            fontSize: 9,
            cellPadding: 5,
            textColor: [51, 65, 85] // slate-700
        },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 20, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 15, halign: 'center' },
            4: { cellWidth: 35, halign: 'center' },
            5: { cellWidth: 30, halign: 'right' }
        },
        didParseCell: function (data) {
            if (data.row.section === 'body' && data.column.index === 0) {
                data.cell.styles.fontStyle = 'normal';
            }
        }
    });

    // Totales
    const finalY = pdf.lastAutoTable.finalY + 10;
    const saldoPendiente = totalOrdenes - totalPagos;

    // Línea separadora antes de totales
    pdf.setDrawColor(...COLOR_BORDER);
    pdf.line(120, finalY - 3, 196, finalY - 3);

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.setTextColor(...COLOR_PRIMARY);
    pdf.text("TOTAL FACTURA:", 120, finalY);
    pdf.text(`${monedaStr} ${fmtNum(totalOrdenes)}`, 196, finalY, { align: 'right' });

    // Footer
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(...COLOR_SECONDARY);
    pdf.text("Documento generado por Macrosoft Sistema", 105, 280, { align: 'center' });

    if (!esFinal) {
        pdf.setTextColor(220, 38, 38); // red-600
        pdf.text("DOCUMENTO BORRADOR - NO VÁLIDO COMO FACTURA", 105, 285, { align: 'center' });
    }

    // Descargar
    const prefix = esFinal ? "Factura" : "Prefactura";
    pdf.save(`${prefix}_Ciclo_${cliente.Nombre.replace(/\s+/g, '_')}.pdf`);
};

