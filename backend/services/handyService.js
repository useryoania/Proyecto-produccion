/**
 * handyService.js — Servicio centralizado para pagos con Handy
 * Elimina duplicación entre webOrdersController y webRetirosController
 */
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { getPool, sql } = require('../config/db');
const logger = require('../utils/logger');

/**
 * Crea un link de pago en Handy y guarda la transacción en HandyTransactions
 * @param {Object} options
 * @param {Array}  options.products     - [{Name, Quantity, Amount, TaxedAmount}]
 * @param {number} options.totalAmount  - Monto total
 * @param {number} options.currencyCode - 840 (USD) o 858 (UYU)
 * @param {string} options.commerceName - Nombre del comercio (ej: "USER", "USER - Retiros")
 * @param {string} options.imageUrl     - URL de la imagen (opcional)
 * @param {Object} options.ordersData   - Datos para guardar en OrdersJson
 * @param {number} options.codCliente   - Código del cliente
 * @param {string} options.logPrefix    - Prefijo para logs (ej: "[HANDY]", "[HANDY RETIRO]")
 * @returns {{ success, url, transactionId, error }}
 */
async function createPaymentLink({
    products,
    totalAmount,
    currencyCode,
    commerceName = 'USER',
    imageUrl = 'https://user.com.uy/assets/images/logo.png',
    ordersData = {},
    codCliente = 0,
    logPrefix = '[HANDY]'
}) {
    const isProduction = process.env.HANDY_ENVIRONMENT === 'production';
    const handySecret = process.env.HANDY_MERCHANT_SECRET;
    const handyUrl = isProduction
        ? 'https://api.payments.handy.uy/api/v2/payments'
        : 'https://api.payments.arriba.uy/api/v2/payments';
    const siteUrl = process.env.SITE_URL || 'https://user.com.uy';

    const transactionId = uuidv4();
    const invoiceNumber = Math.floor(Math.random() * 90000) + 10000;

    const handyPayload = {
        Cart: {
            Currency: currencyCode,
            TotalAmount: Number(Number(totalAmount).toFixed(2)),
            TaxedAmount: Number((Number(totalAmount) / 1.22).toFixed(2)),
            Products: products,
            InvoiceNumber: invoiceNumber,
            LinkImageUrl: imageUrl,
            TransactionExternalId: transactionId
        },
        Client: {
            CommerceName: commerceName,
            SiteUrl: `${siteUrl}/portal/payment-status?txId=${transactionId}`
        },

        CallbackURL: `${siteUrl}/api/web-orders/handy-webhook`,
        ResponseType: "Json"
    };

    logger.info(`${logPrefix} Creando link de pago (${isProduction ? 'PRODUCCIÓN' : 'TESTING'})...`);
    logger.info(`${logPrefix} Payload:`, JSON.stringify(handyPayload));

    let response;
    try {
        response = await axios.post(handyUrl, handyPayload, {
            headers: { 'merchant-secret-key': handySecret }
        });
    } catch (axiosErr) {
        const status = axiosErr.response?.status;
        const rawData = axiosErr.response?.data;
        const headers = axiosErr.response?.headers;
        logger.error(`${logPrefix} ══ ERROR HANDY HTTP ${status} ══`);
        logger.error(`${logPrefix} URL destino:  ${handyUrl}`);
        logger.error(`${logPrefix} Secret key usada (primeros 8 chars): ${String(handySecret || '').substring(0, 8)}...`);
        logger.error(`${logPrefix} Payload enviado: ${JSON.stringify(handyPayload)}`);
        logger.error(`${logPrefix} Response status: ${status}`);
        logger.error(`${logPrefix} Response body:   ${rawData ? JSON.stringify(rawData) : '(vacío)'}`);
        logger.error(`${logPrefix} Content-Type:    ${headers?.['content-type'] || 'N/A'}`);
        logger.error(`${logPrefix} Axios message:   ${axiosErr.message}`);
        return { success: false, error: `Handy HTTP ${status}: ${rawData ? JSON.stringify(rawData) : axiosErr.message}` };
    }

    if (!response.data?.url) {
        logger.error(`${logPrefix} Respuesta inesperada de Handy:`, JSON.stringify(response.data));
        return { success: false, error: 'La pasarela no devolvió una URL válida.' };
    }

    const paymentUrl = response.data.url;
    logger.info(`${logPrefix} Link generado:`, paymentUrl);

    // Guardar en HandyTransactions para reconciliar con el webhook
    try {
        const pool = await getPool();
        const orderIdsJson = JSON.stringify(ordersData);

        await pool.request()
            .input('txId', sql.VarChar(100), transactionId)
            .input('payUrl', sql.VarChar(500), paymentUrl)
            .input('amount', sql.Decimal(18, 2), totalAmount)
            .input('currency', sql.Int, currencyCode)
            .input('ordersJson', sql.NVarChar(sql.MAX), orderIdsJson)
            .input('codCliente', sql.Int, codCliente)
            .query(`
                INSERT INTO HandyTransactions (TransactionId, PaymentUrl, TotalAmount, Currency, OrdersJson, CodCliente, Status, CreatedAt)
                VALUES (@txId, @payUrl, @amount, @currency, @ordersJson, @codCliente, 'Creado', GETDATE())
            `);
        logger.info(`${logPrefix} TransactionId ${transactionId} guardado en HandyTransactions.`);
    } catch (dbErr) {
        logger.warn(`${logPrefix} No se pudo guardar TransactionId en BD:`, dbErr.message);
    }

    return { success: true, url: paymentUrl, transactionId };
}

module.exports = { createPaymentLink };
