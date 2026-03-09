const { getPool, sql } = require('../config/db');
const axios = require('axios');
const moment = require('moment-timezone');
const { marcarEntregado, registrarPago } = require('../services/retiroService');

// Importar funciones del controller de órdenes de retiro local
const ordenesRetiroController = require('./ordenesRetiroController');

/**
 * Endpoint nativo para recibir y registrar directamente un retiro web.
 * Actualiza OrdenesRetiro con los datos de pago recibidos.
 */
exports.crearRetiro = async (req, res) => {
    const { OrdIdRetiro, Monto, Moneda, ReferenciaPago } = req.body;

    if (!OrdIdRetiro) {
        return res.status(400).json({ error: "Falta el id de orden de retiro (OrdIdRetiro)" });
    }

    try {
        const pool = await getPool();
        const OReId = parseInt(OrdIdRetiro.replace(/^R-0*/, ''), 10);

        // Actualizar la orden de retiro existente con datos de pago
        await pool.request()
            .input('OReId', sql.Int, OReId)
            .input('Monto', sql.Decimal(18, 2), Monto || null)
            .input('Moneda', sql.VarChar(10), Moneda || null)
            .input('Ref', sql.VarChar(200), ReferenciaPago || null)
            .query(`
                UPDATE OrdenesRetiro SET 
                    OReCostoTotalOrden = COALESCE(@Monto, OReCostoTotalOrden),
                    MonIdMoneda = COALESCE(@Moneda, MonIdMoneda),
                    ReferenciaPagoOnline = COALESCE(@Ref, ReferenciaPagoOnline)
                WHERE OReIdOrdenRetiro = @OReId
            `);

        res.status(201).json({ success: true, message: 'Retiro actualizado en OrdenesRetiro', id: OrdIdRetiro });

    } catch (err) {
        console.error("Error al registrar retiro web local:", err);
        res.status(500).json({ error: err.message });
    }
};

