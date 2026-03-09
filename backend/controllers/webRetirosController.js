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
