/**
 * pdfService.js
 * Servicio centralizado para generación y guardado de PDFs en el servidor.
 * Usa pdf-lib (ya instalado en el proyecto).
 * Todos los documentos se guardan en: comprobantesPagos/ (o COMPROBANTES_PATH env var)
 * Organizado por subcarpetas: egresos/, ingresos/, recibos/, facturas/
 */

const { PDFDocument, StandardFonts, rgb, PageSizes } = require('pdf-lib');
const fs   = require('fs');
const path = require('path');
const logger = require('../utils/logger');

// ─── Directorio base ──────────────────────────────────────────────────────────
const getBaseDir = (subcarpeta = '') => {
  const base = process.env.COMPROBANTES_PATH || path.join(__dirname, '..', 'comprobantesPagos');
  const dir = subcarpeta ? path.join(base, subcarpeta) : base;
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
};

// ─── Helpers de formato ───────────────────────────────────────────────────────
const fmtNum = (n) =>
  new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleString('es-UY', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(d || ''); }
};

// ─── Función de guardado de bytes ─────────────────────────────────────────────
const guardarPDF = (pdfBytes, nombreArchivo, subcarpeta = '') => {
  const dir      = getBaseDir(subcarpeta);
  const clean    = nombreArchivo.replace(/[<>:"/\\|?*]/g, '_').trim();
  const filePath = path.join(dir, `${clean}.pdf`);
  fs.writeFileSync(filePath, Buffer.from(pdfBytes));
  logger.info(`[PDF-SERVICE] Guardado: ${filePath}`);
  return filePath;
};

// ─── Cabecera común ───────────────────────────────────────────────────────────
const dibujarCabecera = (page, { empresaNombre, empresaRuc, titulo, numero, fontBold, font, width, height }) => {
  // Banda superior oscura
  page.drawRectangle({ x: 0, y: height - 90, width, height: 90, color: rgb(0.08, 0.08, 0.12) });

  // Empresa
  page.drawText((empresaNombre || 'LA EMPRESA').toUpperCase().substring(0, 40), {
    x: 30, y: height - 38, size: 16, font: fontBold, color: rgb(1, 1, 1),
  });
  if (empresaRuc) {
    page.drawText(`RUC: ${empresaRuc}`, {
      x: 30, y: height - 58, size: 9, font, color: rgb(0.7, 0.7, 0.7),
    });
  }

  // Título + número (derecha)
  const tituloClean = (titulo || 'COMPROBANTE').substring(0, 30);
  page.drawText(tituloClean, {
    x: width - 30 - tituloClean.length * 5.5, y: height - 38,
    size: 10, font: fontBold, color: rgb(0.75, 0.85, 1),
  });
  page.drawText((numero || '').substring(0, 20), {
    x: width - 30 - (numero || '').length * 9.5, y: height - 60,
    size: 16, font: fontBold, color: rgb(1, 0.4, 0.4),
  });
};

// ─── Fila de datos ────────────────────────────────────────────────────────────
const dibujarFila = (page, { y, label, value, font, fontBold, width, highlight = false }) => {
  if (highlight) {
    page.drawRectangle({ x: 25, y: y - 4, width: width - 50, height: 18, color: rgb(0.97, 0.97, 0.97) });
  }
  page.drawText(`${label}:`, { x: 30, y, size: 8.5, font, color: rgb(0.4, 0.4, 0.4) });
  const val = (value || '—').substring(0, 60);
  page.drawText(val, { x: width / 2 - 20, y, size: 9, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
};

// ═══════════════════════════════════════════════════════════════════════════════
// EGRESO DE CAJA
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Genera y guarda el PDF de un egreso de caja.
 * @param {Object} voucher - datos del egreso (resultado de getVoucherEgreso)
 * @returns {string} ruta absoluta del archivo guardado
 */
const generarPdfEgreso = async (voucher) => {
  const doc      = await PDFDocument.create();
  const page     = doc.addPage([595.28, 420.94]); // A5 landscape
  const { width, height } = page.getSize();
  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const numero = `EG-${String(voucher.VoucherNumero || voucher.EgrIdEgreso || '000').padStart(6, '0')}`;

  // Cabecera
  dibujarCabecera(page, {
    empresaNombre: voucher.EmpresaNombre,
    empresaRuc:    voucher.EmpresaRuc,
    titulo:        'EGRESO DE CAJA',
    numero,
    fontBold, font, width, height,
  });

  // Marco
  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 110, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });

  // Filas de datos
  let y = height - 110;
  const filas = [
    ['Fecha',           fmtDate(voucher.EgrFecha)],
    ['Tipo de Egreso',  voucher.TipoEgresoLabel || voucher.EgrTipoEgreso || ''],
    ['Beneficiario',    voucher.EgrProveedor    || 'Sin especificar'],
    ['Concepto',        voucher.EgrConcepto     || ''],
    ['Método de Pago',  voucher.MetodoPago      || ''],
    ['Cuenta Contable', voucher.CuentaCodigo ? `[${voucher.CuentaCodigo}] ${voucher.CuentaNombre || ''}` : ''],
    ['Operario',        voucher.UsuarioNombre   || ''],
    ['N° Asiento',      String(voucher.AsiIdAsiento || '')],
  ];

  filas.forEach(([label, value], i) => {
    y -= 22;
    dibujarFila(page, { y, label, value, font, fontBold, width, highlight: i % 2 === 0 });
  });

  // Caja de monto
  const montoY = 65;
  page.drawRectangle({ x: width / 2 - 10, y: montoY - 10, width: width / 2 - 30, height: 55,
    color: rgb(0.99, 0.95, 0.95), borderColor: rgb(0.8, 0.2, 0.2), borderWidth: 1.5 });
  page.drawText('TOTAL EGRESO', {
    x: width / 2, y: montoY + 30, size: 8, font, color: rgb(0.5, 0.1, 0.1),
  });
  const montoStr = `${voucher.EgrMoneda === 'USD' ? 'US$ ' : '$ '}${fmtNum(voucher.EgrMonto)}`;
  page.drawText(montoStr, {
    x: width / 2 + 2, y: montoY + 10, size: 16, font: fontBold, color: rgb(0.7, 0.1, 0.1),
  });

  // Observaciones
  if (voucher.EgrObservaciones) {
    page.drawText(`Obs: ${voucher.EgrObservaciones.substring(0, 80)}`, {
      x: 30, y: montoY + 20, size: 8, font, color: rgb(0.4, 0.4, 0.4),
    });
  }

  // Firmas
  page.drawLine({ start: { x: 40, y: 50 }, end: { x: 160, y: 50 }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('Entregado por', { x: 55, y: 38, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

  page.drawLine({ start: { x: 220, y: 50 }, end: { x: 360, y: 50 }, thickness: 0.5, color: rgb(0.3, 0.3, 0.3) });
  page.drawText('Recibido por', { x: 255, y: 38, size: 8, font, color: rgb(0.4, 0.4, 0.4) });

  // Pie
  page.drawText(`Documento interno · Generado: ${new Date().toLocaleString('es-UY')}`, {
    x: 30, y: 25, size: 7, font, color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await doc.save();
  return guardarPDF(pdfBytes, numero, 'egresos');
};

// ═══════════════════════════════════════════════════════════════════════════════
// INGRESO GENÉRICO
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Genera y guarda el PDF de un ingreso genérico.
 * @param {Object} datos - { tcaId, concepto, monto, moneda, metodoPago, empresaNombre, empresaRuc, fecha, serieDoc, numeroDoc }
 */
const generarPdfIngreso = async (datos) => {
  const doc      = await PDFDocument.create();
  const page     = doc.addPage([595.28, 420.94]);
  const { width, height } = page.getSize();
  const font     = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const numero = `${datos.serieDoc || 'A'}-${String(datos.numeroDoc || datos.tcaId || '000').padStart(6, '0')}`;

  dibujarCabecera(page, {
    empresaNombre: datos.empresaNombre,
    empresaRuc:    datos.empresaRuc,
    titulo:        'INGRESO DE CAJA',
    numero,
    fontBold, font, width, height,
  });

  page.drawRectangle({ x: 20, y: 20, width: width - 40, height: height - 110, borderColor: rgb(0.8, 0.8, 0.8), borderWidth: 0.5 });

  const filas = [
    ['Fecha',         fmtDate(datos.fecha || new Date())],
    ['Concepto',      datos.concepto    || ''],
    ['Método de Pago',datos.metodoPago  || ''],
    ['Moneda',        datos.moneda      || 'UYU'],
  ];

  let y = height - 110;
  filas.forEach(([label, value], i) => {
    y -= 22;
    dibujarFila(page, { y, label, value, font, fontBold, width, highlight: i % 2 === 0 });
  });

  // Monto
  const montoY = 80;
  page.drawRectangle({ x: width / 2 - 10, y: montoY - 10, width: width / 2 - 30, height: 55,
    color: rgb(0.95, 0.99, 0.96), borderColor: rgb(0.1, 0.55, 0.2), borderWidth: 1.5 });
  page.drawText('TOTAL INGRESO', { x: width / 2, y: montoY + 30, size: 8, font, color: rgb(0.1, 0.4, 0.1) });
  const montoStr = `${datos.moneda === 'USD' ? 'US$ ' : '$ '}${fmtNum(datos.monto)}`;
  page.drawText(montoStr, { x: width / 2 + 2, y: montoY + 10, size: 16, font: fontBold, color: rgb(0.1, 0.5, 0.2) });

  page.drawText(`Documento interno · ${new Date().toLocaleString('es-UY')}`, {
    x: 30, y: 25, size: 7, font, color: rgb(0.6, 0.6, 0.6),
  });

  const pdfBytes = await doc.save();
  return guardarPDF(pdfBytes, `IG-${String(datos.tcaId || Date.now()).padStart(6, '0')}`, 'ingresos');
};

// ═══════════════════════════════════════════════════════════════════════════════
// TICKET DE VENTA / COBRO (para cuando viene como base64 desde el frontend)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Guarda un PDF recibido como base64 (generado por jsPDF en el frontend).
 * @param {string} nombreDocumento - nombre del archivo (sin extensión)
 * @param {string} pdfBase64 - PDF en base64
 * @param {string} subcarpeta - subcarpeta destino: 'facturas', 'recibos', etc.
 */
const guardarDesdeBase64 = (nombreDocumento, pdfBase64, subcarpeta = 'facturas') => {
  const buffer = Buffer.from(pdfBase64, 'base64');
  const dir    = getBaseDir(subcarpeta);
  const clean  = nombreDocumento.replace(/[<>:"/\\|?*]/g, '_').trim();
  const filePath = path.join(dir, `${clean}.pdf`);
  fs.writeFileSync(filePath, buffer);
  logger.info(`[PDF-SERVICE] Guardado (base64): ${filePath}`);
  return filePath;
};

module.exports = {
  generarPdfEgreso,
  generarPdfIngreso,
  guardarDesdeBase64,
  guardarPDF,
  getBaseDir,
};