// DESHABILITADO: runSyncRetirosCore — loop circular (lee y reescribe la misma DB).
// Los datos ya se crean correctamente desde crearRetiro. Ver audit 2025-03-09.
// Se comenta con // porque el regex /^R-0*/ contiene */ que rompe block comments.
//
// const runSyncRetirosCore = async () => {
//     const pool = await getPool();
//     const transaction = new sql.Transaction(pool);
//
//     const queryResult = await pool.request().query(`
//         SELECT 
//             r.OReIdOrdenRetiro, r.OReCostoTotalOrden, r.OReFechaAlta, r.OReUsuarioAlta,
//             r.OReEstadoActual, r.PagIdPago, r.ORePasarPorCaja,
//             lr.LReNombreLugar AS lugarRetiro,
//             er.EORNombreEstado AS estado,
//             o.OrdIdOrden AS orderId, o.OrdCodigoOrden AS orderNumber,
//             o.OrdEstadoActual AS orderEstado, o.OrdCostoFinal as costoFinal,
//             monOrden.MonSimbolo AS orderMonedaSimbolo,
//             p.MPaIdMetodoPago AS orderIdMetodoPago,
//             mp.MPaDescripcionMetodo AS orderMetodoPago,
//             monPago.MonSimbolo AS monetPagoSimbolo,
//             p.PagMontoPago AS orderMontoPago, p.PagFechaPago AS orderFechaPago,
//             p.PagRutaComprobante AS comprobante,
//             c.CodigoReact AS CliCodigoCliente, c.Tipo AS TClDescripcion
//         FROM OrdenesRetiro r WITH(NOLOCK)
//         LEFT JOIN LugaresRetiro lr WITH(NOLOCK) ON lr.LReIdLugarRetiro = r.LReIdLugarRetiro
//         LEFT JOIN EstadosOrdenesRetiro er WITH(NOLOCK) ON er.EORIdEstadoOrden = r.OReEstadoActual
//         LEFT JOIN OrdenesDeposito o WITH(NOLOCK) ON o.OReIdOrdenRetiro = r.OReIdOrdenRetiro
//         LEFT JOIN Monedas monOrden WITH(NOLOCK) ON monOrden.MonIdMoneda = o.MonIdMoneda
//         LEFT JOIN Pagos p WITH(NOLOCK) ON p.PagIdPago = o.PagIdPago
//         LEFT JOIN Monedas monPago WITH(NOLOCK) ON monPago.MonIdMoneda = p.PagIdMonedaPago
//         LEFT JOIN MetodosPagos mp WITH(NOLOCK) ON mp.MPaIdMetodoPago = p.MPaIdMetodoPago
//         LEFT JOIN Clientes c WITH(NOLOCK) ON c.CliIdCliente = o.CliIdCliente
//         WHERE r.OReEstadoActual IN (1,3,4,7,8,5,6)
//         AND (CAST(DATEADD(d,-7,GETDATE()) AS DATE) <= CAST(r.OReFechaAlta AS DATE) OR r.OReEstadoActual NOT IN (5,6))
//     `);
//
//     const map = {};
//     for (const row of queryResult.recordset) {
//         if (!map[row.OReIdOrdenRetiro]) {
//             map[row.OReIdOrdenRetiro] = {
//                 ordenDeRetiro: `R-${String(row.OReIdOrdenRetiro).padStart(4, '0')}`,
//                 totalCost: parseFloat(row.OReCostoTotalOrden).toFixed(2),
//                 lugarRetiro: row.lugarRetiro || 'Desconocido',
//                 fechaAlta: row.OReFechaAlta,
//                 usuarioAlta: row.OReUsuarioAlta,
//                 estado: row.estado || 'Desconocido',
//                 pagorealizado: row.PagIdPago ? 1 : 0,
//                 metodoPago: row.orderMetodoPago,
//                 montopagorealizado: row.PagIdPago ? `${row.monetPagoSimbolo || ''} ${parseFloat(row.orderMontoPago || 0).toFixed(2)}` : null,
//                 fechapagooden: row.orderFechaPago,
//                 comprobante: row.comprobante,
//                 CliCodigoCliente: row.CliCodigoCliente || 'Desconocido',
//                 TClDescripcion: row.TClDescripcion || 'Desconocido',
//                 orders: []
//             };
//         }
//         if (row.orderId) {
//             map[row.OReIdOrdenRetiro].orders.push({
//                 orderNumber: row.orderNumber, orderId: row.orderId,
//                 orderEstado: row.orderEstado,
//                 orderCosto: row.orderMonedaSimbolo ? `${row.orderMonedaSimbolo} ${parseFloat(row.costoFinal).toFixed(2)}` : null,
//                 orderIdMetodoPago: row.orderIdMetodoPago,
//                 orderMetodoPago: row.orderMetodoPago,
//                 orderPago: row.monetPagoSimbolo ? `${row.monetPagoSimbolo} ${parseFloat(row.orderMontoPago).toFixed(2)}` : null,
//                 orderFechaPago: row.orderFechaPago
//             });
//         }
//     }
//     const retirosExternos = Object.values(map);
//
//     await transaction.begin();
//
//     try {
//         for (const ret of retirosExternos) {
//             let estadoNumerico = 1;
//             if (ret.estado.includes('Abonado') || ret.estado.includes('Abonado de antemano')) estadoNumerico = 3;
//             if (ret.estado.includes('Empaquetado sin abonar')) estadoNumerico = 7;
//             if (ret.estado.includes('Empaquetado y abonado')) estadoNumerico = 8;
//             if (ret.estado.includes('Entregado')) estadoNumerico = 5;
//             if (ret.estado.includes('Cancelar')) estadoNumerico = 6;
//
//             const updateQuery = `
//                 UPDATE OrdenesRetiro SET 
//                     OReEstadoActual = @Estado,
//                     OReCostoTotalOrden = COALESCE(@Monto, OReCostoTotalOrden),
//                     ReferenciaPagoOnline = COALESCE(@RefPago, ReferenciaPagoOnline),
//                     CodCliente = COALESCE(@CodCliente, CodCliente),
//                     MonIdMoneda = COALESCE(@Moneda, MonIdMoneda),
//                     FormaRetiro = COALESCE(FormaRetiro, 'RW'),
//                     OReFechaEstadoActual = GETDATE()
//                 WHERE OReIdOrdenRetiro = @OReId
//             `;
//
//             let montoLimpio = null;
//             let monedaLimpia = null;
//             if (ret.montopagorealizado && ret.montopagorealizado !== 'NaN') {
//                 const partes = ret.montopagorealizado.split(' ');
//                 if (partes.length === 2) {
//                     monedaLimpia = partes[0] === '$' ? 'UYU' : partes[0];
//                     montoLimpio = parseFloat(partes[1].replace(/,/g, ''));
//                 }
//             } else if (ret.totalCost && ret.totalCost !== 'NaN') {
//                 montoLimpio = parseFloat(ret.totalCost);
//             }
//
//             const OReId = parseInt(ret.ordenDeRetiro.replace(/^R-0*/, ''), 10);
//             if (isNaN(OReId)) continue;
//
//             await new sql.Request(transaction)
//                 .input('OReId', sql.Int, OReId)
//                 .input('Monto', sql.Decimal(18, 2), montoLimpio)
//                 .input('Moneda', sql.VarChar(10), monedaLimpia || 'UYU')
//                 .input('Estado', sql.Int, estadoNumerico)
//                 .input('RefPago', sql.VarChar(200), ret.comprobante || null)
//                 .input('CodCliente', sql.Int, ret.CliCodigoCliente ? parseInt(ret.CliCodigoCliente, 10) : null)
//                 .query(updateQuery);
//         }
//
//         await transaction.commit();
//         return { success: true, count: retirosExternos.length, message: `${retirosExternos.length} retiros sincronizados con éxito.` };
//
//     } catch (innerErr) {
//         await transaction.rollback();
//         throw innerErr;
//     }
// };

