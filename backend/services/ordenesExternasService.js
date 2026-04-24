'use strict';

/**
 * ordenesExternasService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Servicio para órdenes "externas" que viajan entre sectores (XSB, XDF, etc.).
 *
 * Problema: En estas órdenes el QR siempre trae los datos del ÚLTIMO sector,
 * pero la cantidad real de material y el producto consumido están en la planilla
 * de Google Sheets (fuente de verdad para el descuento de recursos).
 *
 * Uso:
 *   const svc = require('./ordenesExternasService');
 *
 *   if (svc.esOrdenExterna(codigoOrden)) {
 *     const datos = await svc.getDatosDesdeSheets(codigoOrden);
 *     // datos = { cantidad, idProdReact, material, unidad }
 *   }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const https   = require('https');
const logger  = require('../utils/logger');

// ─── Configuración ───────────────────────────────────────────────────────────

/** Prefijos que identifican órdenes externas (insensible a mayúsculas) */
const PREFIJOS_EXTERNOS = ['XSB', 'XDF'];

/**
 * URL base del Apps Script.
 * Puede sobreescribirse con la variable de entorno ORDENES_EXTERNAS_SCRIPT_URL.
 */
const SCRIPT_URL =
  process.env.ORDENES_EXTERNAS_SCRIPT_URL ||
  `https://script.google.com/macros/s/AKfycbxwGN0blqb4Loka9nHgYHf83eM33d5fJ7o1Ugo4qbiV81VClM6RcK9S_pjwnauq6y8i/exec`;

/** Timeout en ms para la llamada al script (default: 8 segundos) */
const TIMEOUT_MS = parseInt(process.env.ORDENES_EXTERNAS_TIMEOUT_MS || '8000', 10);

// ─── Funciones públicas ───────────────────────────────────────────────────────

/**
 * esOrdenExterna
 * Determina si un código de orden corresponde a una orden externa
 * (XSB, XDF, etc.) que requiere consultar la planilla.
 *
 * @param {string} codigoOrden  Ej: "XSB-2024-00123" o "XDF001"
 * @returns {boolean}
 */
function esOrdenExterna(codigoOrden) {
  if (!codigoOrden) return false;
  const upper = codigoOrden.toUpperCase().trim();
  return PREFIJOS_EXTERNOS.some(prefijo => upper.startsWith(prefijo));
}

/**
 * getDatosDesdeSheets
 * Consulta el Apps Script de Google Sheets para obtener la cantidad real
 * de material y el producto de una orden externa.
 *
 * La API debe responder con:
 * {
 *   ok:          true,
 *   codigoOrden: "XSB-2024-00123",
 *   cantidad:    5.20,          ← metros/kg reales
 *   idProdReact: 14,            ← IDProdReact del artículo (mismo que usa el QR)
 *   material:    "DTF 60cm",    ← solo para logging / trazabilidad
 *   unidad:      "m"            ← solo para logging
 * }
 *
 * En caso de error:
 * { ok: false, error: "Orden no encontrada" }
 *
 * @param {string} codigoOrden
 * @returns {Promise<{cantidad: number, idProdReact: number, material: string, unidad: string}>}
 * @throws {Error} si la API no responde, falla o devuelve ok=false
 */
async function getDatosDesdeSheets(codigoOrden) {
  const apiKey = process.env.INTEGRATION_API_KEY || '';

  const params = new URLSearchParams({
    action:       'getCantidadMaterial',
    codigoOrden:  codigoOrden.trim(),
    apiKey,
  });

  const url = `${SCRIPT_URL}?${params.toString()}`;

  logger.info(`[EXTERNAS] Consultando Sheets para orden ${codigoOrden}...`);

  const raw = await _fetchConTimeout(url, TIMEOUT_MS);

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`[EXTERNAS] Respuesta no es JSON válido para orden ${codigoOrden}: ${raw.slice(0, 100)}`);
  }

  if (!data.ok) {
    throw new Error(`[EXTERNAS] Sheets respondió error para ${codigoOrden}: ${data.error || 'sin detalle'}`);
  }

  const cantidad    = parseFloat(data.cantidad);
  const idProdReact = parseInt(data.idProdReact, 10);

  if (isNaN(cantidad) || cantidad <= 0) {
    throw new Error(`[EXTERNAS] Cantidad inválida desde Sheets para ${codigoOrden}: cantidad=${data.cantidad}`);
  }
  if (isNaN(idProdReact) || idProdReact <= 0) {
    throw new Error(`[EXTERNAS] IDProdReact inválido para ${codigoOrden}: idProdReact=${data.idProdReact} (material="${data.material}" sin mapeo)`);
  }


  logger.info(`[EXTERNAS] Sheets → ${codigoOrden}: cantidad=${cantidad}, idProdReact=${idProdReact}, material="${data.material}"`);

  return {
    cantidad,
    idProdReact,
    material: data.material || '',
    unidad:   data.unidad   || '',
  };
}


// ─── Helper interno ──────────────────────────────────────────────────────────

/**
 * Hace un GET HTTP con timeout.
 * Necesario porque https.get nativo no tiene timeout propio.
 *
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<string>}  Body de la respuesta como texto
 */
function _fetchConTimeout(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, (res) => {
      // Seguir redirects (Apps Script redirige a la URL final)
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        const redirectUrl = res.headers.location;
        if (!redirectUrl) {
          return reject(new Error(`[EXTERNAS] Redirect sin Location header`));
        }
        return _fetchConTimeout(redirectUrl, timeoutMs).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        return reject(new Error(`[EXTERNAS] HTTP ${res.statusCode} para ${url}`));
      }

      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve(body));
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy();
      reject(new Error(`[EXTERNAS] Timeout (${timeoutMs}ms) consultando Sheets`));
    });

    request.on('error', reject);
  });
}


// ─── Exports ─────────────────────────────────────────────────────────────────

module.exports = {
  esOrdenExterna,
  getDatosDesdeSheets,
  PREFIJOS_EXTERNOS,
};
