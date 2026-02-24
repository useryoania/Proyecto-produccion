const { getPool, sql } = require('../config/db');
const axios = require('axios');

// 1. Endpoint para cuando hacen click en "Ir a Pagar"
exports.crearIntencionPago = async (req, res) => {
    const { noDocs } = req.body; // Array de NoDocERP: ['DOC-123', 'DOC-124']

    if (!noDocs || noDocs.length === 0) {
        return res.status(400).json({ error: "No se proporcionaron pedidos para cobrar." });
    }

    try {
        const pool = await getPool();

        // Calcular el total de los pedidos enviados consultando la tabla maestra PedidosCobranza
        const request = pool.request();
        const conditions = noDocs.map((doc, i) => {
            request.input(`doc_${i}`, sql.VarChar(50), doc);
            return `@doc_${i}`;
        }).join(',');

        const cobranzasRes = await request.query(`
            SELECT ID, NoDocERP, MontoTotal, Moneda, EstadoCobro, HandyPaymentLink 
            FROM PedidosCobranza 
            WHERE NoDocERP IN (${conditions})
        `);

        if (cobranzasRes.recordset.length === 0) {
            return res.status(404).json({ error: "Ninguno de esos pedidos ha sido sincronizado ni tasado aún." });
        }

        // Revisamos si alguno ya está pagado
        const yaPagados = cobranzasRes.recordset.filter(c => c.EstadoCobro === 'Pagado');
        if (yaPagados.length > 0) {
            return res.status(400).json({ error: "Algunos de los pedidos seleccionados ya están pagados.", pagados: yaPagados.map(p => p.NoDocERP) });
        }

        // Sumar Total a Cobrar
        let totalCents = 0; // Handy y pasarelas suelen preferir céntimos o decimales, sumamos en UYU
        cobranzasRes.recordset.forEach(c => {
            totalCents += parseFloat(c.MontoTotal);
        });

        const invoiceIdStr = "COB-" + Date.now(); // Un ID interno unificado para este cobro múltiple

        // LLAMADA A LA API DE HANDY (Documentación Oficial de tu Pasarela)
        // Ejemplo genérico, deberás colocar tu API KEY de Handy aquí
        const handyApiKey = process.env.HANDY_API_KEY || 'test_api_key';

        let handyLink = '';
        let handyId = '';

        if (handyApiKey && handyApiKey !== 'test_api_key') {
            try {
                // AQUÍ VA LA URL OFICIAL DE HANDY
                // Ojo: Ajusta el body al JSON exacto que pide Handy en su doc (amount, currency, etc)
                const handyApiRes = await axios.post('https://api.handy.app/v1/payment_links', {
                    amount: totalCents,
                    currency: "UY",
                    reference: invoiceIdStr,
                    description: `Pago de pedidos: ${noDocs.join(', ')}`,
                    // webhook_url: `https://tuservidor.com/api/checkout/handy-webhook`
                }, {
                    headers: { 'Authorization': `Bearer ${handyApiKey}` }
                });

                handyLink = handyApiRes.data.payment_url;
                handyId = handyApiRes.data.id;
            } catch (err) {
                console.error("Error contactando a Handy:", err.message);
                return res.status(502).json({ error: "Error en la pasarela de pago. Intente en unos minutos." });
            }
        } else {
            // MODO DESARROLLO / SIMULACIÓN (Si no tienes API key montada todavía)
            console.log("Generando link SIMULADO de Handy por valor de $", totalCents);
            handyId = "mock_" + invoiceIdStr;
            handyLink = `https://mock.handy.app/pay/${handyId}?amount=${totalCents}`;
        }

        // Guardar el Link unificado en TODOS los pedidos que participan de esta bolsa
        const updateReq = pool.request();
        updateReq.input('hId', sql.VarChar, handyId);
        updateReq.input('hLink', sql.VarChar, handyLink);

        for (let i = 0; i < noDocs.length; i++) {
            updateReq.input(`udoc_${i}`, sql.VarChar, noDocs[i]);
            await updateReq.query(`
                UPDATE PedidosCobranza 
                SET HandyPaymentId = @hId, HandyPaymentLink = @hLink, EstadoCobro = 'Pendiente'
                WHERE NoDocERP = @udoc_${i}
            `);
        }

        res.json({ success: true, paymentUrl: handyLink, refId: handyId, totalAmount: totalCents });

    } catch (e) {
        console.error("Error creando intención de pago:", e);
        res.status(500).json({ error: e.message });
    }
};

// 3. Webhook: El endpoint CIEGO donde Handy avisará cuando el cliente pase la tarjeta
exports.handyWebhook = async (req, res) => {
    const payload = req.body;

    // Aquí recibes el JSON de Handy. Dependiendo de si es status = "approved" o "paid"
    console.log("[Handy Webhook] Recibido evento:", JSON.stringify(payload));

    // Handy normalmente envía el ID del pago o la referencia que le pasaste
    const paymentId = payload.payment_id || payload.id;
    const status = payload.status; // 'approved', 'paid', etc.

    if (!paymentId) return res.status(400).send("Bad request");

    // Responderle rápido a Handy para que no siga intentando con el webhook (Best Practice)
    res.status(200).send("OK");

    if (status === 'approved' || status === 'paid') {
        try {
            const pool = await getPool();
            // Marcar todas las ordenes asociadas a este Pago en tu BD como Pagadas!
            const updateRes = await pool.request()
                .input('hId', sql.VarChar, paymentId.toString())
                .query(`
                    UPDATE PedidosCobranza 
                    SET EstadoCobro = 'Pagado', FechaPago = GETDATE()
                    WHERE HandyPaymentId = @hId AND EstadoCobro != 'Pagado'
                `);

            if (updateRes.rowsAffected[0] > 0) {
                console.log(`[Handy Webhook] Se confirmaron pagos de ${updateRes.rowsAffected[0]} pedidos con el Handy ID ${paymentId}`);
            }
        } catch (dbErr) {
            console.error("Error procesando pago en Webhook:", dbErr);
        }
    }
};