<<<<<<< HEAD
    // Query directa a DB en vez de llamar al legacy API
    const queryResult = await pool.request().query(`
        SELECT 
            r.OReIdOrdenRetiro, r.OReCostoTotalOrden, r.OReFechaAlta, r.OReUsuarioAlta,
            r.OReEstadoActual, r.PagIdPago, r.ORePasarPorCaja,
            fe.Nombre AS lugarRetiro,
            er.EORNombreEstado AS estado,
            o.OrdIdOrden AS orderId, o.OrdCodigoOrden AS orderNumber,
            o.OrdEstadoActual AS orderEstado, o.OrdCostoFinal as costoFinal,
            monOrden.MonSimbolo AS orderMonedaSimbolo,
            p.MPaIdMetodoPago AS orderIdMetodoPago,
            mp.MPaDescripcionMetodo AS orderMetodoPago,
            monPago.MonSimbolo AS monetPagoSimbolo,
            p.PagMontoPago AS orderMontoPago, p.PagFechaPago AS orderFechaPago,
            p.PagRutaComprobante AS comprobante,
            c.CodigoReact AS CliCodigoCliente, c.Tipo AS TClDescripcion
        FROM OrdenesRetiro r WITH(NOLOCK)
        LEFT JOIN FormasEnvio fe WITH(NOLOCK) ON fe.ID = r.LReIdLugarRetiro
        LEFT JOIN EstadosOrdenesRetiro er WITH(NOLOCK) ON er.EORIdEstadoOrden = r.OReEstadoActual
        LEFT JOIN OrdenesDeposito o WITH(NOLOCK) ON o.OReIdOrdenRetiro = r.OReIdOrdenRetiro
        LEFT JOIN Monedas monOrden WITH(NOLOCK) ON monOrden.MonIdMoneda = o.MonIdMoneda
        LEFT JOIN Pagos p WITH(NOLOCK) ON p.PagIdPago = o.PagIdPago
        LEFT JOIN Monedas monPago WITH(NOLOCK) ON monPago.MonIdMoneda = p.PagIdMonedaPago
        LEFT JOIN MetodosPagos mp WITH(NOLOCK) ON mp.MPaIdMetodoPago = p.MPaIdMetodoPago
        LEFT JOIN Clientes c WITH(NOLOCK) ON c.CliIdCliente = o.CliIdCliente
        WHERE r.OReEstadoActual IN (1,3,4,7,8,5,6)
        AND (CAST(DATEADD(d,-7,GETDATE()) AS DATE) <= CAST(r.OReFechaAlta AS DATE) OR r.OReEstadoActual NOT IN (5,6))
    `);

    // Procesar filas igual que ordenesRetiroController
    const map = {};
    for (const row of queryResult.recordset) {
        if (!map[row.OReIdOrdenRetiro]) {
            map[row.OReIdOrdenRetiro] = {
                ordenDeRetiro: `R-${String(row.OReIdOrdenRetiro).padStart(4, '0')}`,
                totalCost: parseFloat(row.OReCostoTotalOrden).toFixed(2),
                lugarRetiro: row.lugarRetiro || 'Desconocido',
                fechaAlta: row.OReFechaAlta,
                usuarioAlta: row.OReUsuarioAlta,
                estado: row.estado || 'Desconocido',
                pagorealizado: row.PagIdPago ? 1 : 0,
                metodoPago: row.orderMetodoPago,
                montopagorealizado: row.PagIdPago ? `${row.monetPagoSimbolo || ''} ${parseFloat(row.orderMontoPago || 0).toFixed(2)}` : null,
                fechapagooden: row.orderFechaPago,
                comprobante: row.comprobante,
                CliCodigoCliente: row.CliCodigoCliente || 'Desconocido',
                TClDescripcion: row.TClDescripcion || 'Desconocido',
                orders: []
            };
        }
        if (row.orderId) {
            map[row.OReIdOrdenRetiro].orders.push({
                orderNumber: row.orderNumber, orderId: row.orderId,
                orderEstado: row.orderEstado,
                orderCosto: row.orderMonedaSimbolo ? `${row.orderMonedaSimbolo} ${parseFloat(row.costoFinal).toFixed(2)}` : null,
                orderIdMetodoPago: row.orderIdMetodoPago,
                orderMetodoPago: row.orderMetodoPago,
                orderPago: row.monetPagoSimbolo ? `${row.monetPagoSimbolo} ${parseFloat(row.orderMontoPago).toFixed(2)}` : null,
                orderFechaPago: row.orderFechaPago
            });
        }
    }
    const retirosExternos = Object.values(map);

    await transaction.begin();

    try {
        for (const ret of retirosExternos) {
            let estadoNumerico = 1;
            if (ret.estado.includes('Abonado') || ret.estado.includes('Abonado de antemano')) estadoNumerico = 3;
            if (ret.estado.includes('Empaquetado sin abonar')) estadoNumerico = 7;
            if (ret.estado.includes('Empaquetado y abonado')) estadoNumerico = 8;
            if (ret.estado.includes('Entregado')) estadoNumerico = 5;
            if (ret.estado.includes('Cancelar')) estadoNumerico = 6;

            const updateQuery = `
                UPDATE OrdenesRetiro SET 
                    OReEstadoActual = @Estado,
                    OReCostoTotalOrden = COALESCE(@Monto, OReCostoTotalOrden),
                    ReferenciaPagoOnline = COALESCE(@RefPago, ReferenciaPagoOnline),
                    CodCliente = COALESCE(@CodCliente, CodCliente),
                    MonIdMoneda = COALESCE(@Moneda, MonIdMoneda),
                    FormaRetiro = COALESCE(FormaRetiro, 'RW'),
                    OReFechaEstadoActual = GETDATE()
                WHERE OReIdOrdenRetiro = @OReId
            `;

            let montoLimpio = null;
            let monedaLimpia = null;
            if (ret.montopagorealizado && ret.montopagorealizado !== 'NaN') {
                const partes = ret.montopagorealizado.split(' ');
                if (partes.length === 2) {
                    monedaLimpia = partes[0] === '$' ? 'UYU' : partes[0];
                    montoLimpio = parseFloat(partes[1].replace(/,/g, ''));
                }
            } else if (ret.totalCost && ret.totalCost !== 'NaN') {
                montoLimpio = parseFloat(ret.totalCost);
            }

            // Extraer ID numérico de la orden de retiro
            const OReId = parseInt(ret.ordenDeRetiro.replace(/^R-0*/, ''), 10);
            if (isNaN(OReId)) continue;

            await new sql.Request(transaction)
                .input('OReId', sql.Int, OReId)
                .input('Monto', sql.Decimal(18, 2), montoLimpio)
                .input('Moneda', sql.VarChar(10), monedaLimpia || 'UYU')
                .input('Estado', sql.Int, estadoNumerico)
                .input('RefPago', sql.VarChar(200), ret.comprobante || null)
                .input('CodCliente', sql.Int, ret.CliCodigoCliente ? parseInt(ret.CliCodigoCliente, 10) : null)
                .query(updateQuery);
        }

        await transaction.commit();
        return { success: true, count: retirosExternos.length, message: `${retirosExternos.length} retiros sincronizados con éxito.` };

    } catch (innerErr) {
        await transaction.rollback();
        throw innerErr;
    }
};
=======
>>>>>>> df4442e9b00356d953724662fc79be5416a11af2

/**
 * Sincronizar retiros desde la API Central
 */
exports.sincronizarRetirosWeb = async (req, res) => {
    // Sync deshabilitado: la DB es la fuente de verdad
    res.json({ success: true, count: 0, message: 'Sincronización deshabilitada: DB es fuente de verdad.' });
};

/**
 * Reportar un Pago hecho en esta plataforma a la API central
 */
exports.reportarPagoRetiro = async (req, res) => {
    const { ordenRetiro, monto, monedaId, metodoPagoId, orderNumbers } = req.body;

    try {
        const pool = await getPool();
        const ordenRetiroId = parseInt(ordenRetiro.replace(/^R-0*/, ''), 10);
        if (isNaN(ordenRetiroId)) return res.status(400).json({ error: "ordenRetiro inválido" });

        console.log(`[REPORTAR PAGO] Procesando pago directo para ${ordenRetiro} (ID: ${ordenRetiroId})`);

        // Validar que exista la orden
        const ordRetResult = await pool.request()
            .input('ID', sql.Int, ordenRetiroId)
            .query('SELECT OReEstadoActual FROM OrdenesRetiro WITH(NOLOCK) WHERE OReIdOrdenRetiro = @ID');

        if (ordRetResult.recordset.length === 0) throw new Error(`Orden de retiro ${ordenRetiroId} no encontrada`);

        const estadoActual = ordRetResult.recordset[0].OReEstadoActual;
        const nuevoEstado = estadoActual === 1 ? 3 : 8;
        const usuarioId = req.user?.id || 70;

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            const { pagoId } = await registrarPago(transaction, {
                ordenRetiroId, metodoPagoId, monedaId, monto, orderNumbers, usuarioId, nuevoEstado
            });

            await transaction.commit();

            // OrdenesRetiro ya fue actualizada arriba (reportarPago actualiza PagIdPago)

            const io = req.app.get('socketio');
            if (io) {
                io.emit('actualizado', { type: 'actualizacion' });
                io.emit('retiros:update', { type: 'pago_web' }); // Notifica WebRetirosPage del pago web
            }

            res.json({ success: true, message: 'Pago registrado correctamente.', pagoId });

        } catch (txErr) {
            try { await transaction.rollback(); } catch (e) { }
            throw txErr;
        }

    } catch (err) {
        console.error("Error al reportar pago:", err);
        res.status(500).json({ error: "Fallo al procesar el pago", details: err.message });
    }
};

/**
 * Traer lista completa de retiros actuales que existen localmente en la base
 */
exports.getAllLocalRetiros = async (req, res) => {
    try {
        const pool = await getPool();
        const query = `
            SELECT 
                COALESCE(r.FormaRetiro, 'R') + '-' + CAST(r.OReIdOrdenRetiro AS VARCHAR) AS OrdIdRetiro,
                r.OReCostoTotalOrden AS Monto,
                r.MonIdMoneda AS Moneda,
                r.ReferenciaPagoOnline AS ReferenciaPago,
                r.OReEstadoActual AS Estado,
                r.CodCliente,
                r.OReFechaAlta AS Fecha,
                r.FormaRetiro,
                c.Nombre AS NombreCliente,
                (
                    SELECT STRING_AGG(od.OrdCodigoOrden, ',')
                    FROM RelOrdenesRetiroOrdenes rel WITH(NOLOCK)
                    JOIN OrdenesDeposito od WITH(NOLOCK) ON od.OrdIdOrden = rel.OrdIdOrden
                    WHERE rel.OReIdOrdenRetiro = r.OReIdOrdenRetiro
                ) AS OrdenesCodigos
            FROM OrdenesRetiro r WITH(NOLOCK)
            LEFT JOIN Clientes c WITH(NOLOCK) ON c.CodCliente = r.CodCliente
            ORDER BY r.OReFechaAlta DESC
        `;
        const result = await pool.request().query(query);
        res.json(result.recordset);
    } catch (err) {
        console.error("Error get_local_retiros:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * Traer lista de retiros de un cliente específico que estén pendientes de pago (Estado 1)
 */
exports.getMyRetirosPendientes = async (req, res) => {
    try {
        const codCliente = req.user?.codCliente || req.user?.id;
        if (!codCliente) return res.status(401).json({ error: "Usuario sin código de cliente" });

        // Sync deshabilitado: la DB ya es la fuente de verdad
        // try { await runSyncRetirosCore(); } catch (syncErr) { }

        const pool = await getPool();
        const query = `
            SELECT 
                COALESCE(r.FormaRetiro, 'R') + '-' + CAST(r.OReIdOrdenRetiro AS VARCHAR) AS OrdIdRetiro,
                r.OReCostoTotalOrden AS Monto,
                r.MonIdMoneda AS Moneda,
                r.ReferenciaPagoOnline AS ReferenciaPago,
                r.OReEstadoActual AS Estado,
                r.CodCliente,
                r.OReFechaAlta AS Fecha,
                r.FormaRetiro
            FROM OrdenesRetiro r WITH(NOLOCK)
            WHERE r.CodCliente = @codCliente
              AND r.OReEstadoActual IN (1, 7)
            ORDER BY r.OReFechaAlta DESC
        `;
        const result = await pool.request()
            .input('codCliente', sql.Int, parseInt(codCliente, 10))
            .query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error("Error get_my_retiros_pendientes:", err);
        res.status(500).json({ error: err.message });
    }
};

/**
 * GENERAR LINK DE PAGO PARA UN RETIRO (HANDY)
 */
exports.createHandyPaymentLinkForRetiro = async (req, res) => {
    try {
        const { ordenRetiro, totalAmount, activeCurrency, bultosJSON } = req.body;

        if (!ordenRetiro) {
            return res.status(400).json({ error: "No se proporcionó orden de retiro." });
        }

        let currencyCode = activeCurrency === 'USD' ? 840 : 858;

        // Determinar description
        let products = [];
        try {
            const parsedBultos = JSON.parse(bultosJSON || "[]");
            products = parsedBultos.map(b => ({
                name: (b.orderNumber || b.id || 'Pedido').substring(0, 50),
                quantity: 1,
                amount: b.amount ? Number(Number(b.amount).toFixed(2)) : 0,
                taxedAmount: 0
            }));
        } catch (e) {
            products = [{
                name: "Orden " + ordenRetiro,
                quantity: 1,
                amount: Number(Number(totalAmount).toFixed(2)),
                taxedAmount: 0
            }];
        }

        // Si el parsing dio un total de 0
        if (products.reduce((acc, p) => acc + p.amount, 0) === 0) {
            products = [{
                name: "Orden " + ordenRetiro,
                quantity: 1,
                amount: Number(Number(totalAmount).toFixed(2)),
                taxedAmount: 0
            }];
        }

        const { createPaymentLink } = require('../services/handyService');

        // Construir ordersData para guardar en HandyTransactions
        let parsedBultos = [];
        try { parsedBultos = JSON.parse(bultosJSON || '[]'); } catch (e) { }

        const result = await createPaymentLink({
            products: products.map(p => ({
                Name: (p.name || 'Pedido').substring(0, 50),
                Quantity: p.quantity || 1,
                Amount: p.amount || 0,
                TaxedAmount: p.taxedAmount || 0
            })),
            totalAmount,
            currencyCode,
            commerceName: 'USER - Retiros',
            ordersData: {
                orders: parsedBultos.map(b => ({
                    id: b.orderNumber || b.id || ordenRetiro,
                    desc: b.desc || b.orderNumber || 'Pedido',
                    amount: b.amount || 0
                })),
                ordenRetiro: ordenRetiro,
                reactOrderNumbers: parsedBultos.map(b => b.orderId || b.id).filter(Boolean)
            },
            codCliente: req.user?.codCliente || 0,
            logPrefix: '[HANDY RETIRO]'
        });

        if (!result.success) {
            return res.status(500).json({ error: result.error });
        }

        // Actualizar la ReferenciaPagoOnline en OrdenesRetiro
        try {
            const pool = await getPool();
            const OReId = parseInt(String(ordenRetiro).replace(/^R-0*/, ''), 10);
            await pool.request()
                .input('OReId', sql.Int, OReId)
                .input('Ref', sql.VarChar(200), result.transactionId)
                .query(`UPDATE OrdenesRetiro SET ReferenciaPagoOnline = @Ref WHERE OReIdOrdenRetiro = @OReId`);
        } catch (dbErr) {
            console.warn("[HANDY RETIRO] No se pudo actualizar ReferenciaPagoOnline:", dbErr.message);
        }

        return res.json({ success: true, url: result.url, transactionId: result.transactionId });

    } catch (err) {
        console.error("Error creating Handy link for Retiro:", err.response?.data || err.message);
        res.status(500).json({ error: err.response?.data?.message || err.message });
    }
};

/**
 * OBTENER ESTADO DE TODOS LOS ESTANTES 
 */
exports.obtenerMapaEstantes = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                c.EstanteID, 
                c.Seccion, 
                c.Posicion, 
                c.EstanteID + '-' + CAST(c.Seccion AS VARCHAR) + '-' + CAST(c.Posicion AS VARCHAR) AS UbicacionID,
                c.Activo,
                o.OrdenRetiro,
                o.CodigoCliente,
                cli.Nombre as ClientName,
                o.BultosJSON,
                o.Pagado,
                CASE WHEN orr.ReferenciaPagoOnline IS NOT NULL AND orr.ReferenciaPagoOnline <> '' THEN 1 ELSE 0 END AS PagoHandy,
                o.FechaUbicacion
            FROM ConfiguracionEstantes c
            LEFT JOIN OcupacionEstantes o 
                ON c.EstanteID = o.EstanteID AND c.Seccion = o.Seccion AND c.Posicion = o.Posicion
            LEFT JOIN Clientes cli ON CAST(o.CodigoCliente AS VARCHAR) = CAST(cli.CodCliente AS VARCHAR)
            LEFT JOIN OrdenesRetiro orr ON o.OrdenRetiro = 'R-' + CAST(orr.OReIdOrdenRetiro AS VARCHAR)
            WHERE c.Activo = 1
            ORDER BY c.EstanteID, c.Seccion, c.Posicion
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: "Error al obtener mapa estantes", details: err.message });
    }
};

/**
 * EMPAQUETAR Y ASIGNAR A ESTANTE
 */
exports.asignarRetiroAEstante = async (req, res) => {
    const { estanteId, seccion, posicion, ordenRetiro, codigoCliente, bultos, pagado, scannedValues } = req.body;

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // Eliminamos la comprobación de ocupación única para permitir múltiple
            // const checkQuery = ...

            await new sql.Request(transaction)
                .input('e', sql.Char, estanteId)
                .input('s', sql.Int, seccion)
                .input('p', sql.Int, posicion)
                .input('o', sql.VarChar, ordenRetiro)
                .input('c', sql.VarChar, codigoCliente)
                .input('b', sql.NVarChar, JSON.stringify(bultos))
                .input('pag', sql.Bit, pagado ? 1 : 0)
                .query(`
                    INSERT INTO OcupacionEstantes (EstanteID, Seccion, Posicion, OrdenRetiro, CodigoCliente, BultosJSON, Pagado)
                    VALUES (@e, @s, @p, @o, @c, @b, @pag)
                `);

            const nuevoEstado = pagado ? 8 : 7;
            const ubicacionString = `${estanteId}-${seccion}-${posicion}`;

            // 4. Marcar pronto en DB directamente (dentro de la misma transacción)
            const OReIdOrdenRetiro = parseInt(ordenRetiro.replace(/^R-0*/, ''), 10);
            const fechaPronto = moment().tz('America/Montevideo').format('YYYY-MM-DD HH:mm:ss');
            const UsuarioAlta = req.user?.id || 70;

            // Generar lista de códigos de órdenes escaneadas
            const bultosLimpios = (scannedValues || []).filter(val => val && val.trim() !== '');
            if (bultosLimpios.length > 0) {
                const scanReq = new sql.Request(transaction);
                scanReq.input('FecPronto', sql.DateTime, new Date(fechaPronto));
                scanReq.input('UsrAlta', sql.Int, UsuarioAlta);
                bultosLimpios.forEach((v, i) => {
                    scanReq.input(`sv${i}`, sql.VarChar, v.trim());
                });
                const inParams = bultosLimpios.map((_, i) => `@sv${i}`).join(',');

                await scanReq.query(`
                    INSERT INTO HistoricoEstadosOrdenes (OrdIdOrden, EOrIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta)
                    SELECT OrdIdOrden, 7, @FecPronto, @UsrAlta
                    FROM OrdenesDeposito WHERE OrdCodigoOrden IN (${inParams});
                    
                    UPDATE OrdenesDeposito SET OrdEstadoActual = 7, OrdFechaEstadoActual = @FecPronto WHERE OrdCodigoOrden IN (${inParams});
                `);
            }

            // Actualizar estado de la orden de retiro
            const retRes = await new sql.Request(transaction)
                .input('ID', sql.Int, OReIdOrdenRetiro)
                .query('SELECT OReEstadoActual FROM OrdenesRetiro WITH(NOLOCK) WHERE OReIdOrdenRetiro = @ID');

            if (retRes.recordset.length > 0) {
                const nuevoEstado = retRes.recordset[0].OReEstadoActual === 1 ? 7 : 8;
                await new sql.Request(transaction)
                    .input('ID', sql.Int, OReIdOrdenRetiro)
                    .input('EstID', sql.Int, nuevoEstado)
                    .input('Fec', sql.DateTime, new Date(fechaPronto))
                    .input('Usr', sql.Int, UsuarioAlta)
                    .query(`
                        UPDATE OrdenesRetiro SET OReEstadoActual = @EstID, OReFechaEstadoActual = @Fec WHERE OReIdOrdenRetiro = @ID;
                        INSERT INTO HistoricoEstadosOrdenesRetiro (OReIdOrdenRetiro, EORIdEstadoOrden, HEOFechaEstado, HEOUsuarioAlta) VALUES (@ID, @EstID, @Fec, @Usr);
                    `);
            }

            console.log(`[PRONTO] OK ${ordenRetiro}`);

            await transaction.commit();

            // EMITIR EVENTO SOCKET.IO
            const io = req.app.get('socketio');
            if (io) io.emit('retiros:update');

            res.json({ success: true, message: 'Ubicación asignada y notificada a central' });

        } catch (err) {
            await transaction.rollback();
            throw err;
        }

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

/**
 * ENTREGAR AL CLIENTE
 */
exports.marcarRetiroEntregado = async (req, res) => {
    const { ubicacionId } = req.params;

    try {
        const pool = await getPool();

        // Parsear ubicacionId "A-1-2" → estanteId=A, seccion=1, posicion=2
        const parts = ubicacionId.split('-');
        const estId = parts[0];
        const sec = parseInt(parts[1], 10);
        const pos = parseInt(parts[2], 10);

        // Buscar a qué retiro pertenece antes de borrar
        const ubiRes = await pool.request()
            .input('estId', sql.Char, estId)
            .input('sec', sql.Int, sec)
            .input('pos', sql.Int, pos)
            .query('SELECT OrdenRetiro FROM OcupacionEstantes WHERE EstanteID = @estId AND Seccion = @sec AND Posicion = @pos');

        if (ubiRes.recordset.length === 0) {
            return res.status(404).json({ error: "Ubicación no encontrada" });
        }

        const ordenesDeRetiro = ubiRes.recordset.map(row => row.OrdenRetiro);

        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Liberar el Estante Físico (todas las filas de esa posición)
            await new sql.Request(transaction)
                .input('estId', sql.Char, estId)
                .input('sec', sql.Int, sec)
                .input('pos', sql.Int, pos)
                .query('DELETE FROM OcupacionEstantes WHERE EstanteID = @estId AND Seccion = @sec AND Posicion = @pos');

            // 2. OrdenesRetiro se actualiza en el paso 3 abajo (Estado=5)

            // 3. Marcar entregadas en DB directamente
            const fechaEntrega = moment().tz('America/Montevideo').format('YYYY-MM-DD HH:mm:ss');
            const UsuarioAlta = req.user?.id || 70;

            for (const ord of ordenesDeRetiro) {
                const OReId = parseInt(ord.replace(/^R-0*/, ''), 10);
                if (isNaN(OReId)) continue;
                console.log(`[ENTREGADO MULTIPLE] ${ord} -> ${OReId}`);
                await marcarEntregado(transaction, OReId, new Date(fechaEntrega), UsuarioAlta);
            }

            await transaction.commit();

            // EMITIR EVENTO SOCKET.IO
            const io = req.app.get('socketio');
            if (io) io.emit('retiros:update');

            res.json({ success: true, message: 'Orden entregada. Estante liberado exitosamente.' });

        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }

    } catch (err) {
        console.error("Error al entregar:", err);
        res.status(500).json({ error: "Fallo en la entrega general", details: err.message });
    }
};

/**
 * ENTREGAR AL CLIENTE MULTIPLES SELECCIONES DE UN CASILLERO
 */
exports.marcarRetiroEntregadoMultiple = async (req, res) => {
    const { ubicacionId, ordenesParaEntregar } = req.body;

    if (!ubicacionId || !Array.isArray(ordenesParaEntregar) || ordenesParaEntregar.length === 0) {
        return res.status(400).json({ error: 'Faltan parámetros o no se seleccionó ninguna orden.' });
    }

    try {
        const pool = await getPool();
        const transaction = new sql.Transaction(pool);
        await transaction.begin();

        try {
            // 1. Liberar del Estante Físico SÓLO las especificadas
            const partsM = ubicacionId.split('-');
            const estIdM = partsM[0];
            const secM = parseInt(partsM[1], 10);
            const posM = parseInt(partsM[2], 10);

            for (const ord of ordenesParaEntregar) {
                await new sql.Request(transaction)
                    .input('estId', sql.Char, estIdM)
                    .input('sec', sql.Int, secM)
                    .input('pos', sql.Int, posM)
                    .input('Ord', sql.VarChar, ord)
                    .query('DELETE FROM OcupacionEstantes WHERE EstanteID = @estId AND Seccion = @sec AND Posicion = @pos AND OrdenRetiro = @Ord');
            }

            // 3. Marcar entregadas en DB directamente
            const fechaEntrega = moment().tz('America/Montevideo').format('YYYY-MM-DD HH:mm:ss');
            const UsuarioAlta = req.user?.id || 70;

            for (const ord of ordenesParaEntregar) {
                const OReId = parseInt(ord.replace(/^R-0*/, ''), 10);
                if (isNaN(OReId)) continue;
                console.log(`[ENTREGADO MULTIPLE SELECCIÓN] ${ord} -> ${OReId}`);
                await marcarEntregado(transaction, OReId, new Date(fechaEntrega), UsuarioAlta);
            }

            await transaction.commit();

            // EMITIR EVENTO SOCKET.IO
            const io = req.app.get('socketio');
            if (io) io.emit('retiros:update');

            res.json({ success: true, message: 'Órdenes seleccionadas entregadas exitosamente.' });

        } catch (innerErr) {
            await transaction.rollback();
            throw innerErr;
        }

    } catch (err) {
        console.error("Error al entregar selección múltiple:", err);
        res.status(500).json({ error: "Fallo en la entrega múltiple", details: err.message });
    }
};


/**
 * Traer Transacciones de Handy
 */
exports.getPagosOnline = async (req, res) => {
    try {
        const pool = await getPool();
        const { startDate, endDate, clientFilter, orderFilter } = req.query;

        let queryStr = `
            SELECT TOP (1000) 
                h.Id,
                h.TransactionId,
                h.PaymentUrl,
                h.TotalAmount,
                h.Currency,
                h.OrdersJson,
                h.CodCliente,
                h.Status,
                h.IssuerName,
                h.PaidAt,
                h.WebhookReceivedAt,
                h.CreatedAt,
                c.Nombre as NombreCliente
            FROM HandyTransactions h
            LEFT JOIN Clientes c ON CAST(h.CodCliente AS VARCHAR) = CAST(c.CodCliente AS VARCHAR)
            WHERE 1=1
        `;

        const request = pool.request();

        if (startDate) {
            queryStr += ` AND CAST(h.CreatedAt AS DATE) >= @StartDate`;
            request.input('StartDate', sql.Date, startDate);
        }

        if (endDate) {
            queryStr += ` AND CAST(h.CreatedAt AS DATE) <= @EndDate`;
            request.input('EndDate', sql.Date, endDate);
        }

        if (clientFilter) {
            queryStr += ` AND (c.Nombre LIKE '%' + @ClientFilter + '%' OR CAST(h.CodCliente AS VARCHAR) LIKE '%' + @ClientFilter + '%')`;
            request.input('ClientFilter', sql.NVarChar, clientFilter);
        }

        if (orderFilter) {
            let cleanFilter = orderFilter.trim();
            // Si el usuario busca "R-60174", limpiamos el "R-" para buscar "60174" dentro del JSON.
            let numFilter = cleanFilter.toUpperCase().startsWith('R-') ? cleanFilter.substring(2) : cleanFilter;

            queryStr += ` AND (h.OrdersJson LIKE '%' + @OrderFilter + '%' OR h.OrdersJson LIKE '%' + @NumFilter + '%' OR h.TransactionId LIKE '%' + @OrderFilter + '%')`;
            request.input('OrderFilter', sql.NVarChar, cleanFilter);
            request.input('NumFilter', sql.NVarChar, numFilter);
        }

        queryStr += ` ORDER BY h.CreatedAt DESC`;

        const result = await request.query(queryStr);
        res.json(result.recordset);
    } catch (err) {
        console.error("[PAGOS ONLINE] Error fetching Handy Transactions:", err);
        res.status(500).json({ error: "Fallo al traer pagos online", details: err.message });
    }
};


/**
 * Guardar retiro excepcional (con deuda) en la tabla local
 */
exports.marcarExcepcional = async (req, res) => {
    try {
        const { ordenRetiro, codigoCliente, monto, password, explicacion } = req.body;
        const usuarioId = req.user?.id || 70;

        if (!password || password.trim() === '') {
            return res.status(401).json({ error: "Contraseña requerida para autorizar este retiro." });
        }

        if (!explicacion || explicacion.trim() === '') {
            return res.status(400).json({ error: "Debe ingresar una justificación/explicación obligatoria." });
        }

        if (password !== process.env.CONTRAAUTORIZO) {
            return res.status(403).json({ error: "Contraseña incorrecta." });
        }

        const pool = await getPool();
        await pool.request()
            .input('orden', sql.VarChar, ordenRetiro)
            .input('cliente', sql.VarChar, codigoCliente)
<<<<<<< HEAD
            .input('monto', sql.Float, parseFloat(monto) || 0)
            .input('usr', sql.Int, usuarioId)
            .input('expl', sql.NVarChar, explicacion)
            .query(`INSERT INTO RetirosConDeuda (OrdenRetiro, CodigoCliente, Monto, UsuarioAutorizador, Explicacion, Estado, Gestionado)
                    VALUES (@orden, @cliente, @monto, @usr, @expl, 'Pendiente', 0)`);
=======
            .input('monto', sql.VarChar, String(monto))
            .input('usr', sql.VarChar, `${req.user?.nombre || 'Usuario'} (ID: ${req.user?.id || 0})`)
            .input('expl', sql.NVarChar, explicacion)
            .query(`INSERT INTO RetirosConDeuda (OrdenRetiro, CodigoCliente, Monto, UsuarioAutorizador, Explicacion) VALUES (@orden, @cliente, @monto, @usr, @expl)`);
>>>>>>> df4442e9b00356d953724662fc79be5416a11af2

        res.json({ message: "Retiro registrado como deuda y autorizado exitosamente." });
    } catch (err) {
        console.error("[EXCEPCIONAL] Error al guardar retiro excepcional:", err);
        res.status(500).json({ error: "Fallo al registrar retiro excepcional", details: err.message });
    }
};


/**
 * Obtener todos los retiros excepcionales con deuda
 */
exports.getExcepciones = async (req, res) => {
    try {
        const pool = await getPool();
        const result = await pool.request().query(`
            SELECT 
                e.Id, e.OrdenRetiro, e.CodigoCliente, 
                COALESCE(e.NombreCliente, c.Nombre) AS NombreCliente,
                e.Monto, e.UsuarioAutorizador, e.Explicacion,
                e.Estado, e.Gestionado, e.Fecha, e.FechaGestion,
                e.UsuarioGestion, e.NotaGestion,
                u.Nombre AS NombreAutorizador
            FROM RetirosConDeuda e
            LEFT JOIN Clientes c ON CAST(e.CodigoCliente AS VARCHAR) = CAST(c.CodigoReact AS VARCHAR)
            LEFT JOIN Usuarios u ON u.IdUsuario = e.UsuarioAutorizador
            ORDER BY e.Fecha DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        console.error("[EXCEPCIONES] Error al obtener excepciones de deuda:", err);
        res.status(500).json({ error: "Fallo al obtener retiros excepcionales", details: err.message });
    }
};


/**
 * Marcar una excepcion de deuda como gestionada/pagada
 */
exports.gestionarExcepcion = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado, nota } = req.body;  // estado: 'Pendiente' | 'Cobrado' | 'Condonado'
        const usuarioId = req.user?.id || 70;

        if (!['Pendiente', 'Cobrado', 'Condonado'].includes(estado)) {
            return res.status(400).json({ error: 'Estado inválido. Valores: Pendiente, Cobrado, Condonado' });
        }

        const pool = await getPool();
        await pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.VarChar, estado)
            .input('gestionado', sql.Bit, estado !== 'Pendiente' ? 1 : 0)
            .input('nota', sql.NVarChar, nota || null)
            .input('usr', sql.Int, usuarioId)
            .query(`
                UPDATE RetirosConDeuda 
                SET Estado = @estado,
                    Gestionado = @gestionado,
                    NotaGestion = @nota,
                    UsuarioGestion = @usr,
                    FechaGestion = CASE WHEN @estado <> 'Pendiente' THEN GETDATE() ELSE NULL END
                WHERE Id = @id
            `);

        res.json({ success: true, message: 'Estado actualizado correctamente.' });
    } catch (err) {
        console.error("[EXCEPCION GESTION] Error al actualizar estado:", err);
        res.status(500).json({ error: "Fallo al actualizar la excepción", details: err.message });
    }
};
